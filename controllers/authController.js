const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { db } = require('../config/db');

// Controlador para verificar el estado de autenticación
const checkAuth = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, nombre, apellido, email, avatar, estado FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        if (!users.length || users[0].estado !== 'activo') {
            res.clearCookie('token');
            return res.status(401).json({
                success: false,
                authenticated: false,
                message: 'Usuario no encontrado o inactivo'
            });
        }

        // No enviar información sensible
        const { password, estado, ...userInfo } = users[0];
        
        res.json({
            success: true,
            authenticated: true,
            user: userInfo
        });
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        res.status(500).json({
            success: false,
            authenticated: false,
            message: 'Error al verificar autenticación'
        });
    }
};

// Controlador para el login de usuarios
const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = {};
            errors.array().forEach(error => {
                errorMessages[error.path] = error.msg;
            });
            
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: errorMessages
            });
        }

        const { email, password } = req.body;

        const [users] = await db.query(
            'SELECT id, email, password, nombre, apellido, avatar, estado FROM usuarios WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const user = users[0];

        if (user.estado === 'inactivo') {
            return res.status(403).json({
                success: false,
                message: 'Cuenta inactiva. Por favor, contacte al administrador.'
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email
            },
            process.env.JWT_SECRET || 'tu_clave_secreta_por_defecto',
            { expiresIn: '24h' }
        );

        // Configurar la cookie con opciones seguras
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 horas
            path: '/'
        });

        // No enviar información sensible
        const { password: _, estado, ...userInfo } = user;

        res.json({
            success: true,
            message: 'Login exitoso',
            user: userInfo
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión'
        });
    }
};

// Controlador para el registro de usuarios
const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Error de validación',
                errors: errors.array().map(error => error.msg)
            });
        }

        const { email, password, nombre, apellido } = req.body;
        const avatar = req.file ? `/uploads/avatars/${req.file.filename}` : null;

        // Verificar si el email ya está registrado
        const [existingUsers] = await db.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear el usuario
        const [result] = await db.query(
            'INSERT INTO usuarios (email, password, nombre, apellido, avatar, estado) VALUES (?, ?, ?, ?, ?, ?)',
            [email, hashedPassword, nombre, apellido, avatar, 'activo']
        );

        // Generar token
        const token = jwt.sign(
            { 
                userId: result.insertId,
                email: email
            },
            process.env.JWT_SECRET || 'tu_clave_secreta_por_defecto',
            { expiresIn: '24h' }
        );

        // Configurar la cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user: {
                id: result.insertId,
                email,
                nombre,
                apellido,
                avatar
            }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar usuario'
        });
    }
};

module.exports = {
    login,
    register,
    checkAuth
}; 