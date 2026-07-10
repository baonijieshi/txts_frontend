import request from '@/utils/request';

export function getTaskList(params?: Record<string, unknown>) {
  return request({ url: '/task/list', method: 'get', params });
}

export function createTask(data: Record<string, unknown>) {
  return request({ url: '/task/create', method: 'post', data });
}

export function updateTask(id: number, data: Record<string, unknown>) {
  return request({ url: `/task/${id}`, method: 'put', data });
}

export function deleteTask(id: number) {
  return request({ url: `/task/${id}`, method: 'delete' });
}
