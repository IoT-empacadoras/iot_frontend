/**
 * js/controller/AppControllerRuntime.js
 * Punto de entrada privado de la app autenticada.
 */
const AppController = (() => {
  let bootstrapped = false;
  let healthIntervalId = null;

  const TAB_META = {
    telemetry: { title: 'Telemetria', subtitle: 'Datos continuos de proceso' },
    audit: { title: 'Auditoria', subtitle: 'Historial de configuracion y alarmas' },
    admin: { title: 'Administracion', subtitle: 'Clientes y maquinas' },
  };

  function getActiveTab() {
    return document.querySelector('.nav-item.active')?.dataset.tab || 'telemetry';
  }

  function activateTab(tab) {
    const button = document.querySelector('.nav-item[data-tab="' + tab + '"]');
    const section = document.getElementById('tab-' + tab);
    if (!button || !section || button.classList.contains('is-hidden')) return;

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    section.classList.add('active');

    const meta = TAB_META[tab] || {};
    document.getElementById('page-title').textContent = meta.title || '';
    document.getElementById('page-subtitle').textContent = meta.subtitle || '';

    if (tab === 'audit') {
      AuditController.refresh();
    }

    if (tab === 'admin') {
      AdminController.activate();
    }
  }

  function applyRoleNavigation() {
    const allowedTabs = RoleAccessService.getAllowedTabs();
    document.querySelectorAll('.nav-item').forEach(button => {
      button.classList.toggle('is-hidden', !allowedTabs.includes(button.dataset.tab));
    });

    document.querySelectorAll('.tab-content').forEach(section => {
      const tab = section.id.replace(/^tab-/, '');
      section.classList.toggle('is-hidden', !allowedTabs.includes(tab));
    });

    if (!allowedTabs.includes(getActiveTab())) {
      activateTab(allowedTabs[0] || 'telemetry');
    }
  }

  function setupTabs() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        activateTab(tab);
      });
    });
  }

  function setupEventListeners() {
    document.getElementById('device-selector').addEventListener('change', async event => {
      AppState.setDevice(event.target.value);
      document.getElementById('sidebar-device-id').textContent = AppState.currentDevice || '—';
      updateSidebarForDevice(AppState.currentDevice);
      await TelemetryController.loadTags();
    });

    document.getElementById('load-data-btn').addEventListener('click', () => TelemetryController.loadChartData());
    document.getElementById('variable-selector').addEventListener('change', () => TelemetryController.loadChartData());
    document.getElementById('time-range-selector').addEventListener('change', () => TelemetryController.loadChartData());
    document.getElementById('load-events-btn').addEventListener('click', () => AuditController.refresh());
    document.getElementById('refresh-audit-btn').addEventListener('click', () => AuditController.refresh());

    document.getElementById('logout-btn').addEventListener('click', async () => {
      await AuthSessionService.logout();
      await leavePrivateApp();
      window.dispatchEvent(new CustomEvent('auth:required', {
        detail: {
          reason: 'logout',
          message: 'La sesion se cerro correctamente.',
        },
      }));
    });
  }

  async function checkHealth() {
    if (!AuthSessionService.getToken()) return;

    try {
      const ok = await TelemetryService.getHealth();
      if (!ok) {
        TelemetryView.setConnStatus('offline');
        return;
      }

      await refreshDeviceHealth();
    } catch {
      TelemetryView.setConnStatus('offline');
    }
  }

  async function refreshDeviceHealth() {
    try {
      const devices = await TelemetryService.getDeviceObjects();
      const map = {};
      devices.forEach(device => {
        if (device.id) map[device.id] = device;
      });
      AppState.setDeviceMap(map);
      TelemetryView.refreshDeviceLabels(map);
      updateSidebarForDevice(AppState.currentDevice);
    } catch {}
  }

  function updateSidebarForDevice(deviceId) {
    const device = AppState.deviceMap[deviceId];
    if (!device) {
      TelemetryView.setConnStatus('offline');
      TelemetryView.setRunningInactive();
      return;
    }

    if (device.health?.status === 'healthy') {
      TelemetryView.setConnStatus('online');
      return;
    }

    TelemetryView.setConnStatus(device.status === 'online' ? 'loading' : 'offline');
    TelemetryView.setRunningInactive();
  }

  function startHealthPolling() {
    if (healthIntervalId) return;
    healthIntervalId = window.setInterval(checkHealth, 8000);
  }

  function stopHealthPolling() {
    if (!healthIntervalId) return;
    window.clearInterval(healthIntervalId);
    healthIntervalId = null;
  }

  function resetPrivateView() {
    stopHealthPolling();
    AppState.defaultDevice = '';
    AppState.currentDevice = '';
    AppState.setTags([]);
    AppState.setDeviceMap({});
    AppState.clearChart();

    TelemetryView.setConnStatus('offline');
    TelemetryView.populateDeviceSelector([], '');
    TelemetryView.populateVariableSelector([]);
    TelemetryView.syncTelemetryLayout([]);
    TelemetryView.updateKpiCards({});
    TelemetryView.setRunningInactive();
    TelemetryView.updateChartHeader('Serie temporal', '', 0);
    TelemetryView.renderTable([]);

    AuditView.setSummaryLoading();
    AuditView.setEventsLoading();
    AdminController.reset();

    document.getElementById('sidebar-user-email').textContent = '—';
    document.getElementById('sidebar-device-id').textContent = '—';
    document.getElementById('sidebar-last-update').textContent = '—';
  }

  function bootstrap() {
    if (bootstrapped) return;
    bootstrapped = true;
    setupTabs();
    setupEventListeners();
    AdminController.bindEvents();
  }

  async function enterPrivateApp() {
    bootstrap();
    applyRoleNavigation();
    document.getElementById('sidebar-user-email').textContent = AppState.currentUser?.email || '—';
    await checkHealth();
    await TelemetryController.loadDevices();
    startHealthPolling();
  }

  async function leavePrivateApp() {
    resetPrivateView();
  }

  function init() {
    bootstrap();
  }

  return { init, enterPrivateApp, leavePrivateApp };
})();
