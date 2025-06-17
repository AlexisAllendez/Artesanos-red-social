const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const Album = require('../models/Album');
const Imagen = require('../models/Imagen');

// Crear un nuevo álbum
router.post('/', isAuthenticated, async (req, res) => {
    try {
        console.log('Datos recibidos:', req.body);
        console.log('Usuario autenticado:', req.user);

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Usuario no autenticado'
            });
        }

        const { titulo, tipo = 'normal' } = req.body;
        
        if (!titulo) {
            return res.status(400).json({
                success: false,
                error: 'El título del álbum es requerido'
            });
        }

        const usuario_id = req.user.id;
        console.log('Intentando crear álbum:', { usuario_id, titulo, tipo });

        const albumId = await Album.crear({
            usuario_id,
            titulo,
            tipo
        });

        console.log('Álbum creado con ID:', albumId);

        res.status(201).json({
            success: true,
            message: 'Álbum creado exitosamente',
            data: { albumId }
        });
    } catch (error) {
        console.error('Error detallado al crear álbum:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al crear el álbum'
        });
    }
});

// Obtener todos los álbumes del usuario
router.get('/', isAuthenticated, async (req, res) => {
    try {
        console.log('Obteniendo álbumes para usuario:', req.user);
        const usuario_id = req.user.id;
        const albumes = await Album.obtenerPorUsuario(usuario_id);
        console.log('Álbumes encontrados:', albumes);
        res.json(albumes);
    } catch (error) {
        console.error('Error al obtener álbumes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener un álbum específico
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const album = await Album.obtenerPorId(req.params.id);
        if (!album) {
            return res.status(404).json({
                success: false,
                error: 'Álbum no encontrado'
            });
        }

        // Verificar si el usuario tiene acceso al álbum
        const tieneAcceso = album.usuario_id === req.user.id || 
                          await Album.verificarCompartido(req.params.id, req.user.id);
        
        if (!tieneAcceso) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permiso para ver este álbum'
            });
        }

        const imagenes = await Imagen.obtenerPorAlbum(req.params.id);
        res.json({
            success: true,
            data: {
                ...album,
                imagenes
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Actualizar un álbum
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const { titulo } = req.body;
        const album_id = req.params.id;
        const usuario_id = req.user.id;

        // Verificar propiedad del álbum
        const esPropietario = await Album.verificarPropiedad(album_id, usuario_id);
        if (!esPropietario) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permiso para modificar este álbum'
            });
        }

        const actualizado = await Album.actualizar(album_id, { titulo });
        if (!actualizado) {
            return res.status(404).json({
                success: false,
                error: 'Álbum no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Álbum actualizado exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Eliminar un álbum
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const album_id = req.params.id;
        const usuario_id = req.user.id;

        // Verificar propiedad del álbum
        const esPropietario = await Album.verificarPropiedad(album_id, usuario_id);
        if (!esPropietario) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permiso para eliminar este álbum'
            });
        }

        const eliminado = await Album.eliminar(album_id);
        if (!eliminado) {
            return res.status(404).json({
                success: false,
                error: 'Álbum no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Álbum eliminado exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Subir imagen a un álbum
router.post('/:id/imagenes', isAuthenticated, upload.single('imagen'), handleMulterError, async (req, res) => {
    try {
        const album_id = req.params.id;
        const usuario_id = req.user.id;

        // Verificar propiedad del álbum
        const esPropietario = await Album.verificarPropiedad(album_id, usuario_id);
        if (!esPropietario) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permiso para subir imágenes a este álbum'
            });
        }

        // Verificar espacio en el álbum
        const tieneEspacio = await Album.verificarEspacio(album_id);
        if (!tieneEspacio) {
            return res.status(400).json({
                success: false,
                error: 'El álbum ha alcanzado el límite de 20 imágenes'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se ha proporcionado ninguna imagen'
            });
        }

        const { titulo, descripcion, es_publica } = req.body;
        const archivo = `/uploads/albumes/${req.file.filename}`;

        const imagenId = await Imagen.crear({
            album_id,
            titulo,
            descripcion,
            archivo,
            es_publica: es_publica === 'true'
        });

        res.status(201).json({
            success: true,
            message: 'Imagen subida exitosamente',
            data: { imagenId }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router; 