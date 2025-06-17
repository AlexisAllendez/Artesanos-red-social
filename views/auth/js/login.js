document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorContainer = document.getElementById('errorContainer');

    // Verificar si ya está autenticado
    checkAuthStatus();

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpiar mensajes de error previos
        errorContainer.innerHTML = '';
        
        const formData = new FormData(loginForm);
        const data = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // Mostrar mensaje de éxito
                showNotification('Inicio de sesión exitoso', 'success');
                
                // Verificar autenticación antes de redirigir
                try {
                    const authCheck = await fetch('/api/auth/check', {
                        method: 'GET',
                        credentials: 'include'
                    });

                    if (authCheck.ok) {
                        // Redirigir al feed después de un breve delay
                        setTimeout(() => {
                            window.location.href = '/feed';
                        }, 1000);
                    } else {
                        showNotification('Error al verificar la autenticación', 'error');
                    }
                } catch (error) {
                    console.error('Error al verificar autenticación:', error);
                    showNotification('Error al verificar la autenticación', 'error');
                }
            } else {
                // Mostrar mensaje de error
                showNotification(result.message || 'Error al iniciar sesión', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error al conectar con el servidor', 'error');
        }
    });

    // Función para verificar el estado de autenticación
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/check', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                // Si ya está autenticado, redirigir al feed
                window.location.href = '/feed';
            }
        } catch (error) {
            console.error('Error al verificar autenticación:', error);
        }
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        errorContainer.appendChild(notification);
        
        // Remover la notificación después de 3 segundos
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}); 