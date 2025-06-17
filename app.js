const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { testConnection, pool } = require('./config/db');
const { isNotAuthenticated, isAuthenticated } = require('./middleware/authMiddleware');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const shareRoutes = require('./routes/shareRoutes');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configuración de CORS
const corsOptions = {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configuración de archivos estáticos
app.use(express.static('public'));
app.use(express.static('uploads'));
app.use('/views', express.static('views'));

// Archivos estáticos
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de Socket.IO
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);
    
    // Unirse a la sala del usuario si está autenticado
    socket.on('join_user_room', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`Usuario ${userId} unido a su sala`);
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });
});

// Middleware para hacer io disponible en las rutas
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Configuración de sesiones
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'artesanos_connect',
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'artesanos-connect-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Cambiar a true en producción con HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Rutas de autenticación 
app.use('/', authRoutes);

// Rutas de API protegidas
app.use('/api', isAuthenticated, apiRoutes);

// Rutas de compartir
app.use('/', shareRoutes);

// Rutas de vistas 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'home', 'index.html'));
});

app.get('/login', isNotAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'auth', 'login.html'));
});

app.get('/register', isNotAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'auth', 'register.html'));
});

app.get('/feed', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'feed', 'index.html'));
});

app.get('/notifications', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'notifications', 'index.html'));
});

// Middleware para manejar errores 404
app.use((req, res, next) => {
    // Si la petición es para una ruta de API, devolver JSON
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'Ruta no encontrada'
        });
    }
    
    // Si es una ruta de vista, devolver la página 404
    res.status(404).sendFile(path.join(__dirname, 'views', 'error', '404.html'));
});

// Middleware para manejar errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Si la petición es para una ruta de API, devolver JSON
    if (req.path.startsWith('/api/')) {
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
    
    // Si es una ruta de vista, devolver la página de error
    res.status(500).sendFile(path.join(__dirname, 'views', 'error', '500.html'));
});

// Función para encontrar un puerto disponible
async function findAvailablePort(startPort) {
    const net = require('net');
    
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                // Si el puerto está en uso, intentar el siguiente
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
        
        server.listen(startPort, () => {
            server.close(() => {
                resolve(startPort);
            });
        });
    });
}

// Función para cerrar el servidor de forma limpia
function gracefulShutdown(signal) {
    console.log(`\n Recibida señal ${signal}. Cerrando servidor...`);
    
    // Desconectar todos los clientes Socket.IO
    const connectedSockets = Object.keys(io.sockets.sockets);
    console.log(` Desconectando ${connectedSockets.length} clientes Socket.IO...`);
    
    if (connectedSockets.length > 0) {
        io.sockets.emit('server_shutdown', {
            message: 'El servidor se está cerrando. Por favor, recarga la página.'
        });
        
        // Forzar desconexión de todos los clientes
        io.sockets.sockets.forEach((socket) => {
            socket.disconnect(true);
        });
    }
    
    // Cerrar el servidor HTTP
    server.close(() => {
        console.log('✅ Servidor HTTP cerrado');
        
        // Cerrar la conexión de Socket.IO
        io.close(() => {
            console.log('✅ Socket.IO cerrado');
            
            // Cerrar la conexión de la base de datos
            if (pool) {
                pool.end((err) => {
                    if (err) {
                        console.error('❌ Error al cerrar conexión de BD:', err);
                    } else {
                        console.log('✅ Conexión de base de datos cerrada');
                    }
                    
                    console.log('🚀 Proceso terminado');
                    process.exit(0);
                });
            } else {
                console.log('🚀 Proceso terminado');
                process.exit(0);
            }
        });
    });
    
    // Timeout de emergencia - forzar cierre después de 5 segundos
    setTimeout(() => {
        console.log(' Timeout de emergencia - forzando cierre...');
        process.exit(1);
    }, 5000);
}

// Iniciar el servidor
async function startServer() {
    try {
        await testConnection();
        const desiredPort = process.env.PORT || 3000;
        const PORT = await findAvailablePort(desiredPort);
        
        server.listen(PORT, () => {
            console.log(` Servidor corriendo en http://localhost:${PORT}`);
            console.log(` Socket.IO habilitado`);
            console.log(` Base de datos conectada`);
            console.log(`\n Para cerrar el servidor: Ctrl+C`);
        });

        // Manejar señales de terminación
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Manejar errores no capturados
        process.on('uncaughtException', (error) => {
            console.error(' Error no capturado:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error(' Promesa rechazada no manejada:', reason);
            gracefulShutdown('UNHANDLED_REJECTION');
        });

    } catch (error) {
        console.error(' Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();
