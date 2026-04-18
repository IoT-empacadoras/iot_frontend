/**
 * js/controller/AdminController.js
 * Wires administration UI events to domain services.
 */
const AdminController = (() => {
  let eventsBound = false;
  let hasLoaded = false;
  let editingMachineId = null;
  let cachedMachines = [];

  function showError(target, error, fallback) {
    AdminView.setMessage(target, error?.message || fallback, 'err');
    console.error('[AdminController]', error);
  }

  async function refresh() {
    if (!RoleAccessService.canViewAdmin()) return;

    try {
      AdminView.setLoading();
      const data = await AdminDashboardService.loadAll({ includeInactive: true });
      cachedMachines = data.machines || [];
      AdminView.renderDashboard(data);
      hasLoaded = true;
    } catch (error) {
      showError('admin-global-message', error, 'No fue posible cargar administracion.');
    }
  }

  async function handleUserSubmit(event) {
    event.preventDefault();
    try {
      AdminView.setMessage('admin-user-message', 'Creando cliente...');
      await UserService.createClient(AdminView.getUserFormData());
      AdminView.resetUserForm();
      AdminView.setMessage('admin-user-message', 'Cliente guardado.', 'ok');
      await refresh();
    } catch (error) {
      showError('admin-user-message', error, 'No fue posible crear el cliente.');
    }
  }

  async function handleMachineSubmit(event) {
    event.preventDefault();
    try {
      AdminView.setMessage('admin-machine-message', 'Creando maquina...');
      const payload = AdminView.getMachineFormData();
      if (editingMachineId) {
        AdminView.setMessage('admin-machine-message', 'Guardando maquina...');
        await MachineService.update(editingMachineId, payload);
        editingMachineId = null;
      } else {
        await MachineService.create(payload);
      }
      AdminView.resetMachineForm();
      AdminView.setMessage('admin-machine-message', 'Maquina guardada.', 'ok');
      await refresh();
    } catch (error) {
      showError('admin-machine-message', error, 'No fue posible crear la maquina.');
    }
  }

  async function handleAdminAction(event) {
    const button = event.target.closest('[data-admin-action]');
    if (!button) return;

    const action = button.dataset.adminAction;
    const id = button.dataset.id;

    try {
      if (action === 'toggle-user') {
        await UserService.setStatus(id, button.dataset.status);
        await refresh();
      }

      if (action === 'toggle-machine') {
        await MachineService.setStatus(id, button.dataset.status);
        await refresh();
        await TelemetryController.loadDevices();
      }

      if (action === 'show-sensors') {
        AdminView.setMessage('admin-machine-message', 'Cargando variables...');
        const sensors = await MachineService.listSensors(id, { includeInactive: true });
        AdminView.renderMachineSensors(sensors);
        AdminView.setMessage('admin-machine-message', '');
      }

      if (action === 'locate-machine') {
        const machine = cachedMachines.find(item => String(item.id) === String(id));
        if (!machine) return;
        editingMachineId = id;
        AdminView.fillMachineForm(machine);
        AdminView.setMessage('admin-machine-message', 'Selecciona la ubicacion en el mapa y guarda la maquina.');
      }
    } catch (error) {
      showError('admin-global-message', error, 'No fue posible completar la accion.');
    }
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    document.getElementById('admin-user-form')?.addEventListener('submit', handleUserSubmit);
    document.getElementById('admin-machine-form')?.addEventListener('submit', handleMachineSubmit);
    document.getElementById('tab-admin')?.addEventListener('click', handleAdminAction);
  }

  async function activate() {
    bindEvents();
    AdminView.initMachineLocationPicker();
    if (!hasLoaded) await refresh();
  }

  function reset() {
    hasLoaded = false;
    editingMachineId = null;
    cachedMachines = [];
    AdminView.setMessage('admin-global-message', '');
    AdminView.resetMachineForm();
  }

  return {
    bindEvents,
    activate,
    refresh,
    reset,
  };
})();
