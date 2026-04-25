/**
 * js/controller/AppControllerRuntime.js
 * Private app entrypoint.
 */
const AppController = (() => {
  let bootstrapped = false;
  let healthIntervalId = null;

  function getTabMeta() {
    return {
      telemetry: {
        title: I18nService.t('telemetry.pageTitle'),
        subtitle: I18nService.t('telemetry.pageSubtitle'),
      },
      audit: {
        title: I18nService.t('audit.pageTitle'),
        subtitle: I18nService.t('audit.pageSubtitle'),
      },
      admin: {
        title: I18nService.t('admin.pageTitle'),
        subtitle: I18nService.t('admin.pageSubtitle'),
      },
    };
  }

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

    const meta = getTabMeta()[tab] || {};
    document.getElementById('page-title').textContent = meta.title || '';
    document.getElementById('page-subtitle').textContent = meta.subtitle || '';

    if (tab === 'audit') AuditController.refresh();
    if (tab === 'admin') AdminController.activate();
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
    document.querySelectorAll('.nav-item').forEach(button => {
      button.addEventListener('click', () => activateTab(button.dataset.tab));
    });
  }

  function setupEventListeners() {
    document.getElementById('device-selector').addEventListener('change', async event => {
      AppState.setDevice(event.target.value);
      document.getElementById('sidebar-device-id').textContent = AppState.currentDevice || I18nService.t('common.emptyDash', {}, '—');
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
          message: I18nService.t('auth.logoutSuccess'),
        },
      }));
    });

    window.addEventListener('i18n:changed', async () => {
      if (PublicController.isPublicMode()) return;

      I18nService.applyTranslations();
      activateTab(getActiveTab());
      TelemetryView.setConnStatus('offline');
      TelemetryView.refreshDeviceLabels(AppState.deviceMap || {});

      if (AppState.currentDevice) {
        await TelemetryController.loadTags();
        if (RoleAccessService.canViewAudit()) await AuditController.refresh();
        if (RoleAccessService.canViewAdmin()) await AdminController.refresh();
      } else {
        resetPrivateView();
      }
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
    TelemetryView.renderSensorCards([]);
    TelemetryView.setRunningInactive();
    TelemetryView.updateChartHeader(I18nService.t('telemetry.seriesTitle'), '', 0);
    TelemetryView.renderTable([]);

    AuditView.setSummaryLoading();
    AuditView.setEventsLoading();
    AdminController.reset();

    document.getElementById('sidebar-user-email').textContent = I18nService.t('common.emptyDash', {}, '—');
    document.getElementById('sidebar-device-id').textContent = I18nService.t('common.emptyDash', {}, '—');
    document.getElementById('sidebar-last-update').textContent = I18nService.t('common.emptyDash', {}, '—');
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
    document.getElementById('sidebar-user-email').textContent = AppState.currentUser?.email || I18nService.t('common.emptyDash', {}, '—');
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

  return { init, enterPrivateApp, leavePrivateApp, activateTab };
})();
