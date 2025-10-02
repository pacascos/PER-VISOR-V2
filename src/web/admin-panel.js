/**
 * Admin Panel JavaScript
 * Panel de administración para gestión de usuarios
 */

class AdminPanel {
    constructor() {
        // Usar configuración de entorno automática
        this.API_BASE = window.API_BASE !== undefined ? window.API_BASE : '/api'; // Fallback por seguridad
        this.token = localStorage.getItem('authToken');
        this.currentUser = null;
        
        this.init();
    }

    async init() {
        try {
            // Verificar autenticación
            if (!this.token) {
                this.showError('No estás autenticado. Por favor, inicia sesión.');
                setTimeout(() => {
                    window.location.href = 'exam-system.html';
                }, 3000);
                return;
            }

            // Verificar que el usuario es administrador
            await this.verifyAdminRole();
            
            // Cargar datos
            await this.loadAdminStats();
            await this.loadUsers();
            
        } catch (error) {
            console.error('Error inicializando panel de administración:', error);
            this.showError('Error cargando el panel de administración: ' + error.message);
        }
    }

    async verifyAdminRole() {
        try {
            const response = await fetch(`${this.API_BASE}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error verificando autenticación');
            }

            const data = await response.json();
            this.currentUser = data.user;
            
            // Verificar rol de administrador (esto se hace en el backend)
            // Si llegamos aquí, el usuario es administrador
            
        } catch (error) {
            console.error('Error verificando rol de administrador:', error);
            this.showError('No tienes permisos de administrador.');
            setTimeout(() => {
                window.location.href = 'exam-system.html';
            }, 3000);
            throw error;
        }
    }

    async loadAdminStats() {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error cargando estadísticas');
            }

            const data = await response.json();
            this.renderStats(data.stats);
            
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            this.showError('Error cargando estadísticas del sistema');
        }
    }

    renderStats(stats) {
        document.getElementById('totalUsers').textContent = stats.total_users || 0;
        document.getElementById('activeUsers').textContent = stats.active_users || 0;
        document.getElementById('totalExams').textContent = stats.total_exams || 0;
        document.getElementById('passedExams').textContent = stats.passed_exams || 0;
    }

    async loadUsers() {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error cargando usuarios');
            }

            const data = await response.json();
            this.renderUsers(data.users);
            
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            this.showError('Error cargando lista de usuarios');
        }
    }

    renderUsers(users) {
        const container = document.getElementById('usersContainer');
        
        if (users.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No hay usuarios registrados</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <div class="users-table">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Fecha Registro</th>
                            <th>Exámenes</th>
                            <th>Último Acceso</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => this.renderUserRow(user)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    renderUserRow(user) {
        const roleClass = `role-${user.role}`;
        const statusClass = user.is_active ? 'status-active' : 'status-inactive';
        const statusText = user.is_active ? 'Activo' : 'Inactivo';
        
        const lastLogin = user.last_login 
            ? new Date(user.last_login).toLocaleDateString('es-ES')
            : 'Nunca';
        
        const registrationDate = user.registration_date 
            ? new Date(user.registration_date).toLocaleDateString('es-ES')
            : 'N/A';
        
        const examRate = user.total_exams > 0 
            ? `${user.passed_exams}/${user.total_exams} (${Math.round((user.passed_exams / user.total_exams) * 100)}%)`
            : '0/0 (0%)';

        return `
            <tr>
                <td>
                    <strong>${user.username}</strong>
                    <br>
                    <small class="text-muted">ID: ${user.id.substring(0, 8)}...</small>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="role-badge ${roleClass}">
                        ${this.getRoleDisplayName(user.role)}
                    </span>
                </td>
                <td>
                    <span class="${statusClass}">
                        <i class="fas fa-circle"></i> ${statusText}
                    </span>
                </td>
                <td>
                    <small>${registrationDate}</small>
                </td>
                <td>
                    <small>${examRate}</small>
                </td>
                <td>
                    <small>${lastLogin}</small>
                </td>
                <td>
                    <button class="btn btn-action btn-edit" onclick="adminPanel.editUser('${user.id}')" title="Editar usuario">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${user.id !== this.currentUser?.id ? `
                        <button class="btn btn-action btn-delete" onclick="adminPanel.deleteUser('${user.id}', '${user.username}')" title="Eliminar usuario">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'admin': 'Admin',
            'editor': 'Editor',
            'viewer': 'Viewer'
        };
        return roleNames[role] || role;
    }

    showCreateUserModal() {
        const modal = new bootstrap.Modal(document.getElementById('createUserModal'));
        modal.show();
    }

    async createUser() {
        const form = document.getElementById('createUserForm');
        const formData = new FormData(form);
        
        const userData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            role: document.getElementById('role').value
        };

        // Validaciones básicas
        if (!userData.username || !userData.email || !userData.password) {
            this.showError('Por favor, completa todos los campos requeridos.');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/api/admin/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error creando usuario');
            }

            // Cerrar modal y recargar usuarios
            const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
            modal.hide();
            
            form.reset();
            
            // Mostrar éxito y recargar
            this.showSuccess('Usuario creado exitosamente');
            await this.loadUsers();
            await this.loadAdminStats();

        } catch (error) {
            console.error('Error creando usuario:', error);
            this.showError('Error creando usuario: ' + error.message);
        }
    }

    async editUser(userId) {
        try {
            // Obtener datos del usuario
            const usersResponse = await fetch(`${this.API_BASE}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!usersResponse.ok) {
                throw new Error('Error obteniendo datos del usuario');
            }

            const usersData = await usersResponse.json();
            const user = usersData.users.find(u => u.id === userId);

            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            // Rellenar formulario de edición
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editUsername').value = user.username;
            document.getElementById('editEmail').value = user.email;
            document.getElementById('editRole').value = user.role;
            document.getElementById('editIsActive').checked = user.is_active;
            document.getElementById('editPassword').value = '';

            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();

        } catch (error) {
            console.error('Error editando usuario:', error);
            this.showError('Error cargando datos del usuario: ' + error.message);
        }
    }

    async updateUser() {
        const userId = document.getElementById('editUserId').value;
        const userData = {
            username: document.getElementById('editUsername').value,
            email: document.getElementById('editEmail').value,
            role: document.getElementById('editRole').value,
            is_active: document.getElementById('editIsActive').checked
        };

        const password = document.getElementById('editPassword').value;
        if (password) {
            userData.password = password;
        }

        // Validaciones básicas
        if (!userData.username || !userData.email) {
            this.showError('Por favor, completa todos los campos requeridos.');
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error actualizando usuario');
            }

            // Cerrar modal y recargar usuarios
            const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
            modal.hide();
            
            // Mostrar éxito y recargar
            this.showSuccess('Usuario actualizado exitosamente');
            await this.loadUsers();
            await this.loadAdminStats();

        } catch (error) {
            console.error('Error actualizando usuario:', error);
            this.showError('Error actualizando usuario: ' + error.message);
        }
    }

    async deleteUser(userId, username) {
        if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${username}"?\n\nEsta acción no se puede deshacer y eliminará todos sus datos.`)) {
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error eliminando usuario');
            }

            // Mostrar éxito y recargar
            this.showSuccess('Usuario eliminado exitosamente');
            await this.loadUsers();
            await this.loadAdminStats();

        } catch (error) {
            console.error('Error eliminando usuario:', error);
            this.showError('Error eliminando usuario: ' + error.message);
        }
    }

    showError(message) {
        const container = document.getElementById('usersContainer');
        const errorHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i> ${message}
            </div>
        `;
        container.innerHTML = errorHTML;
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            if (container.innerHTML.includes('error')) {
                container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Recargando...</div>';
                this.loadUsers();
            }
        }, 5000);
    }

    showSuccess(message) {
        // Crear toast de éxito
        const toastHTML = `
            <div class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-check-circle"></i> ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        // Crear contenedor de toast si no existe
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '10000';
            document.body.appendChild(toastContainer);
        }

        // Añadir toast
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        // Mostrar toast
        const toastElement = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        // Limpiar después de que se oculte
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
}

// Funciones globales para los botones
function showCreateUserModal() {
    if (window.adminPanel) {
        window.adminPanel.showCreateUserModal();
    }
}

function createUser() {
    if (window.adminPanel) {
        window.adminPanel.createUser();
    }
}

function updateUser() {
    if (window.adminPanel) {
        window.adminPanel.updateUser();
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.adminPanel = new AdminPanel();
});
