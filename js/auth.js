// ============================================
// MÓDULO AUTH - AUTENTICACIÓN LIBROS BOSCH
// ============================================

const clienteAuth = supabase.createClient(
  CONFIG.SUPABASE_URL.replace('/rest/v1', ''),
  CONFIG.SUPABASE_ANON_KEY
);

let sesionActual = null;
let rolActual = null;

// ============================================
// LOGIN
// ============================================
async function iniciarSesion() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  errorEl.style.display = 'none';

  if (!email || !password) {
    errorEl.textContent = 'Introduce email y contraseña.';
    errorEl.style.display = 'block';
    return;
  }

  const { data, error } = await clienteAuth.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = 'Email o contraseña incorrectos.';
    errorEl.style.display = 'block';
    return;
  }

  sesionActual = data.session;
  rolActual = data.user.app_metadata?.rol || 'empleado';

  // Actualizar headers globales con el JWT
  API_HEADERS['Authorization'] = `Bearer ${sesionActual.access_token}`;

  // Mostrar la aplicación
  document.getElementById('panelLogin').style.display = 'none';
  document.getElementById('appContenido').style.display = 'block';

  // Aplicar restricciones según rol
  aplicarRol();

  // Cargar inventario
  cargarInventario();
  limpiarFormulario();
}

// ============================================
// ROL
// ============================================
function aplicarRol() {
  if (rolActual === 'empleado') {
    document.querySelectorAll('.solo-admin').forEach(el => el.style.display = 'none');
  }
}

function esAdmin() {
  return rolActual === 'admin';
}

// ============================================
// CERRAR SESIÓN
// ============================================
async function cerrarSesion() {
  await clienteAuth.auth.signOut();
  sesionActual = null;
  rolActual = null;
  document.getElementById('panelLogin').style.display = 'flex';
  document.getElementById('appContenido').style.display = 'none';
}
