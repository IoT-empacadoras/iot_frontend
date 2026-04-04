/**
 * js/model/ApiService.js
 * Acceso a la API REST del backend. Devuelve datos crudos.
 * Depende de: AppState
 */
const ApiService = (() => {

  async function getHealth() {
    const r = await fetch(AppState.backendUrl + '/api/health');
    return r.ok;
  }

  async function getDevices() {
    const r = await AuthService.authenticatedFetch('/api/devices');
    const d = await r.json();
    return (d.devices || []).map(x => x.id).filter(Boolean);
  }

  // Devuelve el array de objetos completos (con campo health si está activo)
  async function getDeviceObjects() {
    const r = await AuthService.authenticatedFetch('/api/devices');
    const d = await r.json();
    return d.devices || [];
  }

  async function getSensors(deviceId) {
    const r = await AuthService.authenticatedFetch('/api/devices/' + deviceId + '/sensors');
    const d = await r.json();
    return d.tags || [];
  }

  async function getLatest(deviceId) {
    const r = await AuthService.authenticatedFetch('/api/devices/' + deviceId + '/latest');
    const d = await r.json();
    return d.data || {};
  }

  async function getHistory(deviceId, range) {
    const r = await AuthService.authenticatedFetch('/api/devices/' + deviceId + '/history/' + range);
    const d = await r.json();
    return d.data || [];
  }

  async function getEventSummary(deviceId) {
    const r = await AuthService.authenticatedFetch('/api/devices/' + deviceId + '/events/summary');
    const d = await r.json();
    return d.summary || {};
  }

  async function getEvents(deviceId, { eventType, parameter, limit } = {}) {
    let u = '/api/devices/' + deviceId + '/events?limit=' + (limit || 200);
    if (eventType)  u += '&event_type=' + encodeURIComponent(eventType);
    if (parameter)  u += '&parameter='  + encodeURIComponent(parameter);
    const r = await AuthService.authenticatedFetch(u);
    const d = await r.json();
    return d.events || [];
  }

  async function addDevice(deviceId) {
    const r = await AuthService.authenticatedFetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    });
    return r.ok;
  }

  return { getHealth, getDevices, getDeviceObjects, getSensors, getLatest, getHistory, getEventSummary, getEvents, addDevice };
})();
