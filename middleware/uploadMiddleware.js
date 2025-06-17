const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que los directorios de uploads existen
const uploadDirs = {
    avatars: path.join(__dirname, '..', 'uploads', 'avatars'),
    posts: path.join(__dirname, '..', 'uploads', 'posts'),
    albumes: path.join(__dirname, '..', 'uploads', 'albumes')
};

Object.values(uploadDirs).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configuración del almacenamiento
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determinar el directorio basado en la ruta y el tipo de archivo
        let uploadType;
        if (file.fieldname === 'avatar') {
            uploadType = 'avatars';
        } else if (req.path.includes('/albumes/')) {
            uploadType = 'albumes';
        } else if (req.path.includes('/feed/api/posts')) {
            uploadType = 'posts';
        } else {
            uploadType = 'posts'; // Por defecto, usar el directorio de posts
        }
        cb(null, uploadDirs[uploadType]);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
    // Verificar el tipo MIME
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Solo se permiten archivos de imagen.'), false);
    }

    // Verificar la extensión
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        return cb(new Error('Formato de imagen no permitido. Use: ' + allowedExtensions.join(', ')), false);
    }

    cb(null, true);
};

// Configuración de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'El archivo es demasiado grande. Tamaño máximo: 5MB'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'Error al subir el archivo: ' + err.message
        });
    }
    
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    
    next();
};

module.exports = {
    upload,
    handleMulterError
}; 