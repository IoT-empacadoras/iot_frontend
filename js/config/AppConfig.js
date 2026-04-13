/**
 * js/config/AppConfig.js
 * Configuracion central del frontend para distintos entornos.
 */
const AppConfig = (() => {
  const DEFAULT_API_URL = 'https://iot-backend-9l8s.onrender.com';

  function normalizeUrl(value) {
    return (value || '').trim().replace(/\/+$/, '');
  }

  function resolveApiUrl() {
    const runtimeConfig = window.__APP_CONFIG__ || {};
    const metaApiUrl = document.querySelector('meta[name="api-base-url"]')?.content || '';

    return normalizeUrl(
      runtimeConfig.apiUrl ||
      window.VITE_API_URL ||
      metaApiUrl ||
      DEFAULT_API_URL
    );
  }

  return {
    apiUrl: resolveApiUrl(),
  };
})();
