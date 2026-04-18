/**
 * js/service/AdminDashboardService.js
 * Aggregates admin domain data for future admin views.
 */
const AdminDashboardService = (() => {
  async function loadAll({ includeInactive = false } = {}) {
    if (!RoleAccessService.canViewAdmin()) {
      throw new ApiClient.ApiError('Permisos insuficientes para administracion.', 403);
    }

    const [users, machines] = await Promise.all([
      UserService.list({ includeInactive }),
      MachineService.list({ includeInactive }),
    ]);

    return {
      users,
      machines: machines.map(machine => ({
        ...machine,
        deviceKey: MachineService.getDeviceKey(machine),
      })),
    };
  }

  return {
    loadAll,
  };
})();
