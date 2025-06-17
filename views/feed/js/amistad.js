document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const searchResultsModal = new bootstrap.Modal(document.getElementById('searchResultsModal'));
    const searchResultsList = document.getElementById('searchResultsList');
    const searchResultTemplate = document.getElementById('searchResultTemplate');

    // Manejar búsqueda de usuarios
    searchForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const termino = searchInput.value.trim();
        
        if (termino.length < 2) {
            Swal.fire({
                title: 'Búsqueda inválida',
                text: 'Por favor ingrese al menos 2 caracteres para buscar',
                icon: 'info',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        try {
            const response = await fetch(`/api/amistad/buscar?termino=${encodeURIComponent(termino)}`);
            const data = await response.json();

            if (data.success) {
                mostrarResultadosBusqueda(data.data);
                searchResultsModal.show();
            } else {
                Swal.fire({
                    title: 'Error',
                    text: data.message || 'Error al buscar usuarios',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Error al realizar la búsqueda',
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
        }
    });

    // Mostrar resultados de búsqueda
    function mostrarResultadosBusqueda(usuarios) {
        searchResultsList.innerHTML = '';
        
        if (usuarios.length === 0) {
            searchResultsList.innerHTML = `
                <div class="list-group-item text-center text-muted">
                    No se encontraron usuarios
                </div>
            `;
            return;
        }

        usuarios.forEach(usuario => {
            const resultElement = searchResultTemplate.content.cloneNode(true);
            
            // Configurar avatar
            const avatar = resultElement.querySelector('.search-result-avatar');
            avatar.src = usuario.avatar || '/img/default-avatar.png';
            avatar.alt = `${usuario.nombre} ${usuario.apellido}`;

            // Configurar nombre y tipo de artesanía
            resultElement.querySelector('.search-result-name').textContent = 
                `${usuario.nombre} ${usuario.apellido}`;
            resultElement.querySelector('.search-result-type').textContent = 
                usuario.tipo_artesania || 'No especificado';

            // Configurar botón de agregar
            const addButton = resultElement.querySelector('.add-friend-btn');
            addButton.dataset.usuarioId = usuario.id;

            // Cambiar estado del botón según el estado de la amistad
            switch (usuario.estado_amistad) {
                case 'pendiente':
                    addButton.disabled = true;
                    addButton.innerHTML = '<i class="fas fa-clock"></i> Pendiente';
                    addButton.classList.remove('btn-primary');
                    addButton.classList.add('btn-secondary');
                    break;
                case 'aceptada':
                    addButton.disabled = true;
                    addButton.innerHTML = '<i class="fas fa-check"></i> Amigos';
                    addButton.classList.remove('btn-primary');
                    addButton.classList.add('btn-success');
                    break;
                case 'rechazada':
                    addButton.disabled = false;
                    addButton.innerHTML = '<i class="fas fa-user-plus"></i> Enviar solicitud';
                    addButton.onclick = () => enviarSolicitudAmistad(usuario.id);
                    break;
                default:
                    addButton.disabled = false;
                    addButton.innerHTML = '<i class="fas fa-user-plus"></i> Agregar';
                    addButton.onclick = () => enviarSolicitudAmistad(usuario.id);
            }

            searchResultsList.appendChild(resultElement);
        });
    }

    // Enviar solicitud de amistad
    async function enviarSolicitudAmistad(usuarioId) {
        const boton = document.querySelector(`button[data-usuario-id="${usuarioId}"]`);
        if (boton) {
            boton.disabled = true;
            boton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        }

        try {
            const response = await fetch('/api/amistad/solicitud', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ para_id: usuarioId })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 400 && data.code === 'REQUEST_EXISTS') {
                    Swal.fire({
                        title: 'Solicitud existente',
                        text: data.error,
                        icon: 'info',
                        confirmButtonText: 'Entendido'
                    });
                } else {
                    throw new Error(data.error || 'Error al enviar solicitud');
                }
                if (boton) {
                    boton.disabled = false;
                    boton.innerHTML = '<i class="fas fa-user-plus"></i> Agregar';
                }
                return;
            }

            // Actualizar el botón en la interfaz
            if (boton) {
                boton.disabled = true;
                boton.innerHTML = '<i class="fas fa-clock"></i> Pendiente';
                boton.classList.remove('btn-primary');
                boton.classList.add('btn-secondary');
            }

            // Mostrar mensaje de éxito
            Swal.fire({
                title: '¡Solicitud enviada!',
                text: 'La solicitud de amistad ha sido enviada correctamente',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });

            // Recargar la lista de solicitudes pendientes
            cargarSolicitudesPendientes();

        } catch (error) {
            if (boton) {
                boton.disabled = false;
                boton.innerHTML = '<i class="fas fa-user-plus"></i> Agregar';
            }
            Swal.fire({
                title: 'Error',
                text: error.message || 'Error al enviar la solicitud de amistad',
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
        }
    }

    // Manejar solicitudes pendientes
    async function cargarSolicitudesPendientes() {
        try {
            const response = await fetch('/api/amistad/solicitudes-pendientes');
            const data = await response.json();

            if (data.success) {
                actualizarContadorNotificaciones(data.data.length);
            }
        } catch (error) {
            // Silenciar error en la carga de notificaciones
        }
    }

    // Actualizar contador de notificaciones
    function actualizarContadorNotificaciones(cantidad) {
        const notificacionIcon = document.querySelector('.nav-link[href="/notifications"]');
        if (notificacionIcon) {
            let badge = notificacionIcon.querySelector('.badge');
            if (cantidad > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'badge bg-danger ms-1';
                    notificacionIcon.appendChild(badge);
                }
                badge.textContent = cantidad;
            } else if (badge) {
                badge.remove();
            }
        }
    }

    // Cargar solicitudes pendientes al iniciar
    cargarSolicitudesPendientes();

    // Actualizar solicitudes pendientes cada minuto
    setInterval(cargarSolicitudesPendientes, 60000);
}); 