import request from '@/utils/request';

export function getTestcaseList(params?: Record<string, unknown>) {
  return request({ url: '/testcase/list', method: 'get', params });
}

export function createTestcase(data: Record<string, unknown>) {
  return request({ url: '/testcase/create', method: 'post', data });
}

export function updateTestcase(id: number, data: Record<string, unknown>) {
  return request({ url: `/testcase/${id}`, method: 'put', data });
}

export function deleteTestcase(id: number) {
  return request({ url: `/testcase/${id}`, method: 'delete' });
}


export function getTestcaseModules() {
  return request({ url: '/testcase/modules', method: 'get' });
}

export function importXmind(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request({
    url: '/testcase/import',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
}

export function getTemplateUrl() {
  return '/api/testcase/template';
}

export function addToBaseline(ids: number[]) {
  return request({ url: '/testcase/add-to-baseline', method: 'post', data: { ids } });
}

export function importFromBaseline(ids: number[], versionId: number) {
  return request({ url: '/testcase/import-from-baseline', method: 'post', data: { ids, version_id: versionId } });
}

// ── 测试计划 ────────────────────────────────────────────────────

export function getTestPlanList(params?: Record<string, unknown>) {
  return request({ url: '/testcase/plan/list', method: 'get', params });
}

export function getTestPlanStats() {
  return request({ url: '/testcase/plan/stats', method: 'get' });
}

export function createTestPlan(data: Record<string, unknown>) {
  return request({ url: '/testcase/plan/create', method: 'post', data });
}

export function updateTestPlan(id: number, data: Record<string, unknown>) {
  return request({ url: `/testcase/plan/${id}`, method: 'put', data });
}

export function deleteTestPlan(id: number) {
  return request({ url: `/testcase/plan/${id}`, method: 'delete' });
}

export function getTestPlanDetail(id: number) {
  return request({ url: `/testcase/plan/${id}`, method: 'get' });
}

export function getTestPlanCases(planId: number, params?: Record<string, unknown>) {
  return request({ url: `/testcase/plan/${planId}/cases`, method: 'get', params });
}

export function addTestPlanCases(planId: number, data: Record<string, unknown>) {
  return request({ url: `/testcase/plan/${planId}/cases`, method: 'post', data });
}

export function updateTestPlanCase(planId: number, caseId: number, data: Record<string, unknown>) {
  return request({ url: `/testcase/plan/${planId}/cases/${caseId}`, method: 'put', data });
}

export function removeTestPlanCase(planId: number, caseId: number) {
  return request({ url: `/testcase/plan/${planId}/cases/${caseId}`, method: 'delete' });
}

// ── 评审 ────────────────────────────────────────────────────

export function createReview(data: Record<string, unknown>) {
  return request({ url: '/testcase/review/create', method: 'post', data });
}

export function getReviewList(params?: Record<string, unknown>) {
  return request({ url: '/testcase/review/list', method: 'get', params });
}

export function getReviewDetail(id: number) {
  return request({ url: `/testcase/review/${id}`, method: 'get' });
}

export function updateReview(id: number, data: Record<string, unknown>) {
  return request({ url: `/testcase/review/${id}/edit`, method: 'put', data });
}

export function deleteReview(id: number) {
  return request({ url: `/testcase/review/${id}/edit`, method: 'delete' });
}

export function updateReviewResult(reviewId: number, resultId: number, data: Record<string, unknown>) {
  return request({ url: `/testcase/review/${reviewId}/result/${resultId}`, method: 'put', data });
}

export function completeReview(id: number) {
  return request({ url: `/testcase/review/${id}/complete`, method: 'post' });
}
