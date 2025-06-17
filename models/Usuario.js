const { db } = require('../config/db');

class Usuario {
    // Método para crear un nuevo usuario
    static async crear(usuarioData) {
        const { nombre, apellido, email, password, descripcion, intereses, antecedentes, tipo_artesania, avatar } = usuarioData;
        const query = `
            INSERT INTO usuarios (nombre, apellido, email, password, descripcion, intereses, antecedentes, tipo_artesania, avatar)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        try {
            const [result] = await db.execute(query, [
                nombre, apellido, email, password, descripcion, intereses, antecedentes, tipo_artesania, avatar
            ]);
            return result.insertId;
        } catch (error) {
            throw new Error('Error al crear usuario: ' + error.message);
        }
    }

    // Método para buscar usuario por email
    static async buscarPorEmail(email) {
        const query = 'SELECT * FROM usuarios WHERE email = ?';
        try {
            const [rows] = await db.execute(query, [email]);
            return rows[0];
        } catch (error) {
            throw new Error('Error al buscar usuario por email: ' + error.message);
        }
    }

    // Método para buscar usuario por ID
    static async buscarPorId(id) {
        const query = 'SELECT * FROM usuarios WHERE id = ?';
        try {
            const [rows] = await db.execute(query, [id]);
            return rows[0];
        } catch (error) {
            throw new Error('Error al buscar usuario por ID: ' + error.message);
        }
    }

    // Método para actualizar usuario
    static async actualizar(id, usuarioData) {
        const camposPermitidos = ['nombre', 'apellido', 'descripcion', 'intereses', 'antecedentes', 'tipo_artesania', 'avatar', 'estado', 'modo_portfolio'];
        const camposActualizar = Object.keys(usuarioData)
            .filter(campo => camposPermitidos.includes(campo))
            .map(campo => `${campo} = ?`);
        
        if (camposActualizar.length === 0) {
            throw new Error('No hay campos válidos para actualizar');
        }

        const query = `UPDATE usuarios SET ${camposActualizar.join(', ')} WHERE id = ?`;
        const valores = [...Object.values(usuarioData), id];

        try {
            const [result] = await db.execute(query, valores);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error('Error al actualizar usuario: ' + error.message);
        }
    }

    // Método para cambiar contraseña
    static async cambiarPassword(id, nuevaPassword) {
        const query = 'UPDATE usuarios SET password = ? WHERE id = ?';
        try {
            const [result] = await db.execute(query, [nuevaPassword, id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error('Error al cambiar contraseña: ' + error.message);
        }
    }

    // Método para desactivar usuario
    static async desactivar(id) {
        const query = 'UPDATE usuarios SET estado = "inactivo" WHERE id = ?';
        try {
            const [result] = await db.execute(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error('Error al desactivar usuario: ' + error.message);
        }
    }

    // Método para obtener estadísticas del usuario
    static async obtenerEstadisticas(id) {
        const query = 'SELECT * FROM estadisticas_usuario WHERE usuario_id = ?';
        try {
            const [rows] = await db.execute(query, [id]);
            return rows[0];
        } catch (error) {
            throw new Error('Error al obtener estadísticas: ' + error.message);
        }
    }

    // Método para buscar usuarios por tipo de artesanía
    static async buscarPorTipoArtesania(tipoArtesania) {
        const query = 'SELECT id, nombre, apellido, email, descripcion, tipo_artesania, avatar FROM usuarios WHERE tipo_artesania = ? AND estado = "activo"';
        try {
            const [rows] = await db.execute(query, [tipoArtesania]);
            return rows;
        } catch (error) {
            throw new Error('Error al buscar usuarios por tipo de artesanía: ' + error.message);
        }
    }
}

module.exports = Usuario; 