const { pool } = require('../config/db');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const Album = require('../models/Album');

// Obtener álbumes del usuario
const getAlbums = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Usar el modelo Album para obtener álbumes
        const albums = await Album.obtenerPorUsuario(userId);
        
        res.json(albums);
    } catch (error) {
        console.error('Error al obtener álbumes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener álbumes'
        });
    }
};

// Crear nuevo álbum
const createAlbum = async (req, res) => {
    try {
        const userId = req.user.id;
        const { titulo, tipo = 'normal' } = req.body;
        
        if (!titulo) {
            return res.status(400).json({
                success: false,
                message: 'El título del álbum es requerido'
            });
        }
        
        // Usar el modelo Album para crear
        const albumData = {
            usuario_id: userId,
            titulo,
            tipo
        };
        
        const albumId = await Album.crear(albumData);
        
        // Obtener el álbum creado
        const album = await Album.obtenerPorId(albumId);
        
        res.status(201).json({
            success: true,
            message: 'Álbum creado exitosamente',
            album: album
        });
    } catch (error) {
        console.error('Error al crear álbum:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear álbum'
        });
    }
};

// Obtener álbum por ID
const getAlbumById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const album = await Album.obtenerPorId(id);
        
        if (!album || album.usuario_id !== userId) {
            return res.status(404).json({
                success: false,
                message: 'Álbum no encontrado'
            });
        }
        
        res.json({
            success: true,
            album: album
        });
    } catch (error) {
        console.error('Error al obtener álbum:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener álbum'
        });
    }
};

// Actualizar álbum
const updateAlbum = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { titulo, tipo } = req.body;
        
        // Verificar que el álbum pertenece al usuario
        const puedeEditar = await Album.verificarPropiedad(id, userId);
        if (!puedeEditar) {
            return res.status(404).json({
                success: false,
                message: 'Álbum no encontrado'
            });
        }
        
        // Actualizar álbum usando el modelo
        const albumData = { titulo, tipo };
        await Album.actualizar(id, albumData);
        
        res.json({
            success: true,
            message: 'Álbum actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar álbum:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar álbum'
        });
    }
};

// Eliminar álbum
const deleteAlbum = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        // Verificar que el álbum pertenece al usuario
        const puedeEliminar = await Album.verificarPropiedad(id, userId);
        if (!puedeEliminar) {
            return res.status(404).json({
                success: false,
                message: 'Álbum no encontrado'
            });
        }
        
        // Eliminar álbum usando el modelo
        await Album.eliminar(id);
        
        res.json({
            success: true,
            message: 'Álbum eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar álbum:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar álbum'
        });
    }
};

module.exports = {
    getAlbums,
    createAlbum,
    getAlbumById,
    updateAlbum,
    deleteAlbum
}; 