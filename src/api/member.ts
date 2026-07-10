import request from '@/utils/request';

export function getMemberList(params?: Record<string, unknown>) {
  return request({ url: '/user/members', method: 'get', params });
}

export function createMember(data: Record<string, unknown>) {
  return request({ url: '/user/create', method: 'post', data });
}

export function updateMember(id: number, data: Record<string, unknown>) {
  return request({ url: `/user/${id}`, method: 'put', data });
}

export function deleteMember(id: number) {
  return request({ url: `/user/${id}`, method: 'delete' });
}

export function toggleMemberStatus(id: number) {
  return request({ url: `/user/${id}/toggle`, method: 'post' });
}

export function syncFeishuUsers() {
  return request({ url: '/user/feishu-sync', method: 'post' });
}
