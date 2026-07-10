import request from '@/utils/request';

export function getRoleList() {
  return request({ url: '/profile/list', method: 'get' });
}

export function createRole(data: Record<string, unknown>) {
  return request({ url: '/profile/create', method: 'post', data });
}

export function updateRole(id: number, data: Record<string, unknown>) {
  return request({ url: `/profile/${id}`, method: 'put', data });
}

export function deleteRole(id: number) {
  return request({ url: `/profile/${id}`, method: 'delete' });
}

export function saveRolePermissions(id: number, permissions: string[]) {
  return request({ url: `/profile/${id}/permissions`, method: 'put', data: { permissions } });
}

export function getMenuTree() {
  return request({ url: '/profile/menu/list', method: 'get' });
}

export function createMenu(data: Record<string, unknown>) {
  return request({ url: '/profile/menu/create', method: 'post', data });
}

export function updateMenu(id: number, data: Record<string, unknown>) {
  return request({ url: `/profile/menu/${id}`, method: 'put', data });
}

export function deleteMenu(id: number) {
  return request({ url: `/profile/menu/${id}`, method: 'delete' });
}
