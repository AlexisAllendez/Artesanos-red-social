const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

// Middleware para verificar el token JWT
const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Acceso denegado. Token no proporcionado.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_por_defecto');
        const [users] = await db.query(
            'SELECT id, email, estado FROM usuarios WHERE id = ?',
            [decoded.userId]
        );

        if (!users.length) {
            res.clearCookie('token');
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
        }

        if (users[0].estado === 'inactivo') {
            res.clearCookie('token');
            return res.status(403).json({
                success: false,
                message: 'Cuenta inactiva. Por favor, contacte al administrador.'
            });
        }

        req.user = {
            id: users[0].id,
            email: users[0].email
        };
        
        next();
    } catch (error) {
        res.clearCookie('token');
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado. Por favor, inicie sesión nuevamente.'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido.'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Error al verificar la autenticación.'
        });
    }
};

// Middleware para verificar si el usuario NO está autenticado (para páginas de login/registro)
const isNotAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        
        if (!token) {
            return next();
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_por_defecto');
            const [users] = await db.query(
                'SELECT id, estado FROM usuarios WHERE id = ?',
                [decoded.userId]
            );

            if (users.length && users[0].estado === 'activo') {
                return res.redirect('/feed');
            }
        } catch (error) {
            // Si hay error en el token, limpiar la cookie y continuar
            res.clearCookie('token');
        }
        
        next();
    } catch (error) {
        console.error('Error en middleware isNotAuthenticated:', error);
        res.clearCookie('token');
        next();
    }
};

// Middleware para verificar si el usuario está autenticado (para rutas protegidas)
const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        
        if (!token) {
            // Si es una petición AJAX o API, devolver error 401
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(401).json({
                    success: false,
                    authenticated: false,
                    message: 'No autorizado'
                });
            }
            // Si es una petición normal, redirigir a login
            res.clearCookie('token');
            return res.redirect('/login');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_por_defecto');
            const [users] = await db.query(
                'SELECT id, estado FROM usuarios WHERE id = ?',
                [decoded.userId]
            );

            if (!users.length || users[0].estado !== 'activo') {
                res.clearCookie('token');
                if (req.xhr || req.headers.accept?.includes('application/json')) {
                    return res.status(401).json({
                        success: false,
                        authenticated: false,
                        message: 'No autorizado'
                    });
                }
                return res.redirect('/login');
            }

            req.user = {
                id: decoded.userId
            };
            
            next();
        } catch (jwtError) {
            // Si hay error en el token, limpiar la cookie y redirigir
            res.clearCookie('token');
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(401).json({
                    success: false,
                    authenticated: false,
                    message: 'Token inválido o expirado'
                });
            }
            return res.redirect('/login');
        }
    } catch (error) {
        console.error('Error en middleware de autenticación:', error);
        res.clearCookie('token');
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({
                success: false,
                authenticated: false,
                message: 'Error de autenticación'
            });
        }
        return res.redirect('/login');
    }
};

// Middleware para verificar si el usuario es el propietario del recurso
const isOwner = async (req, res, next) => {
    try {
        const resourceId = req.params.id;
        const userId = req.user.id;

        // Verificar si el usuario es el propietario del recurso
        const [resource] = await db.query(
            'SELECT usuario_id FROM recursos WHERE id = ?',
            [resourceId]
        );

        if (!resource.length) {
            return res.status(404).json({
                success: false,
                message: 'Recurso no encontrado.'
            });
        }

        if (resource[0].usuario_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para realizar esta acción.'
            });
        }

        next();
    } catch (error) {
        console.error('Error al verificar permisos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar permisos.'
        });
    }
};

module.exports = {
    verifyToken,
    isAuthenticated,
    isNotAuthenticated,
    isOwner
}; 