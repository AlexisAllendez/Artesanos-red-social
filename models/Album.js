const { db } = require('../config/db');

class Album {
    // Verificar si existe un álbum con el mismo título para el usuario
    static async existeAlbumConTitulo(usuario_id, titulo) {
        const query = 'SELECT id FROM albumes WHERE usuario_id = ? AND titulo = ?';
        try {
            const [rows] = await db.query(query, [usuario_id, titulo]);
            return rows.length > 0;
        } catch (error) {
            throw new Error('Error al verificar título de álbum: ' + error.message);
        }
    }

    // Crear un nuevo álbum
    static async crear(albumData) {
        const { usuario_id, titulo, tipo = 'normal' } = albumData;
        
        // Verificar si ya existe un álbum con el mismo título
        const existe = await this.existeAlbumConTitulo(usuario_id, titulo);
        if (existe) {
            throw new Error('Ya existe un álbum con ese título');
        }

        const query = `
            INSERT INTO albumes (usuario_id, titulo, tipo)
            VALUES (?, ?, ?)
        `;
        try {
            const [result] = await db.query(query, [usuario_id, titulo, tipo]);
            return result.insertId;
        } catch (error) {
            throw new Error('Error al crear álbum: ' + error.message);
        }
    }

    // Crear álbum de amistad (cuando se acepta una solicitud)
    static async crearAlbumAmistad(usuario_id, amigo_id, nombreAmigo) {
        const titulo = `Álbum de ${nombreAmigo}`;
        return this.crear({
            usuario_id,
            titulo,
            tipo: 'amistad'
        });
    }

    // Obtener álbum por ID
    static async obtenerPorId(id) {
        const query = `
            SELECT a.*, u.nombre, u.apellido 
            FROM albumes a
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.id = ?
        `;
        try {
            const [rows] = await db.query(query, [id]);
            return rows[0];
        } catch (error) {
            throw new Error('Error al obtener álbum: ' + error.message);
        }
    }

    // Obtener todos los álbumes de un usuario
    static async obtenerPorUsuario(usuario_id) {
        const query = `
            SELECT a.*, 
                   COUNT(i.id) as total_imagenes,
                   u.nombre, u.apellido
            FROM albumes a
            LEFT JOIN imagenes i ON a.id = i.album_id
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.usuario_id = ?
            GROUP BY a.id
            ORDER BY a.id DESC
        `;
        try {
            const [rows] = await db.query(query, [usuario_id]);
            return rows;
        } catch (error) {
            throw new Error('Error al obtener álbumes del usuario: ' + error.message);
        }
    }

    // Actualizar álbum
    static async actualizar(id, albumData) {
        const { titulo } = albumData;
        const query = 'UPDATE albumes SET titulo = ? WHERE id = ?';
        try {
            const [result] = await db.query(query, [titulo, id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error('Error al actualizar álbum: ' + error.message);
        }
    }

    // Eliminar álbum
    static async eliminar(id) {
        const query = 'DELETE FROM albumes WHERE id = ?';
        try {
            const [result] = await db.query(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error('Error al eliminar álbum: ' + error.message);
        }
    }

    // Verificar si un álbum pertenece a un usuario
    static async verificarPropiedad(album_id, usuario_id) {
        const query = 'SELECT id FROM albumes WHERE id = ? AND usuario_id = ?';
        try {
            const [rows] = await db.query(query, [album_id, usuario_id]);
            return rows.length > 0;
        } catch (error) {
            throw new Error('Error al verificar propiedad del álbum: ' + error.message);
        }
    }

    // Obtener álbumes compartidos con un usuario
    static async obtenerCompartidos(usuario_id) {
        const query = `
            SELECT DISTINCT a.*, u.nombre, u.apellido,
                   COUNT(i.id) as total_imagenes
            FROM albumes a
            JOIN usuarios u ON a.usuario_id = u.id
            JOIN imagenes i ON a.id = i.album_id
            JOIN compartidos c ON i.id = c.imagen_id
            WHERE c.compartido_con = ?
            GROUP BY a.id
            ORDER BY a.fecha_creacion DESC
        `;
        try {
            const [rows] = await db.query(query, [usuario_id]);
            return rows;
        } catch (error) {
            throw new Error('Error al obtener álbumes compartidos: ' + error.message);
        }
    }

    // Verificar si un álbum tiene espacio para más imágenes (máximo 20)
    static async verificarEspacio(album_id) {
        const query = 'SELECT COUNT(*) as total FROM imagenes WHERE album_id = ?';
        try {
            const [rows] = await db.query(query, [album_id]);
            return rows[0].total < 20;
        } catch (error) {
            throw new Error('Error al verificar espacio en álbum: ' + error.message);
        }
    }

    // Buscar álbumes por título
    static async buscarPorTitulo(titulo) {
        const query = `
            SELECT a.*, u.nombre, u.apellido,
                   COUNT(i.id) as total_imagenes
            FROM albumes a
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN imagenes i ON a.id = i.album_id
            WHERE a.titulo LIKE ?
            GROUP BY a.id
            ORDER BY a.fecha_creacion DESC
        `;
        try {
            const [rows] = await db.query(query, [`%${titulo}%`]);
            return rows;
        } catch (error) {
            throw new Error('Error al buscar álbumes: ' + error.message);
        }
    }

    // Buscar álbum por tipo, usuario y patrón de título
    static async buscarPorTipoYUsuario(usuario_id, tipo, tituloPatron) {
        const query = `
            SELECT a.*, u.nombre, u.apellido
            FROM albumes a
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.usuario_id = ? AND a.tipo = ? AND a.titulo LIKE ?
            ORDER BY a.fecha_creacion DESC
            LIMIT 1
        `;
        try {
            const [rows] = await db.query(query, [usuario_id, tipo, `%${tituloPatron}%`]);
            return rows[0] || null;
        } catch (error) {
            throw new Error('Error al buscar álbum por tipo y usuario: ' + error.message);
        }
    }
}

module.exports = Album; 