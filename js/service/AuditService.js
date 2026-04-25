/**
 * js/service/AuditService.js
 * Audit business logic and event filtering.
 */
const AuditService = (() => {
  function ensureAuditAllowed() {
    if (!RoleAccessService.canViewAudit()) {
      throw new ApiClient.ApiError(I18nService.t('forms.auditPermissionDenied'), 403);
    }
  }

  async function getRegisteredParameterSet(deviceKey) {
    const sensors = await TelemetryService.getSensors(deviceKey);
    return new Set(sensors.map(sensor => sensor.tag_name).filter(Boolean));
  }

  function filterByRegisteredParameters(items, parameters) {
    return items.filter(item => parameters.has(item.parameter));
  }

  async function getVisibleEventSummary(deviceKey) {
    ensureAuditAllowed();
    const [summary, parameters] = await Promise.all([
      AuditRepository.getEventSummary(deviceKey),
      getRegisteredParameterSet(deviceKey),
    ]);
    return filterByRegisteredParameters(Object.values(summary), parameters);
  }

  async function getVisibleEvents(deviceKey, filters = {}) {
    ensureAuditAllowed();
    const [events, parameters] = await Promise.all([
      AuditRepository.getEvents(deviceKey, filters),
      getRegisteredParameterSet(deviceKey),
    ]);
    return filterByRegisteredParameters(events, parameters);
  }

  return {
    getVisibleEventSummary,
    getVisibleEvents,
  };
})();
