const path = require('path');
const { db } = require('../config/db');
const Imagen = require('../models/Imagen');
const Album = require('../models/Album');
const Usuario = require('../models/Usuario');
const Comment = require('../models/Comment');

// Controlador para mostrar la página del feed
const showFeed = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'feed', 'index.html'));
};

// Controlador para obtener las imágenes del feed (alias para getPosts)
const getFeed = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Obtener álbumes del usuario usando el modelo
        const albums = await Album.obtenerPorUsuario(userId);
        
        // Obtener imágenes: propias, de amigos y compartidas
        const query = `
            SELECT DISTINCT
                i.*,
                a.titulo as album_titulo,
                a.usuario_id,
                u.nombre,
                u.apellido,
                u.avatar,
                COUNT(DISTINCT c.id) as comments_count,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM compartidos comp 
                        WHERE comp.imagen_id = i.id AND comp.compartido_con = ?
                    ) THEN 1
                    ELSE 0
                END as es_compartida
            FROM imagenes i
            JOIN albumes a ON i.album_id = a.id
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN comentarios c ON i.id = c.imagen_id
            WHERE (
                -- Imágenes propias del usuario
                a.usuario_id = ? 
                OR 
                -- Imágenes de amigos (donde hay amistad aceptada)
                EXISTS (
                    SELECT 1 FROM amistades am 
                    WHERE ((am.de_id = ? AND am.para_id = a.usuario_id) OR (am.de_id = a.usuario_id AND am.para_id = ?))
                    AND am.estado = 'aceptada'
                )
                OR
                -- Imágenes compartidas con el usuario
                EXISTS (
                    SELECT 1 FROM compartidos comp 
                    WHERE comp.imagen_id = i.id AND comp.compartido_con = ?
                )
            )
            GROUP BY i.id, i.album_id, i.titulo, i.descripcion, i.archivo, i.es_publica, i.fecha_subida, a.titulo, a.usuario_id, u.nombre, u.apellido, u.avatar
            ORDER BY i.fecha_subida DESC
        `;

        const [images] = await db.query(query, [userId, userId, userId, userId, userId]);

        // Obtener comentarios para cada imagen
        for (let image of images) {
            const comments = await Comment.getByImageId(image.id);
            image.comments = comments;
            // Agregar propiedad compartido para compatibilidad con el frontend
            image.compartido = image.es_compartida === 1;
        }

        res.json({
            success: true,
            posts: images,
            albums: albums
        });
    } catch (error) {
        console.error('Error al obtener imágenes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las imágenes'
        });
    }
};

// Controlador para obtener las imágenes del feed (mantener compatibilidad)
const getPosts = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Obtener imágenes: propias, de amigos y compartidas
        const query = `
            SELECT DISTINCT
                i.*,
                a.titulo as album_titulo,
                a.usuario_id,
                u.nombre,
                u.apellido,
                u.avatar,
                COUNT(DISTINCT c.id) as comments_count,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM compartidos comp 
                        WHERE comp.imagen_id = i.id AND comp.compartido_con = ?
                    ) THEN 1
                    ELSE 0
                END as es_compartida
            FROM imagenes i
            JOIN albumes a ON i.album_id = a.id
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN comentarios c ON i.id = c.imagen_id
            WHERE (
                -- Imágenes propias del usuario
                a.usuario_id = ? 
                OR 
                -- Imágenes de amigos (donde hay amistad aceptada)
                EXISTS (
                    SELECT 1 FROM amistades am 
                    WHERE ((am.de_id = ? AND am.para_id = a.usuario_id) OR (am.de_id = a.usuario_id AND am.para_id = ?))
                    AND am.estado = 'aceptada'
                )
                OR
                -- Imágenes compartidas con el usuario
                EXISTS (
                    SELECT 1 FROM compartidos comp 
                    WHERE comp.imagen_id = i.id AND comp.compartido_con = ?
                )
            )
            GROUP BY i.id, i.album_id, i.titulo, i.descripcion, i.archivo, i.es_publica, i.fecha_subida, a.titulo, a.usuario_id, u.nombre, u.apellido, u.avatar
            ORDER BY i.fecha_subida DESC
        `;

        const [images] = await db.query(query, [userId, userId, userId, userId, userId]);

        // Obtener comentarios para cada imagen
        for (let image of images) {
            const [comments] = await db.query(`
                SELECT 
                    c.*,
                    u.nombre,
                    u.apellido,
                    u.avatar
                FROM comentarios c
                JOIN usuarios u ON c.autor_id = u.id
                WHERE c.imagen_id = ?
                ORDER BY c.fecha ASC
            `, [image.id]);

            image.comments = comments;
            // Agregar propiedad compartido para compatibilidad con el frontend
            image.compartido = image.es_compartida === 1;
        }

        res.json(images);
    } catch (error) {
        console.error('Error al obtener imágenes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las imágenes'
        });
    }
};

// Controlador para crear una nueva imagen
const createPost = async (req, res) => {
    try {
        const { album_id, titulo, descripcion } = req.body;
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere una imagen'
            });
        }

        // Verificar que el álbum pertenece al usuario usando el modelo
        const album = await Album.obtenerPorId(album_id);
        
        if (!album || album.usuario_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para agregar imágenes a este álbum'
            });
        }

        // Verificar espacio en el álbum usando el modelo
        const tieneEspacio = await Album.verificarEspacio(album_id);
        if (!tieneEspacio) {
            return res.status(400).json({
                success: false,
                message: 'El álbum ha alcanzado el límite de 20 imágenes'
            });
        }

        const imagePath = `/uploads/posts/${req.file.filename}`;
        
        // Crear la imagen usando el modelo
        const imageData = {
            album_id,
            titulo,
            descripcion,
            archivo: imagePath,
            es_publica: true
        };

        const imageId = await Imagen.crear(imageData);

        // Obtener la imagen creada con información completa
        const newImage = await Imagen.obtenerPorId(imageId);

        res.status(201).json({
            success: true,
            message: 'Imagen publicada exitosamente',
            post: newImage
        });
    } catch (error) {
        console.error('Error detallado al crear imagen:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al publicar la imagen'
        });
    }
};

// Controlador para obtener una imagen específica por ID
const getImageById = async (req, res) => {
    try {
        const { imageId } = req.params;
        const userId = req.user.id;

        // Obtener la imagen con información completa
        const query = `
            SELECT DISTINCT
                i.*,
                a.titulo as album_titulo,
                a.usuario_id,
                u.nombre,
                u.apellido,
                u.avatar,
                COUNT(DISTINCT c.id) as comments_count,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM compartidos comp 
                        WHERE comp.imagen_id = i.id AND comp.compartido_con = ?
                    ) THEN 1
                    ELSE 0
                END as es_compartida
            FROM imagenes i
            JOIN albumes a ON i.album_id = a.id
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN comentarios c ON i.id = c.imagen_id
            WHERE i.id = ? AND (
                -- Imágenes propias del usuario
                a.usuario_id = ? 
                OR 
                -- Imágenes de amigos (donde hay amistad aceptada)
                EXISTS (
                    SELECT 1 FROM amistades am 
                    WHERE ((am.de_id = ? AND am.para_id = a.usuario_id) OR (am.de_id = a.usuario_id AND am.para_id = ?))
                    AND am.estado = 'aceptada'
                )
                OR
                -- Imágenes compartidas con el usuario
                EXISTS (
                    SELECT 1 FROM compartidos comp 
                    WHERE comp.imagen_id = i.id AND comp.compartido_con = ?
                )
            )
            GROUP BY i.id, i.album_id, i.titulo, i.descripcion, i.archivo, i.es_publica, i.fecha_subida, a.titulo, a.usuario_id, u.nombre, u.apellido, u.avatar
        `;

        const [images] = await db.query(query, [userId, imageId, userId, userId, userId, userId]);

        if (images.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Imagen no encontrada o no tienes acceso a ella'
            });
        }

        const image = images[0];

        // Obtener comentarios para la imagen
        const comments = await Comment.getByImageId(image.id);
        image.comments = comments;
        // Agregar propiedad compartido para compatibilidad con el frontend
        image.compartido = image.es_compartida === 1;

        res.json({
            success: true,
            image: image
        });
    } catch (error) {
        console.error('Error al obtener imagen específica:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la imagen'
        });
    }
};

module.exports = {
    showFeed,
    getFeed,
    getPosts,
    createPost,
    getImageById
}; 