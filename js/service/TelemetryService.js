/**
 * js/service/TelemetryService.js
 * Telemetry business logic and legacy device compatibility.
 */
const TelemetryService = (() => {
  function normalizeSensor(sensor) {
    if (typeof sensor === 'string') {
      return {
        tag_name: sensor,
        description: '',
        engineering_unit: '',
        status: '',
      };
    }

    const tagName = sensor?.tag_name || sensor?.tagName || sensor?.name || sensor?.variable_name || sensor?.variableName || '';

    return {
      ...sensor,
      tag_name: tagName,
      description: sensor?.description || sensor?.label || sensor?.display_name || sensor?.displayName || '',
      engineering_unit: sensor?.engineering_unit || sensor?.engineeringUnit || sensor?.unit || '',
      status: sensor?.status || '',
    };
  }

  async function getHealth() {
    return TelemetryRepository.getHealth();
  }

  async function listDevices() {
    if (RoleAccessService.isClient() || RoleAccessService.isPublicClient()) {
      return MachineService.listForTelemetry({ includeInactive: true });
    }

    const legacyDevices = await TelemetryRepository.listLegacyDevices();
    return legacyDevices.map(device => {
      const deviceKey = device.device_name || device.deviceKey || device.device_key || device.id;
      return {
        ...device,
        id: deviceKey,
        deviceKey,
        displayName: device.name || device.device_name || deviceKey,
        location: device.location || '',
        pais: device.pais || device.country || '',
      };
    });
  }

  async function getDeviceObjects() {
    return listDevices();
  }

  async function getSensors(deviceKey) {
    const sensors = await TelemetryRepository.getSensors(deviceKey);
    return sensors.map(normalizeSensor).filter(sensor => sensor.tag_name);
  }

  async function getVisibleSensors(deviceKey) {
    const sensors = await getSensors(deviceKey);
    return sensors.map(sensor => sensor.tag_name);
  }

  async function getSensorRows(deviceKey) {
    const [sensors, latest] = await Promise.all([
      getSensors(deviceKey),
      getLatest(deviceKey),
    ]);

    return sensors.map(sensor => {
      const current = latest[sensor.tag_name] || {};
      return {
        tag: sensor.tag_name,
        tag_name: sensor.tag_name,
        name: sensor.description || sensor.tag_name,
        unit: sensor.engineering_unit,
        status: sensor.status,
        value: current.value ?? null,
        timestamp: current.timestamp ?? null,
        sensor,
      };
    });
  }

  async function getLatest(deviceKey) {
    return TelemetryRepository.getLatest(deviceKey);
  }

  async function getHistory(deviceKey, range) {
    return TelemetryRepository.getHistory(deviceKey, range);
  }

  async function addLegacyDevice(deviceId) {
    return TelemetryRepository.addLegacyDevice(deviceId);
  }

  return {
    getHealth,
    listDevices,
    getDeviceObjects,
    getSensors,
    getVisibleSensors,
    getSensorRows,
    getLatest,
    getHistory,
    addLegacyDevice,
  };
})();
