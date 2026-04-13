/**
 * js/model/ApiClient.js
 * Cliente HTTP centralizado con manejo uniforme de errores y 401 global.
 */
const ApiClient = (() => {
  class ApiError extends Error {
    constructor(message, status, data = null) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  }

  class AuthSessionError extends ApiError {
    constructor(message = 'Tu sesion expiro. Inicia sesion nuevamente.', data = null, status = 401) {
      super(message, status, data);
      this.name = 'AuthSessionError';
    }
  }

  function buildUrl(path) {
    return AppConfig.apiUrl + path;
  }

  async function parseResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  function createHeaders(headers = {}, includeJson = false) {
    const finalHeaders = { ...headers };
    if (includeJson && !finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }
    return finalHeaders;
  }

  async function request(path, options = {}, config = {}) {
    const {
      requiresAuth = true,
      includeJsonHeader = false,
      sessionExpiredMessage = 'Tu sesion expiro. Inicia sesion nuevamente.',
    } = config;

    const headers = createHeaders(options.headers, includeJsonHeader);
    const token = requiresAuth ? AuthService.getToken() : '';

    if (requiresAuth && token) {
      headers.Authorization = 'Bearer ' + token;
    }

    const response = await fetch(buildUrl(path), {
      ...options,
      headers,
    });

    const data = await parseResponse(response);

    if (response.status === 401 || response.status === 403) {
      AuthService.clearSession();
      window.dispatchEvent(new CustomEvent('auth:required', {
        detail: {
          reason: 'expired',
          message: sessionExpiredMessage,
        },
      }));
      throw new AuthSessionError(sessionExpiredMessage, data, response.status);
    }

    if (!response.ok) {
      const message = data?.error || data?.message || 'Ocurrio un error al procesar la solicitud.';
      throw new ApiError(message, response.status, data);
    }

    return { response, data };
  }

  async function json(path, options = {}, config = {}) {
    const result = await request(path, options, config);
    return result.data;
  }

  return {
    ApiError,
    AuthSessionError,
    buildUrl,
    request,
    json,
  };
})();
