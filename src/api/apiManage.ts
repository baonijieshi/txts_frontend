import request from '@/utils/request';

const BASE = '/service_api';

export function getServiceList() {
  return request({ url: `${BASE}/services`, method: 'get' });
}

export function createService(data: Record<string, unknown>) {
  return request({ url: `${BASE}/services`, method: 'post', data });
}

export function updateService(id: number, data: Record<string, unknown>) {
  return request({ url: `${BASE}/services/${id}`, method: 'put', data });
}

export function deleteService(id: number) {
  return request({ url: `${BASE}/services/${id}`, method: 'delete' });
}

export function getApiList(params?: Record<string, unknown>) {
  return request({ url: `${BASE}/list`, method: 'get', params });
}

export function createApi(data: Record<string, unknown>) {
  return request({ url: `${BASE}/create`, method: 'post', data });
}

export function getApiDetail(id: number) {
  return request({ url: `${BASE}/${id}`, method: 'get' });
}

export function updateApi(id: number, data: Record<string, unknown>) {
  return request({ url: `${BASE}/${id}`, method: 'put', data });
}

export function deleteApi(id: number) {
  return request({ url: `${BASE}/${id}`, method: 'delete' });
}

export function importApis(data: Record<string, unknown>) {
  return request({ url: `${BASE}/import`, method: 'post', data });
}

export function bulkDeleteApis(ids: number[]) {
  return request({ url: `${BASE}/bulk-delete`, method: 'post', data: { ids } });
}

export function bulkSetService(ids: number[], serviceId: number) {
  return request({ url: `${BASE}/bulk-set-service`, method: 'post', data: { ids, service_id: serviceId } });
}

export function getEnvList() {
  return request({ url: `${BASE}/envs`, method: 'get' });
}

export function createEnv(data: Record<string, unknown>) {
  return request({ url: `${BASE}/envs`, method: 'post', data });
}

export function updateEnv(id: number, data: Record<string, unknown>) {
  return request({ url: `${BASE}/envs/${id}`, method: 'put', data });
}

export function deleteEnv(id: number) {
  return request({ url: `${BASE}/envs/${id}`, method: 'delete' });
}

export function proxyRequest(data: Record<string, unknown>) {
  return request({ url: `${BASE}/proxy`, method: 'post', data });
}
