-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    descripcion TEXT,
    intereses TEXT,
    antecedentes TEXT,
    tipo_artesania VARCHAR(50) NOT NULL,
    avatar VARCHAR(255),
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    modo_portfolio BOOLEAN DEFAULT FALSE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Álbumes
CREATE TABLE IF NOT EXISTS albumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    tipo ENUM('normal', 'amistad', 'portfolio', 'compartido') DEFAULT 'normal',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Imágenes
CREATE TABLE IF NOT EXISTS imagenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    album_id INT NOT NULL,
    titulo VARCHAR(100),
    descripcion TEXT,
    archivo VARCHAR(255) NOT NULL,
    es_publica BOOLEAN DEFAULT FALSE,
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (album_id) REFERENCES albumes(id) ON DELETE CASCADE
);

-- Etiquetas
CREATE TABLE IF NOT EXISTS etiquetas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    tipo ENUM('tecnica', 'material', 'estilo') NOT NULL
);

-- Relación Imágenes-Etiquetas
CREATE TABLE IF NOT EXISTS imagen_etiqueta (
    imagen_id INT NOT NULL,
    etiqueta_id INT NOT NULL,
    PRIMARY KEY (imagen_id, etiqueta_id),
    FOREIGN KEY (imagen_id) REFERENCES imagenes(id) ON DELETE CASCADE,
    FOREIGN KEY (etiqueta_id) REFERENCES etiquetas(id) ON DELETE CASCADE
);

-- Comentarios
CREATE TABLE IF NOT EXISTS comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    imagen_id INT NOT NULL,
    autor_id INT NOT NULL,
    texto TEXT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (imagen_id) REFERENCES imagenes(id) ON DELETE CASCADE,
    FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Amistades
CREATE TABLE IF NOT EXISTS amistades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    de_id INT NOT NULL,
    para_id INT NOT NULL,
    estado ENUM('pendiente', 'aceptada', 'rechazada') DEFAULT 'pendiente',
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta DATETIME NULL,
    FOREIGN KEY (de_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (para_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Compartidos
CREATE TABLE IF NOT EXISTS compartidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    imagen_id INT NOT NULL,
    compartido_con INT NOT NULL,
    album_id INT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (imagen_id) REFERENCES imagenes(id) ON DELETE CASCADE,
    FOREIGN KEY (compartido_con) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (album_id) REFERENCES albumes(id) ON DELETE CASCADE
);

-- Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    origen_id INT NOT NULL,
    tipo ENUM('comentario', 'compartido', 'solicitud_amistad', 'amistad_aceptada') NOT NULL,
    contenido_id INT,
    mensaje TEXT,
    leida BOOLEAN DEFAULT FALSE,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (origen_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Portafolio
CREATE TABLE IF NOT EXISTS portafolio (
    usuario_id INT NOT NULL,
    imagen_id INT NOT NULL,
    orden INT DEFAULT 0,
    PRIMARY KEY (usuario_id, imagen_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (imagen_id) REFERENCES imagenes(id) ON DELETE CASCADE
);

-- Estadísticas de Usuario
CREATE TABLE IF NOT EXISTS estadisticas_usuario (
    usuario_id INT PRIMARY KEY,
    total_imagenes INT DEFAULT 0,
    total_albumes INT DEFAULT 0,
    total_comentarios_realizados INT DEFAULT 0,
    total_comentarios_recibidos INT DEFAULT 0,
    total_amigos INT DEFAULT 0,
    visitas_portfolio INT DEFAULT 0,
    ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
); 