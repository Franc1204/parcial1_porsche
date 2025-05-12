
// Formatear precios en formato moneda mexicana
function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(precio);
}

function mostrarAlerta(tipo, mensaje, titulo = null) {
  if (window.Swal) {
    Swal.fire({
      title: titulo || (tipo === 'error' ? 'Error' : tipo === 'success' ? 'Éxito' : 'Información'),
      text: mensaje,
      icon: tipo,
      confirmButtonText: 'Ok'
    });
  } else {
    alert(mensaje);
  }
}

async function confirmar(mensaje, titulo = 'Confirmar acción') {
  if (window.Swal) {
    const result = await Swal.fire({
      title: titulo,
      text: mensaje,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    });
    return result.isConfirmed;
  } else {
    return confirm(mensaje);
  }
}


function verificarAutenticacion() {
  const token = localStorage.getItem('token');
  return !!token;
}

// Redireccionar al usuario al login si no está autenticado
function requerirAutenticacion(redireccionURL = '/myporsche.html') {
  if (!verificarAutenticacion()) {
    const currentPage = window.location.pathname.split('/').pop();
    localStorage.setItem('redirect_after_login', currentPage);
    
    if (window.Swal) {
      Swal.fire({
        title: 'Iniciar sesión',
        text: 'Debe iniciar sesión para continuar',
        icon: 'info',
        confirmButtonText: 'Ir a iniciar sesión'
      }).then(() => {
        window.location.href = redireccionURL;
      });
    } else {
      alert('Debe iniciar sesión para continuar');
      window.location.href = redireccionURL;
    }
    return false;
  }
  return true;
}

function obtenerParametroURL(nombre) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(nombre);
}

// Cargar componente HTML
async function cargarComponente(url, contenedor) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error al cargar componente desde ${url}`);
    }
    const html = await response.text();
    document.getElementById(contenedor).innerHTML = html;
    return true;
  } catch (error) {
    console.error(`Error al cargar componente: ${error.message}`);
    return false;
  }
}

window.formatearPrecio = formatearPrecio;
window.mostrarAlerta = mostrarAlerta;
window.confirmar = confirmar;
window.verificarAutenticacion = verificarAutenticacion;
window.requerirAutenticacion = requerirAutenticacion;
window.obtenerParametroURL = obtenerParametroURL;
window.cargarComponente = cargarComponente; 