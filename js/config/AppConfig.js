/**
 * js/config/AppConfig.js
 * Configuracion central del frontend para distintos entornos.
 */
window.AppConfig = (() => {
  function normalizeUrl(value) {
    return (value || '').trim().replace(/\/+$/, '');
  }

  function resolveApiUrl() {
    const runtimeConfig = window.__APP_CONFIG__ || {};
    const metaApiUrl = document.querySelector('meta[name="api-base-url"]')?.content || '';
    const apiUrl = import.meta.env.VITE_API_URL;

    return normalizeUrl(
      runtimeConfig.apiUrl ||
      apiUrl ||
      metaApiUrl ||
      ''
    );
  }

  return {
    apiUrl: resolveApiUrl(),
  };
})();
