const Amistad = require('../models/Amistad');
const Album = require('../models/Album');
const Imagen = require('../models/Imagen');
const { db, pool } = require('../config/db');
const Usuario = require('../models/Usuario');
const Notification = require('../models/Notification');

class AmistadController {
    // Buscar usuarios
    static async buscarUsuarios(req, res) {
        try {
            const { termino } = req.query;
            const usuario_id = req.user.id;

            if (!termino) {
                return res.status(400).json({
                    success: false,
                    message: 'El término de búsqueda es requerido'
                });
            }

            const usuarios = await Amistad.buscarUsuarios(termino, usuario_id);

            res.json({
                success: true,
                data: usuarios.map(usuario => ({
                    ...usuario,
                    estado_amistad: usuario.estado_amistad || 'no_solicitud'
                }))
            });
        } catch (error) {
            console.error('Error en buscarUsuarios:', error);
            res.status(500).json({
                success: false,
                message: 'Error al buscar usuarios'
            });
        }
    }

    // Enviar solicitud de amistad
    static async enviarSolicitud(req, res) {
        try {
            const de_id = req.user.id;
            const { para_id } = req.body;

            if (!para_id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID del destinatario requerido',
                    code: 'MISSING_RECIPIENT'
                });
            }

            try {
                const solicitudId = await Amistad.enviarSolicitud(de_id, para_id);
                
                // Obtener información del usuario que envía la solicitud usando el modelo
                const usuario = await Usuario.buscarPorId(de_id);

                // Crear notificación en la base de datos
                await Notification.crearNotificacionSolicitudAmistad(de_id, para_id, solicitudId);

                // Emitir evento de nueva solicitud
                if (req.io) {
                    req.io.to(`user_${para_id}`).emit('nueva_solicitud', {
                        id: solicitudId,
                        de: {
                            id: de_id,
                            nombre: usuario.nombre,
                            apellido: usuario.apellido,
                            avatar: usuario.avatar
                        },
                        fecha: new Date()
                    });
                }

                res.status(201).json({ 
                    success: true,
                    message: 'Solicitud enviada correctamente',
                    data: { solicitudId }
                });
            } catch (error) {
                if (error.message.includes('esperar 30 días')) {
                    return res.status(429).json({ 
                        success: false,
                        error: error.message,
                        code: 'WAIT_PERIOD_REQUIRED'
                    });
                }
                if (error.message.includes('Ya existe una solicitud')) {
                    return res.status(400).json({ 
                        success: false,
                        error: error.message,
                        code: 'REQUEST_EXISTS'
                    });
                }
                throw error;
            }
        } catch (error) {
            console.error('Error al enviar solicitud:', error);
            res.status(500).json({ 
                success: false,
                error: 'Error al enviar solicitud de amistad'
            });
        }
    }

    // Aceptar solicitud de amistad
    static async aceptarSolicitud(req, res) {
        const { solicitud_id } = req.params;
        const usuario_id = req.user.id;

        if (!solicitud_id) {
            return res.status(400).json({
                success: false,
                error: 'ID de solicitud no proporcionado',
                code: 'MISSING_REQUEST_ID'
            });
        }

        let connection;
        try {
            // Verificar que la solicitud existe y está pendiente
            const solicitud = await Amistad.obtenerPorId(solicitud_id);
            if (!solicitud) {
                return res.status(404).json({
                    success: false,
                    error: 'Solicitud no encontrada',
                    code: 'REQUEST_NOT_FOUND'
                });
            }

            if (solicitud.estado !== 'pendiente') {
                return res.status(400).json({
                    success: false,
                    error: 'La solicitud ya no está pendiente',
                    code: 'REQUEST_NOT_PENDING'
                });
            }

            if (solicitud.para_id !== usuario_id) {
                return res.status(403).json({
                    success: false,
                    error: 'No tienes permiso para aceptar esta solicitud',
                    code: 'UNAUTHORIZED'
                });
            }

            // Iniciar transacción
            connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Aceptar la solicitud
                const aceptada = await Amistad.aceptarSolicitud(solicitud_id);
                if (!aceptada) {
                    throw new Error('Error al aceptar la solicitud');
                }

                // Crear álbum de amistad
                const albumId = await Album.crear({
                    usuario_id,
                    titulo: `Álbum compartido con ${solicitud.de_nombre} ${solicitud.de_apellido}`,
                    tipo: 'amistad'
                });

                // Compartir imágenes públicas
                const imagenesPublicas = await Imagen.obtenerImagenesPublicas(usuario_id);
                for (const imagen of imagenesPublicas) {
                    await Imagen.compartir(imagen.id, solicitud.de_id, albumId);
                }

                // Compartir imágenes públicas del otro usuario
                const imagenesPublicasAmigo = await Imagen.obtenerImagenesPublicas(solicitud.de_id);
                for (const imagen of imagenesPublicasAmigo) {
                    await Imagen.compartir(imagen.id, usuario_id, albumId);
                }

                // Crear notificación de amistad aceptada
                await Notification.crearNotificacionAmistadAceptada(solicitud.de_id, usuario_id);

                // Obtener datos del usuario que aceptó la solicitud
                const usuarioAceptante = await Usuario.buscarPorId(usuario_id);

                await connection.commit();

                // Emitir evento de solicitud aceptada
                if (req.io) {
                    req.io.to(`user_${solicitud.de_id}`).emit('amistad_aceptada', {
                        usuario_id: usuario_id,
                        nombre: usuarioAceptante.nombre,
                        apellido: usuarioAceptante.apellido,
                        avatar: usuarioAceptante.avatar,
                        fecha: new Date()
                    });
                }

                res.json({
                    success: true,
                    message: 'Solicitud aceptada y álbum creado correctamente',
                    data: {
                        albumId
                    }
                });
            } catch (error) {
                if (connection) {
                    await connection.rollback();
                }
                throw error;
            } finally {
                if (connection) {
                    connection.release();
                }
            }
        } catch (error) {
            console.error('Error al aceptar solicitud:', error);
            res.status(500).json({
                success: false,
                error: 'Error al aceptar solicitud de amistad'
            });
        }
    }

    // Rechazar solicitud de amistad
    static async rechazarSolicitud(req, res) {
        const { solicitud_id } = req.params;
        const usuario_id = req.user.id;

        if (!solicitud_id) {
            return res.status(400).json({
                success: false,
                error: 'ID de solicitud no proporcionado',
                code: 'MISSING_REQUEST_ID'
            });
        }

        try {
            // Verificar que la solicitud existe y está pendiente
            const solicitud = await Amistad.obtenerPorId(solicitud_id);
            if (!solicitud) {
                return res.status(404).json({
                    success: false,
                    error: 'Solicitud no encontrada',
                    code: 'REQUEST_NOT_FOUND'
                });
            }

            if (solicitud.estado !== 'pendiente') {
                return res.status(400).json({
                    success: false,
                    error: 'La solicitud ya no está pendiente',
                    code: 'REQUEST_NOT_PENDING'
                });
            }

            if (solicitud.para_id !== usuario_id) {
                return res.status(403).json({
                    success: false,
                    error: 'No tienes permiso para rechazar esta solicitud',
                    code: 'UNAUTHORIZED'
                });
            }

            // Rechazar la solicitud
            const rechazada = await Amistad.rechazarSolicitud(solicitud_id);
            if (!rechazada) {
                return res.status(500).json({
                    success: false,
                    error: 'Error al rechazar la solicitud',
                    code: 'REJECTION_FAILED'
                });
            }

            res.json({
                success: true,
                message: 'Solicitud rechazada correctamente'
            });
        } catch (error) {
            console.error('Error al rechazar solicitud:', error);
            res.status(500).json({
                success: false,
                error: 'Error al rechazar la solicitud de amistad'
            });
        }
    }

    // Obtener solicitudes pendientes
    static async obtenerSolicitudesPendientes(req, res) {
        try {
            const usuario_id = req.user.id;
            const solicitudes = await Amistad.obtenerSolicitudesPendientes(usuario_id);
            
            res.json({
                success: true,
                data: solicitudes
            });
        } catch (error) {
            console.error('Error al obtener solicitudes pendientes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener solicitudes pendientes'
            });
        }
    }

    // Obtener amigos
    static async obtenerAmigos(req, res) {
        try {
            const usuario_id = req.user.id;
            const amigos = await Amistad.obtenerAmigos(usuario_id);
            
            res.json({
                success: true,
                data: amigos
            });
        } catch (error) {
            console.error('Error al obtener amigos:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener amigos'
            });
        }
    }
}

// Funciones adicionales para las rutas de API
const getPendingRequests = async (req, res) => {
    try {
        const usuario_id = req.user.id;
        const solicitudes = await Amistad.obtenerSolicitudesPendientes(usuario_id);
        
        res.json({
            success: true,
            requests: solicitudes
        });
    } catch (error) {
        console.error('Error al obtener solicitudes pendientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener solicitudes pendientes'
        });
    }
};

const acceptRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const usuario_id = req.user.id;

        // Obtener la solicitud por ID
        const solicitud = await Amistad.obtenerPorId(requestId);

        if (!solicitud) {
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }

        // Verificar que el usuario actual es quien debe recibir la solicitud
        if (solicitud.para_id !== usuario_id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para aceptar esta solicitud'
            });
        }

        // Verificar que la solicitud esté pendiente
        if (solicitud.estado !== 'pendiente') {
            return res.status(400).json({
                success: false,
                message: 'La solicitud no está pendiente'
            });
        }

        // Aceptar la solicitud usando el método del modelo
        const aceptada = await Amistad.aceptarSolicitud(requestId);
        
        if (!aceptada) {
            return res.status(500).json({
                success: false,
                message: 'Error al aceptar la solicitud'
            });
        }

        // Crear notificación de amistad aceptada
        await Notification.crearNotificacionAmistadAceptada(solicitud.de_id, usuario_id);

        // Obtener datos del usuario que aceptó la solicitud
        const usuarioAceptante = await Usuario.buscarPorId(usuario_id);

        // Emitir evento de solicitud aceptada
        if (req.io) {
            req.io.to(`user_${solicitud.de_id}`).emit('amistad_aceptada', {
                usuario_id: usuario_id,
                nombre: usuarioAceptante.nombre,
                apellido: usuarioAceptante.apellido,
                avatar: usuarioAceptante.avatar,
                fecha: new Date()
            });
        }

        res.json({
            success: true,
            message: 'Solicitud aceptada correctamente'
        });
    } catch (error) {
        console.error('Error al aceptar solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error al aceptar la solicitud'
        });
    }
};

const rejectRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const usuario_id = req.user.id;

        // Obtener la solicitud por ID
        const solicitud = await Amistad.obtenerPorId(requestId);

        if (!solicitud) {
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }

        // Verificar que el usuario actual es quien debe recibir la solicitud
        if (solicitud.para_id !== usuario_id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para rechazar esta solicitud'
            });
        }

        // Verificar que la solicitud esté pendiente
        if (solicitud.estado !== 'pendiente') {
            return res.status(400).json({
                success: false,
                message: 'La solicitud no está pendiente'
            });
        }

        // Rechazar la solicitud usando el método del modelo
        const rechazada = await Amistad.rechazarSolicitud(requestId);
        
        if (!rechazada) {
            return res.status(500).json({
                success: false,
                message: 'Error al rechazar la solicitud'
            });
        }

        res.json({
            success: true,
            message: 'Solicitud rechazada correctamente'
        });
    } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error al rechazar la solicitud'
        });
    }
};

module.exports = {
    // Funciones estáticas de la clase
    buscarUsuarios: AmistadController.buscarUsuarios,
    enviarSolicitud: AmistadController.enviarSolicitud,
    aceptarSolicitud: AmistadController.aceptarSolicitud,
    rechazarSolicitud: AmistadController.rechazarSolicitud,
    obtenerSolicitudesPendientes: AmistadController.obtenerSolicitudesPendientes,
    obtenerAmigos: AmistadController.obtenerAmigos,
    
    // Funciones adicionales para las rutas de API
    getPendingRequests,
    acceptRequest,
    rejectRequest
}; 