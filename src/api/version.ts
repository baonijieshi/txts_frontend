import request from '@/utils/request';

export function getVersionList(params?: Record<string, unknown>) {
  return request({ url: '/profile/version/list', method: 'get', params });
}

export function getVersionGrouped(params?: Record<string, unknown>) {
  return request({ url: '/profile/version/grouped', method: 'get', params });
}

export function getVersionByQuarter(params?: Record<string, unknown>) {
  return request({ url: '/profile/version/by-quarter', method: 'get', params });
}

export function getVersionPersonGrouped(params?: Record<string, unknown>) {
  return request({ url: '/profile/version/person-grouped', method: 'get', params });
}

export function getVersionByPerson(params?: Record<string, unknown>) {
  return request({ url: '/profile/version/by-person', method: 'get', params });
}

export function createVersion(data: Record<string, unknown>) {
  return request({ url: '/profile/version/create', method: 'post', data });
}

export function updateVersion(id: number, data: Record<string, unknown>) {
  return request({ url: `/profile/version/${id}`, method: 'put', data });
}

export function deleteVersion(id: number) {
  return request({ url: `/profile/version/${id}`, method: 'delete' });
}

export function getVersionDetail(id: number, params?: Record<string, unknown>) {
  return request({ url: `/profile/version/${id}/detail`, method: 'get', params });
}

export function archiveVersion(id: number) {
  return request({ url: `/profile/version/${id}/archive`, method: 'post' });
}

export function submitTest(id: number, comment?: string) {
  return request({ url: `/profile/version/${id}/submit-test`, method: 'post', data: { comment } });
}

export function passTest(id: number) {
  return request({ url: `/profile/version/${id}/pass-test`, method: 'post' });
}

export function rejectTest(id: number, comment?: string) {
  return request({ url: `/profile/version/${id}/reject-test`, method: 'post', data: { comment } });
}

export function submitAcceptance(id: number, comment?: string) {
  return request({ url: `/profile/version/${id}/submit-acceptance`, method: 'post', data: { comment } });
}

export function passAcceptance(id: number, comment?: string) {
  return request({ url: `/profile/version/${id}/pass-acceptance`, method: 'post', data: { comment } });
}

export function rejectAcceptance(id: number, comment?: string) {
  return request({ url: `/profile/version/${id}/reject-acceptance`, method: 'post', data: { comment } });
}
