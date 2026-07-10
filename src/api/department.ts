import request from '@/utils/request';

export function getDeptList(params?: Record<string, unknown>) {
  return request({ url: '/profile/dept/list', method: 'get', params });
}

export function createDept(data: Record<string, unknown>) {
  return request({ url: '/profile/dept/create', method: 'post', data });
}

export function updateDept(id: number, data: Record<string, unknown>) {
  return request({ url: `/profile/dept/${id}`, method: 'put', data });
}

export function deleteDept(id: number) {
  return request({ url: `/profile/dept/${id}`, method: 'delete' });
}

export function syncFeishuDepts() {
  return request({ url: '/profile/dept/feishu-sync', method: 'post' });
}

export function getDeptTree(params?: Record<string, unknown>) {
  return request({ url: '/profile/dept/tree', method: 'get', params });
}
