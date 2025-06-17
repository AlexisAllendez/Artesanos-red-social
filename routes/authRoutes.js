const express = require('express');
const router = express.Router();
const { register, login, checkAuth } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middleware/validationMiddleware');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const { isAuthenticated, isNotAuthenticated } = require('../middleware/authMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');
const { db } = require('../config/db');

// Ruta para verificar el estado de autenticación
router.get('/api/auth/check', verifyToken, checkAuth);

// Rutas de autenticación
router.post('/api/auth/register', 
    isNotAuthenticated,
    upload.single('avatar'),
    handleMulterError,
    registerValidation,
    register
);

router.post('/api/auth/login',
    isNotAuthenticated,
    loginValidation,
    login
);

// Ruta para cerrar sesión
router.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
        res.json({
            success: true,
        message: 'Sesión cerrada exitosamente'
        });
});

module.exports = router; 