import request from '@/utils/request';

export function getProjectList(params?: Record<string, unknown>) {
  return request({ url: '/project/list', method: 'get', params });
}

export function createProject(data: Record<string, unknown>) {
  return request({ url: '/project/create', method: 'post', data });
}

export function updateProject(id: number, data: Record<string, unknown>) {
  return request({ url: `/project/${id}`, method: 'put', data });
}

export function deleteProject(id: number) {
  return request({ url: `/project/${id}`, method: 'delete' });
}
