const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

// Importar controladores
const feedController = require('../controllers/feedController');
const amistadController = require('../controllers/amistadController');
const albumController = require('../controllers/albumController');
const commentController = require('../controllers/commentController');
const shareController = require('../controllers/shareController');
const notificationController = require('../controllers/notificationController');

// Rutas de feed
router.get('/feed', feedController.getFeed);
router.post('/posts', upload.single('imagen'), feedController.createPost);
router.get('/images/:imageId', isAuthenticated, feedController.getImageById);

// Rutas de álbumes
router.get('/albums', albumController.getAlbums);
router.post('/albums', albumController.createAlbum);
router.get('/albums/:id', albumController.getAlbumById);
router.put('/albums/:id', albumController.updateAlbum);
router.delete('/albums/:id', albumController.deleteAlbum);

// Rutas de comentarios
router.get('/posts/:postId/comments', commentController.getComments);
router.post('/posts/:postId/comments', commentController.createComment);
router.put('/comments/:id', commentController.updateComment);
router.delete('/comments/:id', commentController.deleteComment);

// Rutas de amistad
router.get('/friends/requests', amistadController.getPendingRequests);
router.post('/friends/accept/:requestId', amistadController.acceptRequest);
router.post('/friends/reject/:requestId', amistadController.rejectRequest);
router.post('/friends/request', amistadController.enviarSolicitud);

// Ruta de búsqueda
router.get('/search', amistadController.buscarUsuarios);

// Rutas de compartir
router.post('/share/image/:imageId', shareController.shareImage);
router.get('/share/images', shareController.getSharedImages);
router.post('/share/album/:albumId', shareController.shareAlbum);

// Rutas de notificaciones
router.get('/notifications', isAuthenticated, notificationController.getNotifications);
router.get('/notifications/unread', isAuthenticated, notificationController.getUnreadNotifications);
router.get('/notifications/count', isAuthenticated, notificationController.getUnreadCount);
router.get('/notifications/:id', isAuthenticated, notificationController.getNotificationById);
router.put('/notifications/:id/read', isAuthenticated, notificationController.markAsRead);
router.put('/notifications/read-all', isAuthenticated, notificationController.markAllAsRead);
router.delete('/notifications/:id', isAuthenticated, notificationController.deleteNotification);
router.delete('/notifications', isAuthenticated, notificationController.deleteAllNotifications);

module.exports = router; 