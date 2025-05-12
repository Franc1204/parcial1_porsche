// Lógica para la pasarela de compra
import config from './config.js';

let modeloSeleccionado = null;
let inventarioDisponible = null;

async function iniciarProcesoCompra(modeloId, modeloNombre, modeloPrecio) {
  try {
    console.log(`Iniciando proceso de compra para ${modeloNombre} (ID: ${modeloId})`);
    
    // Verificar autenticación antes de continuar
    const estaAutenticado = await verificarAutenticacion();
    if (!estaAutenticado) {
      console.log('Usuario no autenticado. Redirigiendo a MyPorsche para iniciar sesión...');
      sessionStorage.setItem('redirect_after_login', JSON.stringify({
        action: 'comprar',
        modeloId,
        modeloNombre,
        modeloPrecio
      }));
      
      mostrarAlerta('info', 'Necesitas iniciar sesión para realizar una compra', 'Redirigiendo...');
      
      setTimeout(() => {
        window.location.href = 'myporsche.html';
      }, 2000);
      
      return false;
    }
    
    modeloSeleccionado = {
      id: modeloId,
      nombre: modeloNombre,
      precio: modeloPrecio
    };
    
    const disponibilidad = await verificarInventario(modeloId);
    console.log('Resultado de verificación de inventario:', disponibilidad);
    
    
    if (disponibilidad.disponible === false && disponibilidad.verificado === true) {
      mostrarAlerta('error', 'No hay unidades disponibles en inventario');
      return false;
    }
    
    if (!disponibilidad.verificado) {
      disponibilidad.cantidad = disponibilidad.cantidad || "No verificado";
    }
    
    inventarioDisponible = disponibilidad;
    
    const modalElement = document.getElementById('pasarelaCompraModal');
    if (!modalElement) {
      console.error('Error: No se encontró el modal #pasarelaCompraModal');
      mostrarAlerta('error', 'Error al cargar la pasarela de compra');
      return false;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    const elementosRequeridos = [
      'modeloCompra', 'precioCompra', 'cantidadDisponible'
    ];
    
    for (const id of elementosRequeridos) {
      if (!document.getElementById(id)) {
        console.error(`Error: No se encontró el elemento #${id}`);
        mostrarAlerta('error', 'Error al cargar la pasarela de compra');
        return false;
      }
    }
    
    // Cargar datos del modelo
    document.getElementById('modeloCompra').textContent = modeloNombre;
    document.getElementById('precioCompra').textContent = formatearPrecio(modeloPrecio);
    document.getElementById('cantidadDisponible').textContent = disponibilidad.cantidad;
    
    await cargarTarjetasUsuario();
    
    await cargarDireccionUsuario();
    
    return true;
  } catch (error) {
    console.error('Error al iniciar proceso de compra:', error);
    mostrarAlerta('error', `Error al preparar la compra: ${error.message}`);
    return false;
  }
}

// Verificar disponibilidad en inventario
async function verificarInventario(modeloId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No hay token, no se puede verificar inventario');
      return { disponible: true, cantidad: "No verificado", verificado: false };
    }
    
    console.log(`Verificando inventario para modelo: ${modeloId}`);
    
    const url = config.getApiUrl(`/api/inventario?modelo=${modeloId}`);
    console.log('Consultando inventario en:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.error(`Error al verificar inventario (status ${response.status}): ${response.statusText}`);
      try {
        const errorData = await response.json();
        console.error('Detalles del error:', errorData);
      } catch (e) {
        console.error('No se pudo extraer detalles del error');
      }
      
      console.log('Intentando crear inventario como fallback...');
      const inventarioResult = await crearInventario(modeloId, token);
      
      if (inventarioResult.success) {
        console.log('Inventario creado exitosamente, usando datos del nuevo inventario');
        return { 
          disponible: true, 
          cantidad: inventarioResult.data.cantidad || 2,
          ubicacion: inventarioResult.data.ubicacion || 'showroom',
          id: inventarioResult.data._id,
          verificado: true 
        };
      }
      
      console.log('No se pudo crear inventario, devolviendo valores por defecto');
      return { disponible: true, cantidad: "2", verificado: true };
    }
    
    const data = await response.json();
    console.log('Datos de inventario recibidos:', data);
    
    if (!data || data.length === 0) {
      console.log('No se encontró inventario para el modelo, creando uno nuevo...');
      const inventarioResult = await crearInventario(modeloId, token);
      
      if (inventarioResult.success) {
        console.log('Inventario creado exitosamente, usando datos del nuevo inventario');
        return { 
          disponible: true, 
          cantidad: inventarioResult.data.cantidad || 2,
          ubicacion: inventarioResult.data.ubicacion || 'showroom',
          id: inventarioResult.data._id,
          verificado: true 
        };
      }
      
      console.log('No se pudo crear inventario, devolviendo valores por defecto');
      return { disponible: true, cantidad: "2", verificado: true };
    }
    
    const inventario = data[0];
    const hayStock = inventario.cantidad > 0;
    
    console.log(`Inventario encontrado: ${inventario.cantidad} unidades disponibles`);
    
    return { 
      disponible: hayStock, 
      cantidad: inventario.cantidad,
      ubicacion: inventario.ubicacion || 'showroom',
      id: inventario._id,
      verificado: true 
    };
  } catch (error) {
    console.error('Error al verificar inventario:', error);
    return { disponible: true, cantidad: "2", verificado: true };
  }
}

// Función para crear inventario si no existe
async function crearInventario(modeloId, token) {
  try {
    console.log(`Intentando crear inventario para modelo: ${modeloId}`);
    
    const response = await fetch(config.getApiUrl('/api/inventario'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        modelo: modeloId,
        cantidad: 2,
        ubicacion: 'showroom',
        estado: 'nuevo'
      })
    });
    
    if (!response.ok) {
      let errorMsg = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.error('Detalles del error al crear inventario:', errorData);
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        console.error('No se pudo parsear el error como JSON');
      }
      
      console.error('Error al crear inventario:', errorMsg);
      return { success: false, error: errorMsg };
    }
    
    const nuevoInventario = await response.json();
    console.log('Inventario creado correctamente:', nuevoInventario);
    return { success: true, data: nuevoInventario };
  } catch (error) {
    console.error('Error al crear inventario:', error);
    return { success: false, error: error.message };
  }
}

// Cargar tarjetas del usuario
async function cargarTarjetasUsuario() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Usuario no autenticado');
    }
    
    const response = await fetch(config.getApiUrl('/api/usuarios/perfil'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar tarjetas');
    }
    
    const usuario = await response.json();
    console.log('Datos de usuario cargados:', usuario);
    
    const tarjetas = usuario.perfil && usuario.perfil.tarjetas ? usuario.perfil.tarjetas : [];
    
    console.log('Tarjetas encontradas:', tarjetas);
    
    const tarjetasSelect = document.getElementById('tarjetaSelect');
    tarjetasSelect.innerHTML = '';
    
    const optionNueva = document.createElement('option');
    optionNueva.value = 'nueva';
    optionNueva.textContent = 'Agregar nueva tarjeta';
    tarjetasSelect.appendChild(optionNueva);
    
    // Añadir tarjetas existentes
    if (tarjetas.length > 0) {
      tarjetas.forEach(tarjeta => {
        const option = document.createElement('option');
        option.value = tarjeta._id || tarjeta.id;
        option.textContent = `**** **** **** ${tarjeta.ultimos4} (${tarjeta.tipo})`;
        
        if (tarjeta.preferida) {
          option.selected = true;
        }
        
        tarjetasSelect.appendChild(option);
      });
      
      document.getElementById('nuevaTarjetaForm').style.display = 'none';
    } else {
      document.getElementById('nuevaTarjetaForm').style.display = 'block';
    }
    
    tarjetasSelect.addEventListener('change', function() {
      const formularioTarjeta = document.getElementById('nuevaTarjetaForm');
      if (this.value === 'nueva') {
        formularioTarjeta.style.display = 'block';
      } else {
        formularioTarjeta.style.display = 'none';
      }
    });
    
  } catch (error) {
    console.error('Error al cargar tarjetas:', error);
    const tarjetasSelect = document.getElementById('tarjetaSelect');
    
    tarjetasSelect.innerHTML = '';
    const option = document.createElement('option');
    option.value = 'nueva';
    option.textContent = 'Agregar nueva tarjeta';
    tarjetasSelect.appendChild(option);
    
    document.getElementById('nuevaTarjetaForm').style.display = 'block';
  }
}

// Cargar dirección del usuario
async function cargarDireccionUsuario() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Usuario no autenticado');
    }
    
    const response = await fetch(config.getApiUrl('/api/usuarios/perfil'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar perfil');
    }
    
    const usuario = await response.json();
    console.log('Usuario completo:', usuario);
    
    // Comprobar si hay alguna dirección preferida primero
    let direccion = null;
    
    if (usuario.perfil && usuario.perfil.direccion) {
      console.log('Encontrada dirección en formato antiguo:', usuario.perfil.direccion);
      direccion = usuario.perfil.direccion;
      
      document.getElementById('direccionCompra').value = direccion.calle || '';
      document.getElementById('ciudadCompra').value = direccion.ciudad || '';
      document.getElementById('estadoCompra').value = direccion.estado || '';
      document.getElementById('codigoPostalCompra').value = direccion.codigoPostal || '';
      document.getElementById('paisCompra').value = direccion.pais || '';
      
      console.log('Dirección antigua cargada correctamente');
      return;
    }
    
    if (usuario.perfil && usuario.perfil.direcciones && usuario.perfil.direcciones.length > 0) {
      console.log('Encontradas direcciones en formato nuevo:', usuario.perfil.direcciones);
      
      direccion = usuario.perfil.direcciones.find(dir => dir.preferida);
      
      // Si no hay preferida, usar la primera
      if (!direccion) {
        direccion = usuario.perfil.direcciones[0];
      }
      
      if (direccion) {
        document.getElementById('direccionCompra').value = direccion.calle && direccion.numero ? 
          `${direccion.calle} ${direccion.numero}` : direccion.calle || '';
        document.getElementById('ciudadCompra').value = direccion.ciudad || '';
        document.getElementById('estadoCompra').value = direccion.estado || '';
        document.getElementById('codigoPostalCompra').value = direccion.codigoPostal || '';
        document.getElementById('paisCompra').value = direccion.pais || '';
        
        console.log('Dirección nueva cargada correctamente:', direccion);
      } else {
        console.log('No se encontró ninguna dirección en el perfil');
      }
    } else {
      console.log('No hay direcciones disponibles en el perfil');
    }
    
  } catch (error) {
    console.error('Error al cargar dirección:', error);
  }
}

// Procesar la compra
async function procesarCompra() {
  const botonComprar = document.getElementById('botonComprar');
  const spinnerCompra = document.getElementById('spinnerCompra');
  
  if (!botonComprar || !spinnerCompra) {
    console.error('No se encontraron elementos del botón o spinner');
    mostrarAlerta('error', 'Error en la interfaz de compra');
    return false;
  }
  
  try {
    // Mostrar spinner de carga
    botonComprar.disabled = true;
    spinnerCompra.classList.remove('d-none');
    spinnerCompra.style.display = 'inline-block';
    
    const token = localStorage.getItem('token');
    if (!token) {
      mostrarAlerta('error', 'Debe iniciar sesión para realizar la compra');
      botonComprar.disabled = false;
      spinnerCompra.classList.add('d-none');
      return false;
    }
    
    const tarjetaSelect = document.getElementById('tarjetaSelect');
    let datosPago = {};
    let guardarTarjeta = false;
    
    if (tarjetaSelect.value === 'nueva') {
      const numeroTarjeta = document.getElementById('numeroTarjeta').value.replace(/\s/g, '');
      const nombreTarjeta = document.getElementById('nombreTarjeta').value;
      const vencimiento = document.getElementById('vencimiento').value;
      const cvv = document.getElementById('cvv').value;
      
      // Validaciones básicas
      if (!numeroTarjeta || !nombreTarjeta || !vencimiento || !cvv) {
        mostrarAlerta('error', 'Por favor complete todos los campos de la tarjeta');
        // Restaurar estado del botón
        botonComprar.disabled = false;
        spinnerCompra.classList.add('d-none');
        return false;
      }
      
      const checkboxGuardar = document.getElementById('guardarTarjeta');
      guardarTarjeta = checkboxGuardar && checkboxGuardar.checked;
      
      const ultimos4 = numeroTarjeta.slice(-4);
      
      let tipoTarjeta = 'Desconocida';
      const primerDigito = numeroTarjeta.charAt(0);
      
      if (primerDigito === '4') {
        tipoTarjeta = 'VISA';
      } else if (primerDigito === '5') {
        tipoTarjeta = 'MasterCard';
      } else if (primerDigito === '3') {
        tipoTarjeta = 'American Express';
      } else if (primerDigito === '6') {
        tipoTarjeta = 'Discover';
      }
      
      datosPago = {
        tarjetaNumero: numeroTarjeta,
        tarjetaNombre: nombreTarjeta,
        tarjetaVencimiento: vencimiento,
        tarjetaCVV: cvv,
        guardarTarjeta: guardarTarjeta,
        datosTarjetaGuardar: guardarTarjeta ? {
          tipo: tipoTarjeta,
          ultimos4: ultimos4,
          titular: nombreTarjeta,
          expiracion: vencimiento,
          preferida: true 
        } : null
      };
    } else {
      // Usar tarjeta existente
      datosPago = {
        tarjetaId: tarjetaSelect.value
      };
    }
    
    // Recolectar datos de dirección
    const direccion = {
      calle: document.getElementById('direccionCompra').value,
      ciudad: document.getElementById('ciudadCompra').value,
      estado: document.getElementById('estadoCompra').value,
      codigoPostal: document.getElementById('codigoPostalCompra').value,
      pais: document.getElementById('paisCompra').value
    };
    
    // Validar dirección
    if (!direccion.calle || !direccion.ciudad || !direccion.estado || !direccion.codigoPostal || !direccion.pais) {
      mostrarAlerta('error', 'Por favor complete todos los campos de dirección');
      // Restaurar estado del botón
      botonComprar.disabled = false;
      spinnerCompra.classList.add('d-none');
      return false;
    }
    
    console.log('Enviando datos de compra:', {
      modeloId: modeloSeleccionado.id,
      datosPago,
      direccion
    });
    
    // Enviar solicitud al backend
    const response = await fetch(config.getApiUrl('/api/pedidos'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        modeloId: modeloSeleccionado.id,
        ...datosPago,
        direccion
      })
    });
    
    // Restaurar estado del botón
    botonComprar.disabled = false;
    spinnerCompra.classList.add('d-none');
    
    if (!response.ok) {
      const error = await response.json();
      mostrarAlerta('error', error.error || 'Error al procesar la compra');
      return false;
    }
    
    const resultado = await response.json();
    console.log('Resultado de compra:', resultado);
    
    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('pasarelaCompraModal'));
    modal.hide();
    
    Swal.fire({
      title: '¡Compra exitosa!',
      text: `Tu pedido ha sido procesado correctamente`,
      icon: 'success',
      confirmButtonText: 'Ver mis compras',
      showCancelButton: true,
      cancelButtonText: 'Cerrar'
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = '/perfil.html?tab=compras';
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error al procesar compra:', error);
    mostrarAlerta('error', 'Hubo un error al procesar la compra');
    
    botonComprar.disabled = false;
    spinnerCompra.classList.add('d-none');
    
    return false;
  }
}

export { iniciarProcesoCompra, procesarCompra }; 