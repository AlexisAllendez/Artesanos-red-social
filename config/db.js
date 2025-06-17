const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Configuración inicial sin base de datos
const initialConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'Alexis83',
    password: process.env.DB_PASSWORD || 'TukiTuki12',
    port: process.env.DB_PORT || 3308,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Configuración completa con base de datos
const dbConfig = {
    ...initialConfig,
    database: 'artesanos_com'
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Crear objeto db con los métodos query y execute
const db = {
    query: async (sql, params) => {
        try {
            const [results] = await pool.query(sql, params);
            return [results];
        } catch (error) {
            throw error;
        }
    },
    execute: async (sql, params) => {
        try {
            const [results] = await pool.execute(sql, params);
            return [results];
        } catch (error) {
            throw error;
        }
    }
};

// Función para crear la base de datos y las tablas
async function initializeDatabase() {
    let tempPool;
    try {
        // Crear conexión temporal sin base de datos
        tempPool = mysql.createPool(initialConfig);
        
        // Crear la base de datos si no existe
        await tempPool.query('CREATE DATABASE IF NOT EXISTS artesanos_com CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        
        // Usar la base de datos
        await tempPool.query('USE artesanos_com');
        
        // Leer y ejecutar el schema
        const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');
        
        // Dividir el schema en comandos individuales
        const commands = schema
            .split(';')
            .map(command => command.trim())
            .filter(command => command.length > 0);
        
        // Ejecutar cada comando
        for (const command of commands) {
            if (!command.toLowerCase().includes('create database')) {
                await tempPool.query(command);
            }
        }
        
        return true;
    } catch (error) {
        throw error;
    } finally {
        if (tempPool) await tempPool.end();
    }
}

// Función para probar la conexión
async function testConnection() {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query('SHOW TABLES');
        return true;
    } catch (error) {
        if (error.code === 'ER_BAD_DB_ERROR') {
            await initializeDatabase();
            return await testConnection();
        }
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

// Función para cerrar el pool de conexiones
async function closePool() {
    try {
        await pool.end();
    } catch (error) {
        throw error;
    }
}

module.exports = {
    db,
    pool,
    testConnection,
    closePool,
    initializeDatabase
}; 