export const STEPS = [
  '测试定位中', '研发定位中', '产品设计中', '研发解决中',
  '测试验收中', '测试完成待发布', '交付验收中', '处理完成',
];

// 每个步骤对应的默认指派角色：{ field, label }
// field 对应 Ticket 模型的 assignee / test_assignee / dev_assignee 字段
export const STEP_ROLE_MAP = {
  0: { field: 'test_assignee', label: '测试处理人' },
  1: { field: 'dev_assignee', label: '研发处理人' },
  2: { field: 'assignee', label: '当前处理人' },
  3: { field: 'dev_assignee', label: '研发处理人' },
  4: { field: 'test_assignee', label: '测试处理人' },
  5: { field: 'assignee', label: '当前处理人' },
  6: { field: 'assignee', label: '当前处理人' },
  7: null, // 处理完成 - 无需指派
};

export const stepIndex = (status) => {
  const i = STEPS.indexOf(status);
  return i >= 0 ? i : 0;
};

export const stepTagType = (status) => {
  if (status === '处理完成') return 'success';
  if (status === '研发解决中' || status === '测试验收中') return 'warning';
  if (status === '测试完成待发布' || status === '交付验收中') return '';
  return 'info';
};

export const typeOptions = ['问题', '需求', '咨询', '其他'];

export const typeTagType = (t) => ({
  问题: 'danger', 需求: 'primary', 咨询: 'warning', 其他: 'info',
}[t] || 'info');

export const priorityTagType = (p) => ({
  P0: 'danger', P1: 'warning', P2: '', P3: 'info',
}[p] || 'info');
