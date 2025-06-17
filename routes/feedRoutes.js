const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const { showFeed, getPosts, createPost } = require('../controllers/feedController');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const Album = require('../models/Album');
const db = require('../config/db');

// Ruta para mostrar la página del feed
router.get('/', isAuthenticated, showFeed);

// Obtener posts del feed
router.get('/posts', isAuthenticated, getPosts);

// Crear nuevo post
router.post('/posts', isAuthenticated, upload.single('imagen'), handleMulterError, createPost);

// Obtener contador de imágenes de un álbum
router.get('/albums/:id/count', isAuthenticated, async (req, res) => {
    try {
        const albumId = req.params.id;
        const userId = req.user.id;

        // Verificar que el álbum pertenece al usuario
        const album = await Album.obtenerPorId(albumId);
        if (!album || album.usuario_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para acceder a este álbum'
            });
        }

        // Obtener el conteo de imágenes
        const query = 'SELECT COUNT(*) as count FROM imagenes WHERE album_id = ?';
        const [rows] = await db.query(query, [albumId]);

        res.json({
            success: true,
            count: rows[0].count
        });
    } catch (error) {
        console.error('Error al obtener contador de álbum:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el contador de imágenes'
        });
    }
});

module.exports = router; 