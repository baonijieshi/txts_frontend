import request from '@/utils/request';

export function getMockList(params?: Record<string, unknown>) {
  return request({ url: '/mock/list', method: 'get', params });
}

export function createMock(data: Record<string, unknown>) {
  return request({ url: '/mock/create', method: 'post', data });
}

export function deleteMock(snowId: string) {
  return request({ url: `/mock/${snowId}`, method: 'delete' });
}
