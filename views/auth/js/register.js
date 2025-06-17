document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const messageContainer = document.getElementById('messageContainer');

    // Función para mostrar/ocultar contraseña
    window.togglePassword = function(inputId) {
        const input = document.getElementById(inputId);
        const icon = input.nextElementSibling.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    };

    // Función para validar la contraseña
    function validatePassword(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[@$!%*?&]/.test(password)
        };

        return requirements;
    }

    // Función para actualizar los indicadores de requisitos
    function updatePasswordRequirements(password) {
        const requirements = validatePassword(password);
        const requirementsList = document.getElementById('passwordRequirements');
        
        if (requirementsList) {
            const items = requirementsList.getElementsByTagName('li');
            
            // Actualizar cada requisito
            items[0].className = requirements.length ? 'valid' : 'invalid';
            items[0].querySelector('i').className = `fas fa-${requirements.length ? 'check' : 'times'}`;
            
            items[1].className = requirements.uppercase ? 'valid' : 'invalid';
            items[1].querySelector('i').className = `fas fa-${requirements.uppercase ? 'check' : 'times'}`;
            
            items[2].className = requirements.lowercase ? 'valid' : 'invalid';
            items[2].querySelector('i').className = `fas fa-${requirements.lowercase ? 'check' : 'times'}`;
            
            items[3].className = requirements.number ? 'valid' : 'invalid';
            items[3].querySelector('i').className = `fas fa-${requirements.number ? 'check' : 'times'}`;
            
            items[4].className = requirements.special ? 'valid' : 'invalid';
            items[4].querySelector('i').className = `fas fa-${requirements.special ? 'check' : 'times'}`;
        }
    }

    // Event listener para validación en tiempo real de la contraseña
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            updatePasswordRequirements(e.target.value);
        });
    }

    // Event listener para validación de confirmación de contraseña
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', (e) => {
            const password = passwordInput.value;
            const confirmPassword = e.target.value;

            if (confirmPassword && password !== confirmPassword) {
                confirmPasswordInput.setCustomValidity('Las contraseñas no coinciden');
            } else {
                confirmPasswordInput.setCustomValidity('');
            }
        });
    }

    // Función para mostrar mensajes flotantes
    function showFloatingMessage(message, type = 'error') {
        const messageElement = document.createElement('div');
        messageElement.className = `floating-message ${type}`;
        messageElement.innerHTML = `
            <div class="message-content">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="close-message">&times;</button>
        `;

        messageContainer.appendChild(messageElement);

        // Animación de entrada
        setTimeout(() => messageElement.classList.add('show'), 100);

        // Botón para cerrar mensaje
        messageElement.querySelector('.close-message').addEventListener('click', () => {
            messageElement.classList.remove('show');
            setTimeout(() => messageElement.remove(), 300);
        });

        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.classList.remove('show');
                setTimeout(() => messageElement.remove(), 300);
            }
        }, 5000);
    }

    // Función para mostrar múltiples mensajes de error
    function showValidationErrors(errors) {
        if (Array.isArray(errors)) {
            errors.forEach(error => showFloatingMessage(error));
        } else {
            showFloatingMessage(errors);
        }
    }

    // Manejo del envío del formulario
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validar contraseña
            const password = passwordInput.value;
            const requirements = validatePassword(password);
            const allRequirementsMet = Object.values(requirements).every(req => req);

            if (!allRequirementsMet) {
                showFloatingMessage('La contraseña no cumple con todos los requisitos');
                return;
            }

            // Validar coincidencia de contraseñas
            if (password !== confirmPasswordInput.value) {
                showFloatingMessage('Las contraseñas no coinciden');
                return;
            }

            // Crear FormData para enviar archivos
            const formData = new FormData(form);

            // Mostrar loader
            const submitButton = form.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
            submitButton.disabled = true;

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (!response.ok) {
                    if (data.errors && Array.isArray(data.errors)) {
                        showValidationErrors(data.errors);
                    } else {
                        showFloatingMessage(data.message || 'Error al registrar usuario');
                    }
                    return;
                }

                // Mostrar mensaje de éxito
                showFloatingMessage('Usuario registrado exitosamente', 'success');

                // Redirigir al feed después de 2 segundos
                setTimeout(() => {
                    window.location.href = '/feed';
                }, 2000);

            } catch (error) {
                showFloatingMessage('Error al conectar con el servidor');
            } finally {
                // Restaurar botón
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            }
        });
    }
}); 