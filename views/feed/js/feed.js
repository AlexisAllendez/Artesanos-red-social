// Feed.js - Funcionalidad específica del feed
// Usa el sistema de autenticación centralizado de app.js

// Variables globales del feed
let currentUser = null;
let posts = [];
let albums = [];
let socket = null;
let searchResults = [];

// Variables globales para compartir
let selectedUsers = new Set();
let availableUsers = [];
let currentShareType = 'image';

// Inicializar cuando la aplicación esté lista
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que la aplicación principal se inicialice
    if (window.App && window.App.currentUser) {
        initializeFeed();
    } else {
        // Si la aplicación no está lista, esperar al evento
        window.AppAPI.on('userUpdated', initializeFeed);
    }
});

// Función para obtener el usuario actual de forma confiable
async function getCurrentUser() {
    // Si ya tenemos el usuario, devolverlo
    if (currentUser) {
        return currentUser;
    }
    
    // Si no, intentar obtenerlo del API
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.authenticated) {
                currentUser = data.user;
                return currentUser;
            } else {
                throw new Error('Usuario no autenticado');
            }
        } else {
            throw new Error(`Error del servidor: ${response.status}`);
        }
    } catch (error) {
        throw error; // Re-lanzar el error para que se maneje en showShareModal
    }
}

function initializeFeed() {
    // Obtener datos del usuario y socket desde la aplicación principal
    currentUser = window.AppAPI?.getCurrentUser();
    socket = window.AppAPI?.getSocket();
    
    // Configurar eventos
    setupEventListeners();
    
    // Cargar datos iniciales
    loadAlbums();
    loadPosts();
    
    // Configurar eventos de Socket.IO específicos del feed
    setupSocketEvents();
    
    // Manejar parámetros de URL para mostrar contenido específico
    handleUrlParameters();
}

function setupEventListeners() {
    // Formulario de creación de post
    const createPostForm = document.getElementById('createPostForm');
    if (createPostForm) {
        createPostForm.addEventListener('submit', handleCreatePost);
    }
    
    // Botón de subir imagen
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const postImageInput = document.getElementById('postImage');
    
    if (uploadImageBtn && postImageInput) {
        uploadImageBtn.addEventListener('click', () => postImageInput.click());
        postImageInput.addEventListener('change', handleImageSelect);
    }
    
    // Botón de crear álbum
    const createAlbumBtn = document.getElementById('createAlbumBtn');
    if (createAlbumBtn) {
        createAlbumBtn.addEventListener('click', showCreateAlbumModal);
    }
    
    // Guardar álbum
    const saveAlbumBtn = document.getElementById('saveAlbumBtn');
    if (saveAlbumBtn) {
        saveAlbumBtn.addEventListener('click', handleCreateAlbum);
    }
    
    // Búsqueda
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    
    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', handleSearch);
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
        
        // Limpiar búsqueda cuando se hace clic fuera del input
        document.addEventListener('click', (e) => {
            // Solo limpiar si el clic es fuera del formulario de búsqueda Y no es en elementos de comentarios
            if (!searchForm.contains(e.target) && 
                !e.target.closest('.comments-section') && 
                !e.target.closest('.comment-form') && 
                !e.target.closest('.comment-btn') &&
                !e.target.closest('.post-card')) {
                clearSearch();
            }
        });
    }
}

function setupSocketEvents() {
    if (!socket) return;
    
    // Escuchar nuevos posts
    socket.on('nuevo_post', (data) => {
        addPostToFeed(data);
        window.AppAPI.showToast({
            title: 'Nuevo post',
            message: `${data.nombre} ${data.apellido} publicó algo nuevo`,
            type: 'info'
        });
    });
    
    // Escuchar nuevos comentarios
    socket.on('nuevo_comentario', (data) => {
        addCommentToPost(data);
    });
}

async function loadAlbums() {
    try {
        const response = await fetch('/api/albums', {
            credentials: 'include'
        });

        if (response.ok) {
            albums = await response.json();
            updateAlbumSelect();
        } else {
            console.error('Error al cargar álbumes');
        }
    } catch (error) {
        console.error('Error al cargar álbumes:', error);
    }
}

async function loadPosts() {
    try {
        const response = await fetch('/api/feed', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            posts = data.posts || [];
            renderPosts();
        } else {
            console.error('Error al cargar posts');
        }
    } catch (error) {
        console.error('Error al cargar posts:', error);
    }
}

function renderPosts() {
    const postsFeed = document.getElementById('postsFeed');
    if (!postsFeed) return;
    
    postsFeed.innerHTML = '';
    
    if (posts.length === 0) {
        postsFeed.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-images fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No hay publicaciones aún</h5>
                <p class="text-muted">¡Sé el primero en compartir tu arte!</p>
            </div>
        `;
        return;
    }

    posts.forEach(post => {
        const postElement = createPostElement(post);
        postsFeed.appendChild(postElement);
    });
}

function createPostElement(post) {
    const template = document.getElementById('postTemplate');
    if (!template) return document.createElement('div');
    
    const clone = template.content.cloneNode(true);
    
    // Llenar datos del post
    const avatar = clone.querySelector('.post-avatar');
    const author = clone.querySelector('.post-author');
    const date = clone.querySelector('.post-date');
    const album = clone.querySelector('.post-album');
    const title = clone.querySelector('.post-title');
    const description = clone.querySelector('.post-description');
    const image = clone.querySelector('.post-image');
    const commentsCount = clone.querySelector('.comments-count');
    
    if (avatar) avatar.src = post.avatar || '/img/default-avatar.png';
    if (author) author.textContent = `${post.nombre} ${post.apellido}`;
    if (date) date.textContent = formatDate(post.fecha_subida);
    if (album) album.textContent = `Álbum: ${post.album_titulo}`;
    if (title) title.textContent = post.titulo;
    if (description) description.textContent = post.descripcion;
    if (commentsCount) commentsCount.textContent = post.comments_count || 0;
    
    if (post.archivo) {
        if (image) {
            image.src = post.archivo;
            image.style.display = 'block';
        }
    }
    
    // Configurar eventos del post
    const postCard = clone.querySelector('.post-card');
    const commentBtn = clone.querySelector('.comment-btn');
    const shareBtn = clone.querySelector('.share-btn');
    
    // Agregar el ID del post al elemento para poder identificarlo
    if (postCard) {
        postCard.setAttribute('data-post-id', post.id);
    }
    
    if (commentBtn) {
        commentBtn.addEventListener('click', () => toggleComments(postCard, post.id));
    }
    
    // Configurar botón de compartir de forma asíncrona
    if (shareBtn) {
        // Por defecto mostrar el botón, pero deshabilitarlo si no es propietario
        shareBtn.style.display = 'inline-block';
        shareBtn.disabled = true;
        shareBtn.innerHTML = '<i class="fas fa-share"></i> Cargando...';
        
        // Obtener usuario y configurar botón
        getCurrentUser().then(user => {
            if (user && user.id == post.usuario_id) {
                // Usuario es propietario - habilitar compartir
                shareBtn.disabled = false;
                shareBtn.innerHTML = '<i class="fas fa-share"></i> Compartir';
                shareBtn.title = 'Compartir esta publicación';
                shareBtn.addEventListener('click', () => showShareModal(post));
            } else {
                // Usuario no es propietario - deshabilitar y cambiar texto
                shareBtn.disabled = true;
                shareBtn.innerHTML = '<i class="fas fa-share"></i> Solo propietario';
                shareBtn.title = 'Solo puedes compartir tus propias publicaciones';
            }
        }).catch(error => {
            window.AppAPI.showToast({
                title: 'Error',
                message: error.message || 'Error al verificar permisos',
                type: 'error'
            });
        });
    }
    
    // Configurar formulario de comentarios
    const commentForm = clone.querySelector('.comment-form');
    if (commentForm) {
        commentForm.addEventListener('submit', (e) => handleCommentSubmit(e, post.id));
    }
    
    return clone;
}

function addPostToFeed(post) {
    posts.unshift(post);
    const postsFeed = document.getElementById('postsFeed');
    if (postsFeed) {
        const postElement = createPostElement(post);
        postsFeed.insertBefore(postElement, postsFeed.firstChild);
    }
}

async function handleCreatePost(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const title = document.getElementById('postTitle').value;
    const description = document.getElementById('postDescription').value;
    const albumId = document.getElementById('albumSelect').value;
    const imageFile = document.getElementById('postImage').files[0];
    
    if (!title || !albumId) {
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Por favor completa todos los campos requeridos',
            type: 'error'
        });
            return;
        }

    formData.append('titulo', title);
    formData.append('descripcion', description);
    formData.append('album_id', albumId);
    if (imageFile) {
        formData.append('imagen', imageFile);
    }
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            
            // Limpiar formulario
            e.target.reset();
            document.getElementById('submitPostBtn').disabled = true;
            
            // Agregar post al feed
            addPostToFeed(data.post);
            
            window.AppAPI.showToast({
                title: '¡Éxito!',
                message: 'Tu publicación se ha subido correctamente',
                type: 'success'
            });
        } else {
            const error = await response.json();
            window.AppAPI.showToast({
                title: 'Error',
                message: error.message || 'Error al crear la publicación',
                type: 'error'
            });
        }
    } catch (error) {
        console.error('Error al crear post:', error);
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Error de conexión',
            type: 'error'
        });
    }
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    const submitBtn = document.getElementById('submitPostBtn');
    
    if (file) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

function updateAlbumSelect() {
    const albumSelect = document.getElementById('albumSelect');
    if (!albumSelect) return;
    
    // Limpiar opciones existentes excepto la primera
    albumSelect.innerHTML = '<option value="">Seleccionar álbum...</option>';
    
    albums.forEach(album => {
            const option = document.createElement('option');
            option.value = album.id;
        option.textContent = album.titulo;
        albumSelect.appendChild(option);
    });
}

function showCreateAlbumModal() {
    const modal = new bootstrap.Modal(document.getElementById('createAlbumModal'));
    modal.show();
}

async function handleCreateAlbum() {
    const title = document.getElementById('albumTitle').value;
    const type = document.getElementById('albumType').value;
    
    if (!title) {
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Por favor ingresa un título para el álbum',
            type: 'error'
        });
        return;
    }

    try {
        const response = await fetch('/api/albums', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                titulo: title,
                tipo: type
            }),
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createAlbumModal'));
            modal.hide();

            // Limpiar formulario
            document.getElementById('createAlbumForm').reset();
            
            // Recargar álbumes
            await loadAlbums();
            
            window.AppAPI.showToast({
                title: '¡Éxito!',
                message: 'Álbum creado correctamente',
                type: 'success'
            });
        } else {
            const error = await response.json();
            window.AppAPI.showToast({
                title: 'Error',
                message: error.message || 'Error al crear el álbum',
                type: 'error'
            });
        }
    } catch (error) {
        console.error('Error al crear álbum:', error);
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Error de conexión',
            type: 'error'
        });
    }
}

function toggleComments(postCard, postId) {
    const commentsSection = postCard.querySelector('.comments-section');
    const isVisible = commentsSection.style.display !== 'none';
    
    if (!isVisible) {
        loadComments(postId, commentsSection);
    }
    
    commentsSection.style.display = isVisible ? 'none' : 'block';
}

async function loadComments(postId, commentsSection) {
    try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            // El controlador devuelve directamente un array de comentarios, no un objeto con data
            const comments = Array.isArray(data) ? data : (data.data || []);
            renderComments(comments, commentsSection, postId);
        } else {
            console.error('Error al cargar comentarios:', response.status);
        }
    } catch (error) {
        console.error('Error al cargar comentarios:', error);
    }
}

function renderComments(comments, commentsSection, postId) {
    const commentsList = commentsSection.querySelector('.comments-list');
    
    if (!commentsList) return;
    
    commentsList.innerHTML = '';
    
    comments.forEach((comment, index) => {
        const commentElement = createCommentElement(comment, postId);
        commentsList.appendChild(commentElement);
    });
}

function createCommentElement(comment, postId) {
    const template = document.getElementById('commentTemplate');
    
    if (!template) {
        console.error('Template de comentario no encontrado!');
        return document.createElement('div');
    }
    
    const clone = template.content.cloneNode(true);
    
    const avatar = clone.querySelector('.comment-avatar');
    const author = clone.querySelector('.comment-author');
    const date = clone.querySelector('.comment-date');
    const text = clone.querySelector('.comment-text');
    
    if (avatar) avatar.src = comment.avatar || '/img/default-avatar.png';
    if (author) author.textContent = `${comment.nombre} ${comment.apellido}`;
    if (date) date.textContent = formatDate(comment.fecha);
    if (text) text.textContent = comment.texto;
    
    // Mostrar botones de editar/eliminar solo para el autor del comentario
    if (window.currentUser && comment.autor_id === window.currentUser.id) {
        const editBtn = clone.querySelector('.edit-comment-btn');
        const deleteBtn = clone.querySelector('.delete-comment-btn');
        
        if (editBtn) {
            editBtn.style.display = 'inline-block';
            editBtn.addEventListener('click', () => editComment(comment.id, comment.texto));
        }
        
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
            deleteBtn.addEventListener('click', () => deleteComment(comment.id, postId));
        }
    }
    
    return clone;
}

function addCommentToPost(commentData) {
    // Buscar el post correspondiente y agregar el comentario
    const postElement = document.querySelector(`[data-post-id="${commentData.imagen_id}"]`);
    if (postElement) {
        const commentsSection = postElement.querySelector('.comments-section');
        if (commentsSection && commentsSection.style.display !== 'none') {
            const commentsList = commentsSection.querySelector('.comments-list');
            if (commentsList) {
                const commentElement = createCommentElement(commentData, commentData.imagen_id);
                commentsList.appendChild(commentElement);
            }
        }
    }
}

async function handleCommentSubmit(e, postId) {
    e.preventDefault();
    
    const form = e.target;
    const input = form.querySelector('input');
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ texto: text }),
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
        
            // Limpiar input
            input.value = '';
            
            // Agregar comentario a la lista
            const commentsList = form.closest('.comments-section').querySelector('.comments-list');
            if (commentsList) {
                const commentElement = createCommentElement(data.data || data.comment, postId);
                commentsList.appendChild(commentElement);
            }
        } else {
            const error = await response.json();
            window.AppAPI.showToast({
                title: 'Error',
                message: error.message || 'Error al crear el comentario',
                type: 'error'
            });
        }
    } catch (error) {
        console.error('Error al crear comentario:', error);
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Error de conexión',
            type: 'error'
        });
    }
}

function showShareModal(post) {
    // Obtener usuario actual de forma confiable
    getCurrentUser().then(user => {
        // Validar que el usuario actual es propietario de la publicación
        if (!user || user.id != post.usuario_id) {
            window.AppAPI.showToast({
                title: 'Acceso denegado',
                message: 'Solo puedes compartir tus propias publicaciones',
                type: 'error'
            });
            return;
        }
        
        // Guardar el post actual para compartir
        currentSharePost = post;
        
        // Limpiar estado
        selectedUsers.clear();
        currentShareType = 'image';
        
        // Actualizar vista previa
        updateSharePreview(post);
        
        // Limpiar el modal
        document.getElementById('searchUsersInput').value = '';
        document.getElementById('usersList').innerHTML = '';
        document.getElementById('selectedUsersList').innerHTML = '';
        updateSelectedCount();
        
        // Configurar tipo de compartir
        document.getElementById('shareImage').checked = true;
        
        // Cargar usuarios disponibles
        loadUsersForSharing();
        
        // Configurar eventos del modal
        setupShareModalEvents();
        
        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('shareModal'));
        modal.show();
    }).catch(error => {
        window.AppAPI.showToast({
            title: 'Error',
            message: error.message || 'Error al verificar permisos',
            type: 'error'
        });
    });
}

function updateSharePreview(post) {
    // Actualizar avatar y autor
    const avatar = document.getElementById('sharePreviewAvatar');
    const author = document.getElementById('sharePreviewAuthor');
    const album = document.getElementById('sharePreviewAlbum');
    const title = document.getElementById('sharePreviewTitle');
    const description = document.getElementById('sharePreviewDescription');
    const image = document.getElementById('sharePreviewImage');
    
    if (avatar) avatar.src = post.avatar || '/img/default-avatar.png';
    if (author) author.textContent = `${post.nombre} ${post.apellido}`;
    if (album) album.textContent = `Álbum: ${post.album_titulo}`;
    if (title) title.textContent = post.titulo;
    if (description) description.textContent = post.descripcion;
    
    // Mostrar imagen si existe
    if (image && post.archivo) {
        image.src = post.archivo;
        image.style.display = 'block';
    } else if (image) {
        image.style.display = 'none';
    }
}

// Cargar usuarios para compartir
async function loadUsersForSharing() {
    try {
        const response = await fetch('/api/users', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            availableUsers = data.users || [];
            renderUsersForSharing(availableUsers);
        } else {
            window.AppAPI.showToast({
                title: 'Error',
                message: 'No se pudieron cargar los usuarios',
                type: 'error'
            });
        }
    } catch (error) {
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Error de conexión',
            type: 'error'
        });
    }
}

// Renderizar usuarios en el modal de compartir
function renderUsersForSharing(users) {
    const usersList = document.getElementById('usersList');
    const template = document.getElementById('userTemplate');
    
    if (!usersList || !template) return;
    
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        usersList.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-users fa-2x text-muted mb-2"></i>
                <p class="text-muted mb-2">No tienes amigos para compartir</p>
                <small class="text-muted">Solo puedes compartir con usuarios que sean tus amigos</small>
                <br>
                <a href="/feed" class="btn btn-sm btn-outline-primary mt-2">
                    <i class="fas fa-user-plus me-1"></i>Buscar amigos
                </a>
            </div>
        `;
        return;
    }
    
    users.forEach(user => {
        const clone = template.content.cloneNode(true);
        
        const userItem = clone.querySelector('.user-item');
        const avatar = clone.querySelector('.user-avatar');
        const name = clone.querySelector('.user-name');
        const craft = clone.querySelector('.user-craft');
        const checkbox = clone.querySelector('.user-checkbox');
        const selectBtn = clone.querySelector('.select-user-btn');
        
        if (userItem) userItem.dataset.userId = user.id;
        if (avatar) avatar.src = user.avatar || '/img/default-avatar.png';
        if (name) name.textContent = `${user.nombre} ${user.apellido}`;
        if (craft) craft.textContent = user.tipo_artesania || 'Artesano';
        if (checkbox) {
            checkbox.value = user.id;
            checkbox.checked = selectedUsers.has(user.id);
        }
        
        // Configurar eventos
        if (selectBtn) {
            selectBtn.addEventListener('click', () => toggleUserSelection(user));
        }
        
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    addUserToSelection(user);
                } else {
                    removeUserFromSelection(user.id);
                }
            });
        }
        
        usersList.appendChild(clone);
    });
}

// Configurar eventos del modal de compartir
function setupShareModalEvents() {
    const searchInput = document.getElementById('searchUsersInput');
    const confirmBtn = document.getElementById('confirmShareBtn');
    const shareTypeRadios = document.querySelectorAll('input[name="shareType"]');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleShareSearch, 300));
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleShareConfirm);
    }
    
    // Event listeners para cambio de tipo de compartir
    shareTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentShareType = e.target.value;
            updateSharePreview(currentSharePost);
        });
    });
    
    // Event listeners para limpiar estado cuando se cierre el modal
    const modalElement = document.getElementById('shareModal');
    if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', () => {
            clearShareModalState();
            
            // Limpieza adicional para evitar congelamiento
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Restaurar completamente el estado del body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            document.body.style.pointerEvents = '';
        });
        
        // También limpiar cuando se cierre con escape o backdrop
        modalElement.addEventListener('hide.bs.modal', () => {
            // Limpieza inmediata
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Restaurar estado del body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            document.body.style.pointerEvents = '';
        });
    }
}

// Manejar búsqueda en el modal de compartir
async function handleShareSearch(e) {
    const query = e.target.value.trim();
    
    if (query.length >= 2) {
        try {
            const response = await fetch(`/api/search?termino=${encodeURIComponent(query)}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                const filteredUsers = data.data || [];
                renderUsersForSharing(filteredUsers);
            }
        } catch (error) {
            console.error('Error en búsqueda:', error);
        }
    } else if (query.length === 0) {
        renderUsersForSharing(availableUsers);
    }
}

// Alternar selección de usuario
function toggleUserSelection(user) {
    if (selectedUsers.has(user.id)) {
        removeUserFromSelection(user.id);
    } else {
        addUserToSelection(user);
    }
}

// Agregar usuario a la selección
function addUserToSelection(user) {
    selectedUsers.add(user.id);
    renderSelectedUsers();
    updateSelectedCount();
    updateShareButton();
    
    // Actualizar checkbox
    const checkbox = document.querySelector(`.user-checkbox[value="${user.id}"]`);
    if (checkbox) checkbox.checked = true;
}

// Remover usuario de la selección
function removeUserFromSelection(userId) {
    selectedUsers.delete(userId);
    renderSelectedUsers();
    updateSelectedCount();
    updateShareButton();
    
    // Actualizar checkbox
    const checkbox = document.querySelector(`.user-checkbox[value="${userId}"]`);
    if (checkbox) checkbox.checked = false;
}

// Renderizar usuarios seleccionados
function renderSelectedUsers() {
    const selectedUsersList = document.getElementById('selectedUsersList');
    const template = document.getElementById('selectedUserTemplate');
    
    if (!selectedUsersList || !template) return;
    
    selectedUsersList.innerHTML = '';
    
    selectedUsers.forEach(userId => {
        const user = availableUsers.find(u => u.id == userId);
        if (!user) return;
        
        const clone = template.content.cloneNode(true);
        
        const avatar = clone.querySelector('.selected-user-avatar');
        const name = clone.querySelector('.selected-user-name');
        const removeBtn = clone.querySelector('.remove-user-btn');
        
        if (avatar) avatar.src = user.avatar || '/img/default-avatar.png';
        if (name) name.textContent = `${user.nombre} ${user.apellido}`;
        if (removeBtn) {
            removeBtn.dataset.userId = user.id;
            removeBtn.addEventListener('click', () => removeUserFromSelection(user.id));
        }
        
        selectedUsersList.appendChild(clone);
    });
}

// Actualizar contador de seleccionados
function updateSelectedCount() {
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = selectedUsers.size;
    }
}

// Actualizar estado del botón de compartir
function updateShareButton() {
    const confirmBtn = document.getElementById('confirmShareBtn');
    if (confirmBtn) {
        const hasSelection = selectedUsers.size > 0;
        confirmBtn.disabled = !hasSelection;
        
        if (hasSelection) {
            const shareTypeText = currentShareType === 'image' ? 'imagen' : 'álbum';
            confirmBtn.innerHTML = `<i class="fas fa-share me-2"></i>Compartir ${shareTypeText}`;
        } else {
            confirmBtn.innerHTML = `<i class="fas fa-share me-2"></i>Compartir`;
        }
    }
}

// Manejar confirmación de compartir
async function handleShareConfirm() {
    if (!currentSharePost || selectedUsers.size === 0) return;
    
    console.log('🔍 Debug: Iniciando proceso de compartir...');
    console.log('🔍 Debug: Usuario actual:', currentUser);
    console.log('🔍 Debug: Post a compartir:', currentSharePost);
    console.log('🔍 Debug: Usuarios seleccionados:', Array.from(selectedUsers));
    console.log('🔍 Debug: Tipo de compartir:', currentShareType);
    
    const confirmBtn = document.getElementById('confirmShareBtn');
    const originalText = confirmBtn.innerHTML;
    
    try {
        // Mostrar estado de carga
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Compartiendo...';
        
        const selectedUsersArray = Array.from(selectedUsers);
        let successCount = 0;
        let errorCount = 0;
        
        console.log('🔍 Debug: Procesando', selectedUsersArray.length, 'usuarios...');
        
        // Compartir con cada usuario seleccionado
        for (const userId of selectedUsersArray) {
            try {
                const endpoint = currentShareType === 'image' 
                    ? `/api/share/image/${currentSharePost.id}`
                    : `/api/share/album/${currentSharePost.album_id}`;
                
                console.log('🔍 Debug: Llamando endpoint:', endpoint);
                console.log('🔍 Debug: Con datos:', { targetUserId: userId });
                
                const requestBody = JSON.stringify({ targetUserId: userId });
                console.log('🔍 Debug: Request body:', requestBody);
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: requestBody,
                    credentials: 'include'
                });
                
                console.log('🔍 Debug: Respuesta recibida:', response.status, response.statusText);
                
                if (response.ok) {
                    const responseData = await response.json();
                    console.log('🔍 Debug: Datos de respuesta:', responseData);
                    successCount++;
                } else {
                    const errorData = await response.json();
                    console.log('🔍 Debug: Error en respuesta:', errorData);
                    errorCount++;
                }
            } catch (error) {
                console.error('🔍 Debug: Error al compartir con usuario:', userId, error);
                errorCount++;
            }
        }
        
        console.log('🔍 Debug: Resultado final - Éxitos:', successCount, 'Errores:', errorCount);
        
        // Mostrar resultado
        if (successCount > 0) {
            const shareTypeText = currentShareType === 'image' ? 'imagen' : 'álbum';
            const message = errorCount > 0 
                ? `Compartido exitosamente con ${successCount} usuarios. ${errorCount} errores.`
                : `¡${shareTypeText} compartido exitosamente con ${successCount} usuario${successCount > 1 ? 's' : ''}!`;
            
            window.AppAPI.showToast({
                title: '¡Éxito!',
                message: message,
                type: 'success'
            });
            
            // Cerrar modal completamente
            const modalElement = document.getElementById('shareModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            
            if (modal) {
                modal.hide();
                
                // Limpiar backdrop y restaurar estado del body inmediatamente
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                
                // Restaurar scroll del body
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                
                // Forzar limpieza adicional después de un breve delay
                setTimeout(() => {
                    // Verificar si aún hay elementos del modal que limpiar
                    const remainingBackdrop = document.querySelector('.modal-backdrop');
                    if (remainingBackdrop) {
                        remainingBackdrop.remove();
                    }
                    
                    // Asegurar que el body esté completamente restaurado
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                    
                    // Habilitar interacciones
                    document.body.style.pointerEvents = '';
                }, 100);
            }
            
            // Limpiar estado del modal
            clearShareModalState();
        } else {
            throw new Error('No se pudo compartir con ningún usuario');
        }
        
    } catch (error) {
        console.error('🔍 Debug: Error general al compartir:', error);
        window.AppAPI.showToast({
            title: 'Error',
            message: error.message || 'Error al compartir',
            type: 'error'
        });
    } finally {
        // Restaurar botón
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

// Funciones de búsqueda
async function handleSearch(e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        await performSearch(query);
    }
}

async function handleSearchInput(e) {
    const query = e.target.value.trim();
    if (query.length >= 3) {
        await performSearch(query);
    } else if (query.length === 0) {
        clearSearch();
    }
}

async function performSearch(query) {
    try {
        const response = await fetch(`/api/search?termino=${encodeURIComponent(query)}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
        const data = await response.json();
            searchResults = data.data || [];
            displaySearchResults();
        } else {
            console.error('Error en búsqueda');
        }
    } catch (error) {
        console.error('Error al realizar búsqueda:', error);
    }
}

function displaySearchResults() {
    const postsFeed = document.getElementById('postsFeed');
    if (!postsFeed) return;
    
    if (searchResults.length === 0) {
        postsFeed.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No se encontraron resultados</h5>
                <p class="text-muted">Intenta con otros términos de búsqueda</p>
            </div>
        `;
        return;
    }
    
    postsFeed.innerHTML = `
        <div class="mb-3">
            <h6>Resultados de búsqueda (${searchResults.length})</h6>
            <button class="btn btn-sm btn-outline-secondary" onclick="clearSearch()">
                <i class="fas fa-times"></i> Limpiar búsqueda
            </button>
        </div>
    `;
    
    searchResults.forEach(result => {
        const resultElement = createSearchResultElement(result);
        postsFeed.appendChild(resultElement);
    });
}

function createSearchResultElement(result) {
    const div = document.createElement('div');
    div.className = 'card mb-3 search-result';
    
    // Determinar qué botón mostrar según el estado de amistad
    let actionButton = '';
    switch(result.estado_amistad) {
        case 'aceptada':
            actionButton = `
                <button class="btn btn-success btn-sm" disabled>
                    <i class="fas fa-check"></i> Ya son amigos
                </button>
            `;
            break;
        case 'pendiente':
            if (result.de_id === window.currentUser?.id) {
                actionButton = `
                    <button class="btn btn-warning btn-sm" disabled>
                        <i class="fas fa-clock"></i> Solicitud enviada
                    </button>
                `;
            } else {
                actionButton = `
                    <button class="btn btn-info btn-sm" onclick="acceptFriendRequest(${result.amistad_id})">
                        <i class="fas fa-user-check"></i> Aceptar solicitud
                    </button>
                `;
            }
            break;
        case 'rechazada':
            actionButton = `
                <button class="btn btn-secondary btn-sm" disabled>
                    <i class="fas fa-times"></i> Solicitud rechazada
                </button>
            `;
            break;
        case 'no_solicitud':
        default:
            actionButton = `
                <button class="btn btn-primary btn-sm" onclick="sendFriendRequest(${result.id})">
                    <i class="fas fa-user-plus"></i> Enviar solicitud
                </button>
            `;
            break;
    }
    
    div.innerHTML = `
        <div class="card-body">
            <div class="d-flex align-items-center">
                <img src="${result.avatar || '/img/default-avatar.png'}" alt="Avatar" class="rounded-circle me-3" width="50" height="50">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${result.nombre} ${result.apellido}</h6>
                    <p class="mb-1 text-muted">${result.tipo_artesania || 'Artesano'}</p>
                    <small class="text-muted">${result.email}</small>
                </div>
                <div>
                    ${actionButton}
                </div>
            </div>
        </div>
    `;
    
    return div;
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    searchResults = [];
    renderPosts();
}

// Función global para enviar solicitud de amistad
window.sendFriendRequest = async function(userId) {
    try {
        const response = await fetch('/api/friends/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ para_id: userId }),
            credentials: 'include'
        });
        
        if (response.ok) {
            window.AppAPI.showToast({
                title: '¡Solicitud enviada!',
                message: 'La solicitud de amistad ha sido enviada',
                type: 'success'
            });
        } else {
            const error = await response.json();
            window.AppAPI.showToast({
                title: 'Error',
                message: error.message || 'Error al enviar solicitud',
                type: 'error'
            });
        }
    } catch (error) {
        console.error('Error al enviar solicitud:', error);
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Error de conexión',
            type: 'error'
        });
    }
};

// Función global para aceptar solicitud de amistad
window.acceptFriendRequest = async function(requestId) {
    try {
        const response = await fetch(`/api/friends/accept/${requestId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            window.AppAPI.showToast({
                title: '¡Amistad aceptada!',
                message: 'Ahora son amigos',
                type: 'success'
            });
            // Recargar los resultados de búsqueda para actualizar el estado
            const searchInput = document.getElementById('searchInput');
            if (searchInput && searchInput.value.trim()) {
                performSearch(searchInput.value.trim());
            }
        } else {
            const error = await response.json();
            window.AppAPI.showToast({
                title: 'Error',
                message: error.message || 'Error al aceptar solicitud',
                type: 'error'
            });
        }
    } catch (error) {
        console.error('Error al aceptar solicitud:', error);
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Error de conexión',
            type: 'error'
        });
    }
};

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} días`;
    
    return date.toLocaleDateString('es-ES');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Función para limpiar el estado del modal de compartir
function clearShareModalState() {
    // Limpiar selecciones - mantener como Set
    selectedUsers.clear();
    currentSharePost = null;
    currentShareType = 'image';
    
    // Limpiar UI
    const usersList = document.getElementById('usersList');
    const selectedUsersList = document.getElementById('selectedUsersList');
    const searchInput = document.getElementById('searchUsersInput');
    const confirmBtn = document.getElementById('confirmShareBtn');
    
    if (usersList) usersList.innerHTML = '';
    if (selectedUsersList) selectedUsersList.innerHTML = '';
    if (searchInput) searchInput.value = '';
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-share me-2"></i>Compartir';
    }
    
    // Actualizar contador
    updateSelectedCount();
    
    // Resetear radio buttons
    const shareImageRadio = document.getElementById('shareImage');
    const shareAlbumRadio = document.getElementById('shareAlbum');
    if (shareImageRadio) shareImageRadio.checked = true;
    if (shareAlbumRadio) shareAlbumRadio.checked = false;
}

// Función de emergencia para forzar limpieza del modal
function forceModalCleanup() {
    console.log('🧹 Forzando limpieza de emergencia del modal...');
    
    // Cerrar modal si está abierto
    const modalElement = document.getElementById('shareModal');
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    }
    
    // Limpiar todos los backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // Restaurar completamente el body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.pointerEvents = '';
    
    // Limpiar estado
    clearShareModalState();
    
    console.log('✅ Limpieza de emergencia completada');
}

// Hacer la función disponible globalmente para debugging
window.forceModalCleanup = forceModalCleanup;

// Manejar parámetros de URL para mostrar contenido específico
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    const id = urlParams.get('id');
    
    if (view && id) {
        console.log(`Manejando parámetros de URL: view=${view}, id=${id}`);
        
        if (view === 'image') {
            // Mostrar imagen específica
            showSpecificImage(id);
        } else if (view === 'shared') {
            // Mostrar contenido compartido
            showSharedContent(id);
        }
    }
}

// Mostrar imagen específica
async function showSpecificImage(imageId) {
    try {
        // Buscar la imagen en los posts cargados
        const post = posts.find(p => p.id == imageId);
        
        if (post) {
            // Hacer scroll a la imagen
            setTimeout(() => {
                const postElement = document.querySelector(`[data-post-id="${post.id}"]`);
                if (postElement) {
                    postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    postElement.classList.add('highlight-post');
                    
                    // Remover el highlight después de 3 segundos
                    setTimeout(() => {
                        postElement.classList.remove('highlight-post');
                    }, 3000);
                }
            }, 1000);
        } else {
            // Si no está en los posts cargados, intentar cargarla específicamente
            await loadSpecificImage(imageId);
        }
    } catch (error) {
        console.error('Error al mostrar imagen específica:', error);
    }
}

// Cargar imagen específica si no está en el feed
async function loadSpecificImage(imageId) {
    try {
        const response = await fetch(`/api/images/${imageId}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const imageData = await response.json();
            if (imageData.success) {
                // Agregar la imagen al feed si no existe
                const existingPost = posts.find(p => p.id == imageId);
                if (!existingPost) {
                    posts.unshift(imageData.image);
                    renderPosts();
                    
                    // Hacer scroll a la imagen después de renderizar
                    setTimeout(() => {
                        const postElement = document.querySelector(`[data-post-id="${imageId}"]`);
                        if (postElement) {
                            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            postElement.classList.add('highlight-post');
                            
                            setTimeout(() => {
                                postElement.classList.remove('highlight-post');
                            }, 3000);
                        }
                    }, 500);
                }
            }
        }
    } catch (error) {
        console.error('Error al cargar imagen específica:', error);
    }
}

// Mostrar contenido compartido
async function showSharedContent(contentId) {
    try {
        // Buscar contenido compartido en los posts cargados
        const sharedPost = posts.find(p => p.id == contentId && p.compartido);
        
        if (sharedPost) {
            setTimeout(() => {
                const postElement = document.querySelector(`[data-post-id="${contentId}"]`);
                if (postElement) {
                    postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    postElement.classList.add('highlight-shared');
                    
                    setTimeout(() => {
                        postElement.classList.remove('highlight-shared');
                    }, 3000);
                }
            }, 1000);
        } else {
            // Si no está en el feed, intentar cargarla específicamente
            await loadSpecificSharedImage(contentId);
        }
    } catch (error) {
        console.error('Error al mostrar contenido compartido:', error);
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Error al cargar el contenido compartido',
            type: 'error'
        });
    }
}

// Cargar imagen compartida específica si no está en el feed
async function loadSpecificSharedImage(imageId) {
    try {
        const response = await fetch(`/api/images/${imageId}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const imageData = await response.json();
            if (imageData.success && imageData.image.compartido) {
                // Agregar la imagen al feed si no existe
                const existingPost = posts.find(p => p.id == imageId);
                if (!existingPost) {
                    posts.unshift(imageData.image);
                    renderPosts();
                    
                    // Hacer scroll a la imagen después de renderizar
                    setTimeout(() => {
                        const postElement = document.querySelector(`[data-post-id="${imageId}"]`);
                        if (postElement) {
                            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            postElement.classList.add('highlight-shared');
                            
                            setTimeout(() => {
                                postElement.classList.remove('highlight-shared');
                            }, 3000);
                        }
                    }, 500);
                }
            } else {
                // La imagen no es compartida o no existe
                window.AppAPI.showToast({
                    title: 'Contenido no encontrado',
                    message: 'El contenido compartido no está disponible en tu feed',
                    type: 'warning'
                });
            }
        } else {
            window.AppAPI.showToast({
                title: 'Contenido no encontrado',
                message: 'El contenido compartido no está disponible en tu feed',
                type: 'warning'
            });
        }
    } catch (error) {
        console.error('Error al cargar imagen compartida específica:', error);
        window.AppAPI.showToast({
            title: 'Error',
            message: 'Error al cargar el contenido compartido',
            type: 'error'
        });
    }
} 