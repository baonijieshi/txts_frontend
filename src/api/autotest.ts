import request from '@/utils/request';

// 场景
export function getSceneList(params?: Record<string, unknown>) {
  return request({ url: '/autotest/scenes', method: 'get', params });
}

export function createScene(data: Record<string, unknown>) {
  return request({ url: '/autotest/scenes/create', method: 'post', data });
}

export function getSceneDetail(id: number) {
  return request({ url: `/autotest/scenes/${id}`, method: 'get' });
}

export function updateScene(id: number, data: Record<string, unknown>) {
  return request({ url: `/autotest/scenes/${id}`, method: 'put', data });
}

export function deleteScene(id: number) {
  return request({ url: `/autotest/scenes/${id}`, method: 'delete' });
}

export function runScene(id: number, data: Record<string, unknown>) {
  return request({ url: `/autotest/scenes/${id}/run`, method: 'post', data });
}

// 报告
export function getReportList(params?: Record<string, unknown>) {
  return request({ url: '/autotest/reports', method: 'get', params });
}

export function getReportDetail(id: number) {
  return request({ url: `/autotest/reports/${id}`, method: 'get' });
}

export function deleteReport(id: number) {
  return request({ url: `/autotest/reports/${id}`, method: 'delete' });
}

// Faker 动态变量
export function getFakerVars() {
  return request({ url: '/autotest/faker-vars', method: 'get' });
}
