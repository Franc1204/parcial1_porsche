import config from './config.js';

/**
 * Verifica si el usuario está autenticado mediante token JWT
 * @returns {Promise<Object|boolean>} 
 */
async function verificarAutenticacion() {
  const token = localStorage.getItem('token');
  if (!token) {
    return false;
  }
  
  try {
    const res = await fetch(config.getApiUrl('/api/usuarios/perfil'), {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    
    if (!res.ok) {
      localStorage.removeItem('token');
      return false;
    }
    
    const usuario = await res.json();
    return usuario;
  } catch (error) {
    console.error('Error al verificar autenticación:', error);
    return false;
  }
}


async function actualizarMenu() {
  const usuario = await verificarAutenticacion();
  
  const menuContainer = document.querySelector('.offcanvas-start');
  if (!menuContainer) return;
  
  const menuHeader = menuContainer.querySelector('.offcanvas-header');
  const menuBody = menuContainer.querySelector('.offcanvas-body .menu-options');
  
  if (!menuHeader || !menuBody) return;
  
  const titleContainer = menuHeader.querySelector('#offcanvasMenuLabel') || document.createElement('div');
  titleContainer.id = 'offcanvasMenuLabel';
  titleContainer.className = 'offcanvas-title';
  
  titleContainer.innerHTML = '';
  
  if (usuario && usuario.perfil) {
    const nombreCompleto = `${usuario.perfil?.nombre || ''} ${usuario.perfil?.apellido || ''}`.trim();
    
    const authItems = menuBody.querySelectorAll('.auth-item');
    authItems.forEach(item => item.remove());
    
    const myPorscheLinks = menuBody.querySelectorAll('a');
    myPorscheLinks.forEach(link => {
      if (link.textContent.trim() === 'My Porsche' || link.href.includes('myporsche.html')) {
        link.href = "perfil.html";
        link.innerHTML = `My Porsche<small class="d-block text-muted">${nombreCompleto}</small>`;
        console.log("Link actualizado a perfil.html con nombre de usuario", link);
      }
    });
    
    const logoutItem = document.createElement('li');
    logoutItem.classList.add('auth-item');
    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.classList.add('text-decoration-none');
    logoutLink.textContent = 'Cerrar Sesión';
    logoutLink.addEventListener('click', cerrarSesion);
    logoutItem.appendChild(logoutLink);
    menuBody.appendChild(logoutItem);
  } else {
    const myPorscheLinks = menuBody.querySelectorAll('a');
    myPorscheLinks.forEach(link => {
      if (link.textContent.includes('My Porsche') || link.href.includes('perfil.html')) {
        link.href = "myporsche.html";
        link.innerHTML = 'My Porsche'; 
        console.log("Link restaurado a myporsche.html", link);
      }
    });
    
    const authItems = menuBody.querySelectorAll('.auth-item');
    authItems.forEach(item => item.remove());
  }
  
  if (!menuHeader.contains(titleContainer)) {
    menuHeader.prepend(titleContainer);
  }
}

/**
 * Cierra la sesión del usuario
 * @param {Event} e 
 */
function cerrarSesion(e) {
  e.preventDefault();
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}

/**
 * Verifica si el usuario está autenticado y tiene acceso a la ruta
 * @param {boolean} requireAuth 
 * @returns {Promise<Object|boolean>} 
 */
async function protegerRuta(requireAuth = true) {
  try {
    const usuario = await verificarAutenticacion();
    return usuario;
  } catch (error) {
    console.error("Error en protegerRuta:", error);
    return false;
  }
}

// Ejecutar actualizarMenu cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', actualizarMenu);

// Exponer funciones al ámbito global para que sean accesibles desde los scripts no-módulo
window.verificarAutenticacion = verificarAutenticacion;
window.actualizarMenu = actualizarMenu;
window.cerrarSesion = cerrarSesion;
window.protegerRuta = protegerRuta;

// También exportamos las funciones para uso como módulo ES
export { verificarAutenticacion, actualizarMenu, cerrarSesion, protegerRuta }; 