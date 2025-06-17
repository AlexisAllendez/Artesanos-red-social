const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const { db } = require('../config/db');
const Usuario = require('../models/Usuario');
const Imagen = require('../models/Imagen');
const Album = require('../models/Album');

// Compartir imagen individual (ruta que espera el frontend)
router.post('/api/share/image/:imageId', isAuthenticated, async (req, res) => {
    try {
        const { imageId } = req.params;
        const { targetUserId } = req.body;
        const userId = req.user.id;
        
        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'ID del usuario destino es requerido'
            });
        }
        
        // Verificar que la imagen existe y pertenece al usuario
        const image = await Imagen.obtenerPorId(imageId);
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Imagen no encontrada'
            });
        }
        
        // Verificar que el usuario es propietario de la imagen
        const album = await Album.obtenerPorId(image.album_id);
        if (!album || album.usuario_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para compartir esta imagen'
            });
        }
        
        // Verificar que el usuario destino existe
        const targetUser = await Usuario.buscarPorId(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuario destino no encontrado'
            });
        }
        
        // Verificar que no se está compartiendo consigo mismo
        if (userId === targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'No puedes compartir contigo mismo'
            });
        }
        
        // Verificar que el usuario destino es amigo
        const [friendship] = await db.query(
            `SELECT * FROM amistades 
            WHERE ((de_id = ? AND para_id = ?) OR (de_id = ? AND para_id = ?))
            AND estado = 'aceptada'`,
            [userId, targetUserId, targetUserId, userId]
        );
        
        if (friendship.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Solo puedes compartir con tus amigos'
            });
        }
        
        // Verificar si ya está compartida
        const alreadyShared = await Imagen.verificarCompartida(imageId, targetUserId);
        if (alreadyShared) {
            return res.status(400).json({
                success: false,
                message: 'La imagen ya está compartida con este usuario'
            });
        }
        
        // Crear álbum compartido si no existe
        const existingAlbum = await Album.buscarPorTipoYUsuario(targetUserId, 'compartido', `${req.user.nombre} ${req.user.apellido}`);
        
        let albumId;
        if (existingAlbum) {
            albumId = existingAlbum.id;
        } else {
            // Crear nuevo álbum compartido
            const newAlbumData = {
                usuario_id: targetUserId,
                titulo: `Álbum compartido con ${req.user.nombre} ${req.user.apellido}`,
                tipo: 'compartido'
            };
            albumId = await Album.crear(newAlbumData);
        }
        
        // Compartir la imagen usando el modelo
        await Imagen.compartir(imageId, targetUserId, albumId);
        
        // Enviar notificación en tiempo real
        const notificationData = {
            usuario_id: userId,
            nombre: req.user.nombre,
            apellido: req.user.apellido,
            avatar: req.user.avatar,
            imagen_titulo: image.titulo,
            fecha: new Date()
        };
        
        req.io.to(`user_${targetUserId}`).emit('imagen_compartida', notificationData);
        
        res.json({
            success: true,
            message: 'Imagen compartida exitosamente'
        });
    } catch (error) {
        console.error('Error al compartir imagen:', error);
        res.status(500).json({
            success: false,
            message: 'Error al compartir imagen'
        });
    }
});

// Compartir álbum completo (ruta que espera el frontend)
router.post('/api/share/album/:albumId', isAuthenticated, async (req, res) => {
    try {
        const { albumId } = req.params;
        const { targetUserId } = req.body;
        const usuario_id = req.user.id;

        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'ID del usuario destino es requerido'
            });
        }

        // Verificar que el álbum existe y pertenece al usuario
        const album = await Album.obtenerPorId(albumId);
        if (!album || album.usuario_id !== usuario_id) {
            return res.status(404).json({
                success: false,
                message: 'Álbum no encontrado'
            });
        }

        // Verificar que el usuario destino existe
        const targetUser = await Usuario.buscarPorId(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuario destino no encontrado'
            });
        }

        // Verificar que no se está compartiendo consigo mismo
        if (usuario_id === targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'No puedes compartir contigo mismo'
            });
        }

        // Verificar que el usuario destino es amigo
        const [friendship] = await db.query(
            `SELECT * FROM amistades 
            WHERE ((de_id = ? AND para_id = ?) OR (de_id = ? AND para_id = ?))
            AND estado = 'aceptada'`,
            [usuario_id, targetUserId, targetUserId, usuario_id]
        );
        
        if (friendship.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Solo puedes compartir con tus amigos'
            });
        }

        // Obtener todas las imágenes del álbum
        const images = await Imagen.obtenerPorAlbum(albumId);
        
        if (images.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El álbum no tiene imágenes para compartir'
            });
        }

        // Crear álbum compartido
        const newAlbumData = {
            usuario_id: targetUserId,
            titulo: `Álbum compartido: ${album.titulo} - ${req.user.nombre} ${req.user.apellido}`,
            tipo: 'compartido'
        };
        
        const newAlbumId = await Album.crear(newAlbumData);

        // Compartir todas las imágenes del álbum
        for (const image of images) {
            await Imagen.compartir(image.id, targetUserId, newAlbumId);
        }

        res.json({
            success: true,
            message: 'Álbum compartido exitosamente'
        });
    } catch (error) {
        console.error('Error al compartir álbum:', error);
        res.status(500).json({
            success: false,
            message: 'Error al compartir álbum'
        });
    }
});

// Obtener lista de usuarios para compartir (solo amigos)
router.get('/api/users', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Obtener solo amigos del usuario actual
        const [friends] = await db.query(
            `SELECT DISTINCT u.id, u.nombre, u.apellido, u.avatar, u.tipo_artesania 
            FROM usuarios u
            INNER JOIN amistades a ON (
                (a.de_id = ? AND a.para_id = u.id) OR 
                (a.de_id = u.id AND a.para_id = ?)
            )
            WHERE a.estado = 'aceptada' 
            AND u.id != ? 
            AND u.estado = 'activo'
            ORDER BY u.nombre, u.apellido`,
            [userId, userId, userId]
        );
        
        res.json({
            success: true,
            users: friends
        });
    } catch (error) {
        console.error('Error al obtener amigos para compartir:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la lista de amigos'
        });
    }
});

// Obtener imágenes compartidas con el usuario
router.get('/api/share/shared', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Usar el modelo Imagen para obtener imágenes compartidas
        const images = await Imagen.obtenerCompartidas(userId);
        
        res.json({
            success: true,
            images: images
        });
    } catch (error) {
        console.error('Error al obtener imágenes compartidas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener imágenes compartidas'
        });
    }
});

module.exports = router; 