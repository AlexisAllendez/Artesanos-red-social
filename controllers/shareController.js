const { pool } = require('../config/db');
const Imagen = require('../models/Imagen');
const Album = require('../models/Album');
const Usuario = require('../models/Usuario');
const Notification = require('../models/Notification');

// Compartir imagen con otro usuario
const shareImage = async (req, res) => {
    try {
        const { imageId } = req.params;
        const { targetUserId } = req.body;
        const userId = req.user.id;
        
        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'ID del usuario destinatario es requerido'
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
        
        const album = await Album.obtenerPorId(image.album_id);
        if (!album || album.usuario_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para compartir esta imagen'
            });
        }
        
        // Verificar que el usuario destinatario existe
        const targetUser = await Usuario.buscarPorId(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuario destinatario no encontrado'
            });
        }
        
        // Verificar que el usuario destinatario es amigo
        const [friendship] = await pool.query(
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
            // Crear nuevo álbum compartido con título único
            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const newAlbumData = {
                usuario_id: targetUserId,
                titulo: `Álbum compartido con ${req.user.nombre} ${req.user.apellido} - ${timestamp}`,
                tipo: 'compartido'
            };
            albumId = await Album.crear(newAlbumData);
        }
        
        // Compartir la imagen usando el modelo
        await Imagen.compartir(imageId, targetUserId, albumId);
        
        // Crear notificación de contenido compartido
        await Notification.crearNotificacionCompartido(targetUserId, userId, 'una imagen', imageId);
        
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
};

// Obtener imágenes compartidas con el usuario
const getSharedImages = async (req, res) => {
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
};

// Compartir álbum completo
const shareAlbum = async (req, res) => {
    try {
        const { albumId } = req.params;
        const { targetUserId } = req.body;
        const userId = req.user.id;
        
        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'ID del usuario destinatario es requerido'
            });
        }
        
        // Verificar que el álbum existe y pertenece al usuario
        const album = await Album.obtenerPorId(albumId);
        if (!album || album.usuario_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para compartir este álbum'
            });
        }
        
        // Verificar que el usuario destinatario existe
        const targetUser = await Usuario.buscarPorId(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuario destinatario no encontrado'
            });
        }
        
        // Verificar que el usuario destinatario es amigo
        const [friendship] = await pool.query(
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
        
        // Obtener todas las imágenes del álbum
        const images = await Imagen.obtenerPorAlbum(albumId);
        if (images.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El álbum no contiene imágenes para compartir'
            });
        }
        
        // Crear álbum compartido si no existe
        const existingAlbum = await Album.buscarPorTipoYUsuario(targetUserId, 'compartido', `${req.user.nombre} ${req.user.apellido}`);
        
        let newAlbumId;
        if (existingAlbum) {
            newAlbumId = existingAlbum.id;
        } else {
            // Crear nuevo álbum compartido con título único
            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const newAlbumData = {
                usuario_id: targetUserId,
                titulo: `Álbum compartido: ${album.titulo} - ${req.user.nombre} ${req.user.apellido} - ${timestamp}`,
                tipo: 'compartido'
            };
            newAlbumId = await Album.crear(newAlbumData);
        }
        
        // Compartir todas las imágenes del álbum
        for (const image of images) {
            await Imagen.compartir(image.id, targetUserId, newAlbumId);
        }
        
        // Crear notificación de contenido compartido
        await Notification.crearNotificacionCompartido(targetUserId, userId, 'un álbum', albumId);
        
        // Enviar notificación en tiempo real
        const notificationData = {
            usuario_id: userId,
            nombre: req.user.nombre,
            apellido: req.user.apellido,
            avatar: req.user.avatar,
            album_titulo: album.titulo,
            fecha: new Date()
        };
        
        req.io.to(`user_${targetUserId}`).emit('album_compartido', notificationData);
        
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
};

module.exports = {
    shareImage,
    getSharedImages,
    shareAlbum
}; 