/**
 * js/model/AuthService.js
 * Maneja login JWT, persistencia de sesión y recuperación de contraseña.
 */
const AuthService = (() => {
  const TOKEN_KEY = 'rp_auth_token';
  const USER_KEY = 'rp_auth_user';

  function url(path) {
    return AppState.backendUrl + path;
  }

  function getToken() {
    return AppState.authToken || localStorage.getItem(TOKEN_KEY) || '';
  }

  function setSession(token, user) {
    AppState.setAuthSession(token, user);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || null));
  }

  function clearSession() {
    AppState.clearAuthSession();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function restoreSession() {
    const token = getToken();
    if (!token) {
      clearSession();
      return false;
    }

    try {
      const response = await fetch(url('/api/auth/me'), {
        headers: {
          Authorization: 'Bearer ' + token
        }
      });

      if (!response.ok) {
        clearSession();
        return false;
      }

      const data = await response.json();
      setSession(token, data.user || null);
      return true;
    } catch {
      clearSession();
      return false;
    }
  }

  async function authenticatedFetch(path, options = {}) {
    const token = getToken();
    const headers = {
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }

    const response = await fetch(url(path), {
      ...options,
      headers
    });

    if (response.status === 401) {
      clearSession();
      window.dispatchEvent(new CustomEvent('auth:required'));
    }

    return response;
  }

  async function login(email, password) {
    const response = await fetch(url('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo iniciar sesión');
    }

    setSession(data.token, data.user);
    return data;
  }

  async function forgotPassword(email) {
    const response = await fetch(url('/api/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo generar el restablecimiento');
    }

    return data;
  }

  async function resetPassword(token, newPassword) {
    const response = await fetch(url('/api/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo restablecer la contraseña');
    }

    return data;
  }

  return {
    getToken,
    setSession,
    clearSession,
    restoreSession,
    authenticatedFetch,
    login,
    forgotPassword,
    resetPassword
  };
})();