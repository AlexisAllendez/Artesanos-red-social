const express = require('express');
const router = express.Router();
const AmistadController = require('../controllers/amistadController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// Buscar usuarios
router.get('/buscar', AmistadController.buscarUsuarios);

// Enviar solicitud de amistad
router.post('/solicitud', AmistadController.enviarSolicitud);

// Aceptar solicitud de amistad
router.post('/solicitud/:solicitud_id/aceptar', AmistadController.aceptarSolicitud);

// Rechazar solicitud de amistad
router.post('/solicitud/:solicitud_id/rechazar', AmistadController.rechazarSolicitud);

// Obtener solicitudes pendientes
router.get('/solicitudes-pendientes', AmistadController.obtenerSolicitudesPendientes);

// Obtener amigos
router.get('/amigos', AmistadController.obtenerAmigos);

module.exports = router; 