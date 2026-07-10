import request from '@/utils/request';

export function getTicketList(params?: Record<string, unknown>) {
  return request({ url: '/ticket/', method: 'get', params });
}

export function getTicketStats() {
  return request({ url: '/ticket/stats', method: 'get' });
}

export function createTicket(data: Record<string, unknown>) {
  return request({ url: '/ticket/', method: 'post', data });
}

export function updateTicket(id: number, data: Record<string, unknown>) {
  return request({ url: `/ticket/${id}`, method: 'put', data });
}

export function deleteTicket(id: number) {
  return request({ url: `/ticket/${id}`, method: 'delete' });
}
