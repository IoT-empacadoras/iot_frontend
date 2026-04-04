/**
 * js/controller/AuthController.js
 * Gestiona login, recuperación y arranque autenticado de la app.
 */
const AuthController = (() => {
  function showMessage(message, type = '') {
    const el = document.getElementById('auth-message');
    el.textContent = message || '';
    el.className = 'auth-message' + (type ? ' ' + type : '');
  }

  function setVisibleForm(formId, preserveMessage = false) {
    ['login-form', 'forgot-password-form', 'reset-password-form'].forEach((id) => {
      const form = document.getElementById(id);
      if (!form) return;
      form.classList.toggle('auth-hidden', id !== formId);
    });
    if (!preserveMessage) {
      showMessage('');
    }
  }

  function showAuthShell() {
    document.getElementById('auth-shell').classList.remove('auth-hidden');
  }

  function hideAuthShell() {
    document.getElementById('auth-shell').classList.add('auth-hidden');
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      await AuthService.login(email, password);
      hideAuthShell();
      AppController.init();
    } catch (error) {
      showMessage(error.message, 'err');
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();

    try {
      const result = await AuthService.forgotPassword(email);
      showMessage(result.message, 'ok');

      if (result.resetToken) {
        document.getElementById('reset-token').value = result.resetToken;
      }

      setVisibleForm('reset-password-form', true);
    } catch (error) {
      showMessage(error.message, 'err');
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    const token = document.getElementById('reset-token').value.trim();
    const newPassword = document.getElementById('reset-password').value;

    try {
      const result = await AuthService.resetPassword(token, newPassword);
      setVisibleForm('login-form', true);
      showMessage(result.message, 'ok');
    } catch (error) {
      showMessage(error.message, 'err');
    }
  }

  function bindEvents() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('forgot-password-form').addEventListener('submit', handleForgotPassword);
    document.getElementById('reset-password-form').addEventListener('submit', handleResetPassword);

    document.getElementById('show-forgot-password').addEventListener('click', () => setVisibleForm('forgot-password-form'));
    document.getElementById('show-reset-password').addEventListener('click', () => setVisibleForm('reset-password-form'));
    document.getElementById('back-to-login-from-forgot').addEventListener('click', () => setVisibleForm('login-form'));
    document.getElementById('back-to-login-from-reset').addEventListener('click', () => setVisibleForm('login-form'));

    window.addEventListener('auth:required', () => {
      showAuthShell();
      setVisibleForm('login-form');
    });
  }

  async function init() {
    bindEvents();

    const hasSession = await AuthService.restoreSession();
    if (hasSession) {
      hideAuthShell();
      AppController.init();
      return;
    }

    showAuthShell();
    setVisibleForm('login-form');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => AuthController.init());