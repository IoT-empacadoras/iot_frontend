/**
 * js/controller/AuthController.js
 * Gestiona login, recuperación y arranque autenticado de la app.
 */
const AuthController = (() => {
  let eventsBound = false;

  function showMessage(message, type = '') {
    const el = document.getElementById('auth-message');
    el.textContent = message || '';
    el.className = 'auth-message' + (type ? ' ' + type : '');
  }

  function setLoginLoading(isLoading) {
    const button = document.getElementById('login-submit');
    const email = document.getElementById('login-email');
    const password = document.getElementById('login-password');

    if (button) {
      button.disabled = isLoading;
      button.textContent = isLoading ? 'Ingresando...' : 'Ingresar';
    }

    if (email) email.disabled = isLoading;
    if (password) password.disabled = isLoading;
  }

  function showAuthShell(message = '', type = '') {
    document.getElementById('auth-shell').classList.remove('auth-hidden');
    document.body.classList.add('auth-locked');
    showMessage(message, type);
  }

  function hideAuthShell() {
    document.getElementById('auth-shell').classList.add('auth-hidden');
    document.body.classList.remove('auth-locked');
    showMessage('');
    setLoginLoading(false);
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      setLoginLoading(true);
      showMessage('Validando credenciales...', '');
      await AuthService.login(email, password);
      hideAuthShell();
      await AppController.enterPrivateApp();
    } catch (error) {
      const message = [401, 403].includes(error.status)
        ? 'Credenciales invalidas'
        : (error.message || 'No fue posible iniciar sesion.');
      showMessage(message, 'err');
    } finally {
      setLoginLoading(false);
    }
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    document.getElementById('login-form').addEventListener('submit', handleLogin);

    window.addEventListener('auth:required', async (event) => {
      await AppController.leavePrivateApp();
      showAuthShell(
        event.detail?.message || 'Necesitas iniciar sesion para continuar.',
        event.detail?.reason === 'expired' ? 'err' : ''
      );
    });
  }

  async function init() {
    bindEvents();
    showAuthShell('Recuperando sesion...', '');
    setLoginLoading(true);

    const hasSession = await AuthService.restoreSession();
    if (hasSession) {
      hideAuthShell();
      await AppController.enterPrivateApp();
      return;
    }

    setLoginLoading(false);
    showAuthShell('Inicia sesion para acceder al monitor.', '');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => AuthController.init());
