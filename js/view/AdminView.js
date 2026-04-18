/**
 * js/view/AdminView.js
 * Renders administration UI. No API calls here.
 */
const AdminView = (() => {
  let machineMap = null;
  let machineMarker = null;

  function el(id) {
    return document.getElementById(id);
  }

  function setMessage(targetId, message = '', type = '') {
    const target = el(targetId);
    if (!target) return;
    target.textContent = message;
    target.className = 'admin-message' + (type ? ' ' + type : '');
  }

  function getUserFormData() {
    return {
      name: el('admin-user-name')?.value || '',
      email: el('admin-user-email')?.value || '',
      password: el('admin-user-password')?.value || '',
      role: el('admin-user-role')?.value || 'client',
      status: el('admin-user-status')?.value || 'active',
    };
  }

  function getMachineFormData() {
    return {
      userId: el('admin-machine-user')?.value || '',
      name: el('admin-machine-name')?.value || '',
      deviceKey: el('admin-machine-device-key')?.value || '',
      machineType: el('admin-machine-type')?.value || 'HMI',
      location: el('admin-machine-location')?.value || '',
      pais: el('admin-machine-pais')?.value || '',
      latitude: el('admin-machine-latitude')?.value || '',
      longitude: el('admin-machine-longitude')?.value || '',
      description: el('admin-machine-description')?.value || '',
      status: el('admin-machine-status')?.value || 'active',
    };
  }

  function setMachineCoordinates(lat, lng) {
    if (el('admin-machine-latitude')) el('admin-machine-latitude').value = Number(lat).toFixed(6);
    if (el('admin-machine-longitude')) el('admin-machine-longitude').value = Number(lng).toFixed(6);
    if (!machineMap || typeof L === 'undefined') return;
    const position = [lat, lng];
    if (!machineMarker) {
      machineMarker = L.marker(position, { draggable: true }).addTo(machineMap);
      machineMarker.on('dragend', () => {
        const next = machineMarker.getLatLng();
        setMachineCoordinates(next.lat, next.lng);
      });
      return;
    }
    machineMarker.setLatLng(position);
  }

  function initMachineLocationPicker() {
    if (machineMap) {
      window.setTimeout(() => machineMap.invalidateSize(), 0);
      return;
    }
    if (typeof L === 'undefined' || !el('admin-machine-map')) return;
    machineMap = L.map('admin-machine-map', {
      center: [4.5709, -74.2973],
      zoom: 5,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(machineMap);
    machineMap.on('click', (event) => setMachineCoordinates(event.latlng.lat, event.latlng.lng));
    window.setTimeout(() => machineMap.invalidateSize(), 0);
  }

  function resetUserForm() {
    el('admin-user-form')?.reset();
  }

  function resetMachineForm() {
    el('admin-machine-form')?.reset();
    setMachineSubmitLabel();
    if (machineMap && machineMarker) {
      machineMap.removeLayer(machineMarker);
      machineMarker = null;
    }
  }

  function setMachineSubmitLabel(label = 'Crear maquina') {
    const button = el('admin-machine-form')?.querySelector('.admin-submit');
    if (button) button.textContent = label;
  }

  function fillMachineForm(machine = {}) {
    if (el('admin-machine-user')) el('admin-machine-user').value = machine.user_id || machine.userId || '';
    if (el('admin-machine-name')) el('admin-machine-name').value = machine.name || '';
    if (el('admin-machine-device-key')) el('admin-machine-device-key').value = machine.deviceKey || machine.device_key || machine.device_name || '';
    if (el('admin-machine-type')) el('admin-machine-type').value = machine.machine_type || machine.machineType || 'HMI';
    if (el('admin-machine-location')) el('admin-machine-location').value = machine.location || '';
    if (el('admin-machine-pais')) el('admin-machine-pais').value = machine.pais || machine.country || '';
    if (el('admin-machine-description')) el('admin-machine-description').value = machine.description || '';
    if (el('admin-machine-status')) el('admin-machine-status').value = machine.status === 'inactive' ? 'inactive' : 'active';

    const lat = machine.latitude ?? machine.lat;
    const lng = machine.longitude ?? machine.lng ?? machine.lon;
    if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
      setMachineCoordinates(Number(lat), Number(lng));
      if (machineMap) machineMap.setView([Number(lat), Number(lng)], 12);
    } else {
      if (el('admin-machine-latitude')) el('admin-machine-latitude').value = '';
      if (el('admin-machine-longitude')) el('admin-machine-longitude').value = '';
      if (machineMap && machineMarker) {
        machineMap.removeLayer(machineMarker);
        machineMarker = null;
      }
    }

    setMachineSubmitLabel('Guardar maquina');
  }

  function setLoading() {
    if (el('admin-users-body')) el('admin-users-body').innerHTML = '<tr><td colspan="5" class="empty-row">Cargando...</td></tr>';
    if (el('admin-machines-body')) el('admin-machines-body').innerHTML = '<tr><td colspan="7" class="empty-row">Cargando...</td></tr>';
  }

  function renderUserOptions(users) {
    const clients = users.filter(user => ['client', 'public_client'].includes(user.role));
    const options = ['<option value="">Selecciona cliente</option>']
      .concat(clients.map(user =>
        '<option value="' + Helpers.escapeHtml(user.id) + '">' +
          Helpers.escapeHtml(user.name || user.username || user.email) +
        '</option>'
      ));
    if (el('admin-machine-user')) el('admin-machine-user').innerHTML = options.join('');
  }

  function renderUsers(users) {
    const tbody = el('admin-users-body');
    if (!tbody) return;

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Sin clientes registrados</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(user => {
      const status = user.status || (user.isActive ? 'active' : 'inactive');
      const nextStatus = status === 'active' ? 'inactive' : 'active';
      return (
        '<tr>' +
          '<td>' + Helpers.escapeHtml(user.name || user.username || '—') + '</td>' +
          '<td>' + Helpers.escapeHtml(user.email || '—') + '</td>' +
          '<td>' + Helpers.escapeHtml(user.role || '—') + '</td>' +
          '<td><span class="status-pill status-' + Helpers.escapeHtml(status) + '">' + Helpers.escapeHtml(status) + '</span></td>' +
          '<td><button type="button" class="btn-ghost btn-sm" data-admin-action="toggle-user" ' +
            'data-id="' + Helpers.escapeHtml(user.id) + '" data-status="' + Helpers.escapeHtml(nextStatus) + '">' +
            (nextStatus === 'active' ? 'Activar' : 'Inactivar') +
          '</button></td>' +
        '</tr>'
      );
    }).join('');
  }

  function renderMachines(machines) {
    const tbody = el('admin-machines-body');
    if (!tbody) return;

    if (!machines.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Sin maquinas registradas</td></tr>';
      return;
    }

    tbody.innerHTML = machines.map(machine => {
      const status = machine.status || (machine.is_active ? 'active' : 'inactive');
      const nextStatus = status === 'active' ? 'inactive' : 'active';
      const deviceKey = machine.deviceKey || machine.device_key || machine.device_name || '';
      return (
        '<tr>' +
          '<td>' + Helpers.escapeHtml(machine.name || '—') + '</td>' +
          '<td>' + Helpers.escapeHtml(deviceKey || '—') + '</td>' +
          '<td>' + Helpers.escapeHtml(machine.user_name || machine.ownerName || machine.user_id || '—') + '</td>' +
          '<td>' + Helpers.escapeHtml(machine.location || '—') + '</td>' +
          '<td>' + Helpers.escapeHtml(machine.pais || machine.country || '—') + '</td>' +
          '<td><span class="status-pill status-' + Helpers.escapeHtml(status) + '">' + Helpers.escapeHtml(status) + '</span></td>' +
          '<td class="admin-actions">' +
            '<button type="button" class="btn-ghost btn-sm" data-admin-action="toggle-machine" ' +
              'data-id="' + Helpers.escapeHtml(machine.id) + '" data-status="' + Helpers.escapeHtml(nextStatus) + '">' +
              (nextStatus === 'active' ? 'Activar' : 'Inactivar') +
            '</button>' +
            '<button type="button" class="btn-ghost btn-sm" data-admin-action="show-sensors" ' +
              'data-id="' + Helpers.escapeHtml(machine.id) + '">Variables</button>' +
            '<button type="button" class="btn-ghost btn-sm" data-admin-action="locate-machine" ' +
              'data-id="' + Helpers.escapeHtml(machine.id) + '">Ubicar</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function renderMachineSensors(sensors) {
    const target = el('admin-machine-sensors');
    if (!target) return;

    if (!sensors.length) {
      target.innerHTML = '<div class="summary-empty">Sin variables registradas para esta maquina</div>';
      return;
    }

    target.innerHTML = sensors.map(sensor => {
      const name = sensor.tag_name || sensor.name || sensor.variable_name || sensor;
      const unit = sensor.engineering_unit || sensor.unit || '';
      return (
        '<span class="sensor-chip">' +
          Helpers.escapeHtml(name) +
          (unit ? '<small>' + Helpers.escapeHtml(unit) + '</small>' : '') +
        '</span>'
      );
    }).join('');
  }

  function renderDashboard({ users, machines }) {
    renderUserOptions(users);
    renderUsers(users);
    renderMachines(machines);
  }

  return {
    setMessage,
    setLoading,
    getUserFormData,
    getMachineFormData,
    resetUserForm,
    resetMachineForm,
    fillMachineForm,
    setMachineSubmitLabel,
    renderDashboard,
    renderMachineSensors,
    initMachineLocationPicker,
  };
})();
