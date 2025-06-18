const { db } = require('../config/db');

class Imagen {
    // Crear una nueva imagen
    static async crear(imagenData) {
        const { album_id, titulo, descripcion, archivo, es_publica = false } = imagenData;
        console.log('Datos recibidos en Imagen.crear:', imagenData);

        const query = `
            INSERT INTO imagenes (album_id, titulo, descripcion, archivo, es_publica)
            VALUES (?, ?, ?, ?, ?)
        `;
        console.log('Query SQL:', query);
        console.log('Parámetros:', [album_id, titulo, descripcion, archivo, es_publica]);

        try {
            const [result] = await db.query(query, [album_id, titulo, descripcion, archivo, es_publica]);
            console.log('Resultado de la inserción:', result);
            return result.insertId;
        } catch (error) {
            console.error('Error detallado en Imagen.crear:', error);
            throw new Error('Error al crear imagen: ' + error.message);
        }
    }

    // Obtener imagen por ID
    static async obtenerPorId(id) {
        const query = `
            SELECT i.*, a.titulo as album_titulo, u.nombre, u.apellido,
                   GROUP_CONCAT(DISTINCT e.id, ':', e.nombre, ':', e.tipo) as etiquetas
            FROM imagenes i
            JOIN albumes a ON i.album_id = a.id
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN imagen_etiqueta ie ON i.id = ie.imagen_id
            LEFT JOIN etiquetas e ON ie.etiqueta_id = e.id
            WHERE i.id = ?
            GROUP BY i.id, i.album_id, i.titulo, i.descripcion, i.archivo, i.es_publica, i.fecha_subida, a.titulo, u.nombre, u.apellido
        `;
        try {
            const [rows] = await db.query(query, [id]);
            if (rows[0]) {
                // Procesar etiquetas
                if (rows[0].etiquetas) {
                    rows[0].etiquetas = rows[0].etiquetas.split(',').map(etiqueta => {
                        const [id, nombre, tipo] = etiqueta.split(':');
                        return { id: parseInt(id), nombre, tipo };
                    });
                } else {
                    rows[0].etiquetas = [];
                }
            }
            return rows[0];
        } catch (error) {
            throw new Error('Error al obtener imagen: ' + error.message);
        }
    }

    // Obtener imágenes de un álbum
    static async obtenerPorAlbum(album_id) {
        const query = `
            SELECT i.*, 
                   GROUP_CONCAT(DISTINCT e.id, ':', e.nombre, ':', e.tipo) as etiquetas,
                   COUNT(DISTINCT c.id) as total_comentarios
            FROM imagenes i
            LEFT JOIN imagen_etiqueta ie ON i.id = ie.imagen_id
            LEFT JOIN etiquetas e ON ie.etiqueta_id = e.id
            LEFT JOIN comentarios c ON i.id = c.imagen_id
            WHERE i.album_id = ?
            GROUP BY i.id, i.album_id, i.titulo, i.descripcion, i.archivo, i.es_publica, i.fecha_subida
            ORDER BY i.fecha_subida DESC
        `;
        try {
            const [rows] = await db.query(query, [album_id]);
            return rows.map(row => {
                if (row.etiquetas) {
                    row.etiquetas = row.etiquetas.split(',').map(etiqueta => {
                        const [id, nombre, tipo] = etiqueta.split(':');
                        return { id: parseInt(id), nombre, tipo };
                    });
                } else {
                    row.etiquetas = [];
                }
                return row;
            });
        } catch (error) {
            throw new Error('Error al obtener imágenes del álbum: ' + error.message);
        }
    }

    // Actualizar imagen
    static async actualizar(id, imagenData) {
        const { titulo, descripcion, es_publica } = imagenData;
        const query = 'UPDATE imagenes SET titulo = ?, descripcion = ?, es_publica = ? WHERE id = ?';
        try {
            const [result] = await db.query(query, [titulo, descripcion, es_publica, id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error('Error al actualizar imagen: ' + error.message);
        }
    }

    // Eliminar imagen
    static async eliminar(id) {
        const query = 'DELETE FROM imagenes WHERE id = ?';
        try {
            const [result] = await db.query(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error('Error al eliminar imagen: ' + error.message);
        }
    }

    // Agregar etiqueta a una imagen
    static async agregarEtiqueta(imagen_id, etiqueta_id) {
        const query = 'INSERT INTO imagen_etiqueta (imagen_id, etiqueta_id) VALUES (?, ?)';
        try {
            const [result] = await db.query(query, [imagen_id, etiqueta_id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error('Error al agregar etiqueta: ' + error.message);
        }
    }

    // Remover etiqueta de una imagen
    static async removerEtiqueta(imagen_id, etiqueta_id) {
        const query = 'DELETE FROM imagen_etiqueta WHERE imagen_id = ? AND etiqueta_id = ?';
        try {
            const [result] = await db.query(query, [imagen_id, etiqueta_id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error('Error al remover etiqueta: ' + error.message);
        }
    }

    // Obtener imágenes públicas de un usuario
    static async obtenerImagenesPublicas(usuario_id) {
        const query = `
            SELECT i.* 
            FROM imagenes i
            JOIN albumes a ON i.album_id = a.id
            WHERE a.usuario_id = ? 
            AND i.es_publica = true
            LIMIT 5
        `;
        try {
            const [rows] = await db.query(query, [usuario_id]);
            return rows;
        } catch (error) {
            throw new Error('Error al obtener imágenes públicas: ' + error.message);
        }
    }

    // Compartir una imagen con otro usuario
    static async compartir(imagen_id, compartido_con, album_id) {
        const query = `
            INSERT INTO compartidos (imagen_id, compartido_con, album_id)
            VALUES (?, ?, ?)
        `;
        try {
            const [result] = await db.query(query, [imagen_id, compartido_con, album_id]);
            return result.insertId;
        } catch (error) {
            throw new Error('Error al compartir imagen: ' + error.message);
        }
    }

    // Obtener imágenes compartidas con un usuario
    static async obtenerCompartidas(usuario_id) {
        const query = `
            SELECT i.*, a.titulo as album_titulo, u.nombre, u.apellido,
                   GROUP_CONCAT(DISTINCT e.id, ':', e.nombre, ':', e.tipo) as etiquetas
            FROM imagenes i
            JOIN compartidos c ON i.id = c.imagen_id
            JOIN albumes a ON i.album_id = a.id
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN imagen_etiqueta ie ON i.id = ie.imagen_id
            LEFT JOIN etiquetas e ON ie.etiqueta_id = e.id
            WHERE c.compartido_con = ?
            GROUP BY i.id, i.album_id, i.titulo, i.descripcion, i.archivo, i.es_publica, i.fecha_subida, a.titulo, u.nombre, u.apellido
            ORDER BY c.fecha DESC
        `;
        try {
            const [rows] = await db.query(query, [usuario_id]);
            return rows.map(row => {
                if (row.etiquetas) {
                    row.etiquetas = row.etiquetas.split(',').map(etiqueta => {
                        const [id, nombre, tipo] = etiqueta.split(':');
                        return { id: parseInt(id), nombre, tipo };
                    });
                } else {
                    row.etiquetas = [];
                }
                return row;
            });
        } catch (error) {
            throw new Error('Error al obtener imágenes compartidas: ' + error.message);
        }
    }

    // Buscar imágenes por etiqueta
    static async buscarPorEtiqueta(etiqueta_id) {
        const query = `
            SELECT i.*, a.titulo as album_titulo, u.nombre, u.apellido,
                   GROUP_CONCAT(DISTINCT e.id, ':', e.nombre, ':', e.tipo) as etiquetas
            FROM imagenes i
            JOIN imagen_etiqueta ie ON i.id = ie.imagen_id
            JOIN albumes a ON i.album_id = a.id
            JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN etiquetas e ON ie.etiqueta_id = e.id
            WHERE ie.etiqueta_id = ?
            GROUP BY i.id, i.album_id, i.titulo, i.descripcion, i.archivo, i.es_publica, i.fecha_subida, a.titulo, u.nombre, u.apellido
            ORDER BY i.fecha_subida DESC
        `;
        try {
            const [rows] = await db.query(query, [etiqueta_id]);
            return rows.map(row => {
                if (row.etiquetas) {
                    row.etiquetas = row.etiquetas.split(',').map(etiqueta => {
                        const [id, nombre, tipo] = etiqueta.split(':');
                        return { id: parseInt(id), nombre, tipo };
                    });
                } else {
                    row.etiquetas = [];
                }
                return row;
            });
        } catch (error) {
            throw new Error('Error al buscar imágenes por etiqueta: ' + error.message);
        }
    }

    // Verificar si una imagen ya está compartida con un usuario
    static async verificarCompartida(imagen_id, usuario_id) {
        const query = `
            SELECT COUNT(*) as count
            FROM compartidos 
            WHERE imagen_id = ? AND compartido_con = ?
        `;
        try {
            const [rows] = await db.query(query, [imagen_id, usuario_id]);
            return rows[0].count > 0;
        } catch (error) {
            throw new Error('Error al verificar si la imagen está compartida: ' + error.message);
        }
    }

    // Verificar acceso a una imagen (para comentarios)
    static async verificarAcceso(imagen_id, usuario_id) {
        const query = `
            SELECT i.*, a.usuario_id as propietario_id 
            FROM imagenes i 
            JOIN albumes a ON i.album_id = a.id 
            LEFT JOIN compartidos c ON i.id = c.imagen_id 
            WHERE i.id = ? AND (
                a.usuario_id = ? OR 
                c.compartido_con = ? OR 
                i.es_publica = 1
            )
        `;
        try {
            const [rows] = await db.query(query, [imagen_id, usuario_id, usuario_id]);
            return rows[0] || null;
        } catch (error) {
            throw new Error('Error al verificar acceso a la imagen: ' + error.message);
        }
    }
}

module.exports = Imagen; 