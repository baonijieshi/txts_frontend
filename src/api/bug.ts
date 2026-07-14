import request from '@/utils/request';

export function getBugList(params?: Record<string, unknown>) {
  return request({ url: '/bug/list', method: 'get', params });
}

export function createBug(data: Record<string, unknown>) {
  return request({ url: '/bug/create', method: 'post', data });
}

export function updateBug(id: number, data: Record<string, unknown>) {
  return request({ url: `/bug/${id}`, method: 'put', data });
}

export function resolveBug(id: number, data: Record<string, unknown>) {
  return request({ url: `/bug/${id}/resolve`, method: 'post', data });
}

export function getBugModules() {
  return request({ url: '/bug/modules', method: 'get' });
}

export function activateBug(id: number) {
  return request({ url: `/bug/${id}/activate`, method: 'post' });
}

export function deleteBug(id: number) {
  return request({ url: `/bug/${id}`, method: 'delete' });
}

export function suggestAssignee(params?: Record<string, unknown>) {
  return request({ url: '/bug/suggest-assignee', method: 'get', params });
}

export function batchDeleteBug(ids: number[]) {
  return request({ url: '/bug/batch-delete', method: 'post', data: { ids } });
}

export function batchUpdateBug(ids: number[], data: Record<string, unknown>) {
  return request({ url: '/bug/batch-update', method: 'post', data: { ids, data } });
}
