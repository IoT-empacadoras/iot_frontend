/**
 * js/repository/TelemetryRepository.js
 * API access for telemetry and legacy device read endpoints.
 */
const TelemetryRepository = (() => {
  async function getHealth() {
    const { response } = await ApiClient.request('/api/health', {}, {
      requiresAuth: false,
    });
    return response.ok;
  }

  async function listLegacyDevices() {
    const data = await ApiClient.json('/api/devices');
    return data?.devices || [];
  }

  async function getSensors(deviceKey) {
    const data = await ApiClient.json('/api/devices/' + encodeURIComponent(deviceKey) + '/sensors');
    if (Array.isArray(data)) return data;
    return data?.sensors || data?.variables || data?.tags || [];
  }

  async function getLatest(deviceKey) {
    const data = await ApiClient.json('/api/devices/' + encodeURIComponent(deviceKey) + '/latest');
    return data?.data || {};
  }

  async function getHistory(deviceKey, range) {
    const data = await ApiClient.json('/api/devices/' + encodeURIComponent(deviceKey) + '/history/' + encodeURIComponent(range));
    return data?.data || [];
  }

  async function addLegacyDevice(deviceId) {
    await ApiClient.request('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
    return true;
  }

  return {
    getHealth,
    listLegacyDevices,
    getSensors,
    getLatest,
    getHistory,
    addLegacyDevice,
  };
})();
