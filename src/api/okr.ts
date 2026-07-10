import request from '@/utils/request';

// ── 周期 ──
export function getPeriodList(params?: Record<string, unknown>) {
  return request({ url: '/okr/period/list', method: 'get', params });
}

export function createPeriod(data: Record<string, unknown>) {
  return request({ url: '/okr/period/create', method: 'post', data });
}

export function updatePeriod(id: number, data: Record<string, unknown>) {
  return request({ url: `/okr/period/${id}`, method: 'put', data });
}

export function deletePeriod(id: number) {
  return request({ url: `/okr/period/${id}`, method: 'delete' });
}

// ── 目标 ──
export function getObjectiveList(params?: Record<string, unknown>) {
  return request({ url: '/okr/objective/list', method: 'get', params });
}

export function createObjective(data: Record<string, unknown>) {
  return request({ url: '/okr/objective/create', method: 'post', data });
}

export function updateObjective(id: number, data: Record<string, unknown>) {
  return request({ url: `/okr/objective/${id}`, method: 'put', data });
}

export function deleteObjective(id: number) {
  return request({ url: `/okr/objective/${id}`, method: 'delete' });
}

// ── 关键结果 ──
export function createKR(data: Record<string, unknown>) {
  return request({ url: '/okr/kr/create', method: 'post', data });
}

export function updateKR(id: number, data: Record<string, unknown>) {
  return request({ url: `/okr/kr/${id}`, method: 'put', data });
}

export function deleteKR(id: number) {
  return request({ url: `/okr/kr/${id}`, method: 'delete' });
}

export function updateKRProgress(id: number, data: Record<string, unknown>) {
  return request({ url: `/okr/kr/${id}/progress`, method: 'post', data });
}

export function getKRProgressHistory(id: number) {
  return request({ url: `/okr/kr/${id}/progress-history`, method: 'get' });
}

// ── 审核流程 ──
export function submitForReview(periodId: number) {
  return request({ url: '/okr/submit-for-review', method: 'post', data: { period_id: periodId } });
}

export function reviewObjective(id: number, data: Record<string, unknown>) {
  return request({ url: `/okr/objective/${id}/review`, method: 'post', data });
}

export function withdrawReview(id: number) {
  return request({ url: `/okr/objective/${id}/withdraw-review`, method: 'post' });
}

export function urgeMembers(periodId: number) {
  return request({ url: '/okr/urge', method: 'post', data: { period_id: periodId } });
}

export function getMemberTree() {
  return request({ url: '/okr/member-tree', method: 'get' });
}

export function getDashboard(periodId: number) {
  return request({ url: '/okr/dashboard', method: 'get', params: { periodId } });
}
