/**
 * js/service/UserService.js
 * Business logic for user/client administration.
 */
const UserService = (() => {
  const UI_CREATABLE_ROLES = ['client', 'public_client'];

  function normalizeCreatePayload(input = {}) {
    const payload = {
      name: (input.name || '').trim(),
      email: (input.email || '').trim(),
      password: input.password || '',
      role: input.role || 'client',
      status: input.status || 'active',
    };

    if (!payload.name) throw new ApiClient.ApiError('El nombre del cliente es requerido.', 400);
    if (!payload.email) throw new ApiClient.ApiError('El email del cliente es requerido.', 400);
    if (!payload.password) throw new ApiClient.ApiError('La contrasena inicial es requerida.', 400);
    if (!UI_CREATABLE_ROLES.includes(payload.role)) {
      throw new ApiClient.ApiError('Rol no permitido desde esta pantalla.', 400);
    }

    return payload;
  }

  function normalizeUpdatePayload(input = {}) {
    const payload = { ...input };
    if (payload.name !== undefined) payload.name = (payload.name || '').trim();
    if (payload.email !== undefined) payload.email = (payload.email || '').trim();
    return payload;
  }

  async function list(options = {}) {
    return UserRepository.list(options);
  }

  async function createClient(input) {
    return UserRepository.create(normalizeCreatePayload(input));
  }

  async function update(id, input) {
    return UserRepository.update(id, normalizeUpdatePayload(input));
  }

  async function setStatus(id, status) {
    return UserRepository.setStatus(id, status);
  }

  async function remove(id) {
    return UserRepository.remove(id);
  }

  return {
    UI_CREATABLE_ROLES,
    list,
    createClient,
    update,
    setStatus,
    remove,
  };
})();
