/**
 * js/controller/AppController.js
 * Punto de entrada. Gestiona tabs, salud del backend y cambios de dispositivo.
 * Depende de: AppState, ApiService, TelemetryView,
 *             TelemetryController, AuditController
 */
const AppController = (() => {

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  const TAB_META = {
    telemetry: { title: 'Telemetría',  subtitle: 'Datos continuos de proceso' },
    audit:     { title: 'Auditoría',   subtitle: 'Historial de configuración y alarmas' },
  };

  function setupTabs() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + tab).classList.add('active');

        const meta = TAB_META[tab] || {};
        document.getElementById('page-title').textContent    = meta.title    || '';
        document.getElementById('page-subtitle').textContent = meta.subtitle || '';

        if (tab === 'audit') AuditController.refresh();
      });
    });
  }

  // ── Event listeners ──────────────────────────────────────────────────────────
  function setupEventListeners() {
    document.getElementById('device-selector').addEventListener('change', async e => {
      AppState.setDevice(e.target.value);
      document.getElementById('sidebar-device-id').textContent = AppState.currentDevice;
      updateSidebarForDevice(AppState.currentDevice);
      await TelemetryController.loadTags();
    });

    document.getElementById('load-data-btn').addEventListener('click',
      () => TelemetryController.loadChartData());

    document.getElementById('variable-selector').addEventListener('change',
      () => TelemetryController.loadChartData());

    document.getElementById('time-range-selector').addEventListener('change',
      () => TelemetryController.loadChartData());

    document.getElementById('load-events-btn').addEventListener('click',
      () => AuditController.refresh());

    document.getElementById('refresh-audit-btn').addEventListener('click',
      () => AuditController.refresh());

    document.getElementById('add-device-btn').addEventListener('click', async () => {
      const input = document.getElementById('new-device-id');
      const newId = input.value.trim();
      if (!newId) return;
      try {
        await ApiService.addDevice(newId);
        input.value = '';
        AppState.setDevice(newId);
        await TelemetryController.loadDevices();
      } catch (err) {
        console.error('Error adding device', err);
      }
    });

  }

  // ── Health polling ────────────────────────────────────────────────────────────
  async function checkHealth() {
    try {
      const ok = await ApiService.getHealth();
      if (!ok) { TelemetryView.setConnStatus('offline'); return; }
      // Backend activo — refrescar salud por dispositivo
      await refreshDeviceHealth();
    } catch {
      TelemetryView.setConnStatus('offline');
    }
  }

  async function refreshDeviceHealth() {
    try {
      const devices = await ApiService.getDeviceObjects();
      const map = {};
      devices.forEach(d => { if (d.id) map[d.id] = d; });
      AppState.setDeviceMap(map);
      TelemetryView.refreshDeviceLabels(map);
      updateSidebarForDevice(AppState.currentDevice);
    } catch {}
  }

  // Actualiza el punto de conexión en sidebar según la salud del dispositivo activo
  function updateSidebarForDevice(deviceId) {
    const dev = AppState.deviceMap[deviceId];
    if (!dev) {
      TelemetryView.setConnStatus('offline');
      TelemetryView.setRunningInactive();
      return;
    }
    if (dev.health?.status === 'healthy') {
      TelemetryView.setConnStatus('online');
    } else {
      // Sin actividad reciente: mantener valores históricos, solo cambia estado de conexión
      TelemetryView.setConnStatus(dev.status === 'online' ? 'loading' : 'offline');
      TelemetryView.setRunningInactive();
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────────
  function init() {
    setupTabs();
    setupEventListeners();
    checkHealth();
    TelemetryController.loadDevices();
    setInterval(checkHealth, 8000);
  }

  return { init };
})();

// ── Arranque ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => AppController.init());
