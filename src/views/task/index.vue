<template>
  <div class="task-container">
    <!-- KPI 统计条 -->
    <div class="kpi-strip">
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)"><el-icon :size="18"><List /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ total }}</span><span class="kpi-label">全部任务</span></div>
      </div>
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe)"><el-icon :size="18"><Loading /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.inProgress }}</span><span class="kpi-label">进行中</span></div>
      </div>
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7)"><el-icon :size="18"><CircleCheckFilled /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.completed }}</span><span class="kpi-label">已完成</span></div>
      </div>
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)"><el-icon :size="18"><Clock /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.overdue }}</span><span class="kpi-label">已逾期</span></div>
      </div>
    </div>

    <!-- 表格区 -->
    <div class="table-section">
      <!-- 工具栏：搜索 + 筛选 + 新建按钮 -->
      <div class="list-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="queryParams.name"
            placeholder="搜索任务名称..."
            clearable
            style="width:220px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <ModernSelect v-model="queryParams.version" :options="filterVersionOptions" placeholder="所属版本" clearable style="width:150px" @change="handleSearch" />
          <ModernSelect v-model="queryParams.type" :options="filterTypeOptions" placeholder="类型" clearable style="width:90px" @change="handleSearch" />
          <ModernSelect v-model="queryParams.priority" :options="filterPriorityOptions" placeholder="优先级" clearable style="width:90px" @change="handleSearch" />
          <ModernSelect v-model="queryParams.status" :options="filterStatusOptions" placeholder="状态" clearable style="width:100px" @change="handleSearch" />
          <UserCascader v-model="queryParams.assignee" :user-list="userList" value-key="label" placeholder="指派给" width="160px" @change="handleSearch" />
          <el-button v-if="hasFilter" link type="primary" @click="handleReset">清除筛选</el-button>
        </div>
        <div class="toolbar-right">
          <el-button plain @click="handleExportCSV">
            <el-icon><Download /></el-icon>导出
          </el-button>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新建任务
          </el-button>
        </div>
      </div>

      <el-table :data="tasks" style="width: 100%" row-key="id" row-class-name="task-row">
        <el-table-column type="index" label="" width="60" />
        <el-table-column prop="name" label="任务名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="inlineEditingId === row.id">
              <input
                v-model="inlineEditText"
                class="inline-title-input"
                @keydown.enter="saveInlineEdit(row)"
                @keydown.escape="cancelInlineEdit"
                @blur="saveInlineEdit(row)"
                @click.stop
              />
            </template>
            <el-link v-else type="primary" @click="handleDetail(row)" @dblclick.stop="startInlineEdit(row)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="version_name" label="所属版本" min-width="120" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === '开发' ? undefined : 'success'" size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="priorityType(row.priority)" size="small">{{ row.priority }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="180" align="center">
          <template #default="{ row }">
            <!-- 开发任务：可拖动进度条 -->
            <template v-if="row.type === '开发'">
              <el-popover
                :visible="editingProgressId === row.id"
                placement="bottom"
                :width="260"
                trigger="click"
                @show="handleProgressClick(row)"
              >
                <div class="progress-popover">
                  <div class="progress-popover__header">
                    <span>调整进度</span>
                    <span class="progress-popover__val">{{ editingProgressVal }}%</span>
                  </div>
                  <el-slider
                    v-model="editingProgressVal"
                    :min="0"
                    :max="100"
                    :step="5"
                    :show-tooltip="false"
                  />
                  <div class="progress-popover__footer">
                    <el-button size="small" @click="editingProgressId = null">取消</el-button>
                    <el-button size="small" type="primary" @click="handleProgressSave(row)">确定</el-button>
                  </div>
                </div>
                <template #reference>
                  <div class="progress-cell progress-cell--editable">
                    <div class="progress-bar-mini" :class="{ 'is-zero': (row.progress || 0) === 0 }">
                      <div class="progress-bar-mini__fill" :style="{ width: (row.progress || 0) + '%', background: progressColor(row.progress || 0) }"></div>
                    </div>
                    <span class="progress-pct">{{ row.progress || 0 }}%</span>
                    <el-icon class="progress-drag-icon" :size="14"><DArrowRight /></el-icon>
                  </div>
                </template>
              </el-popover>
            </template>
            <!-- 测试任务：只读进度（联动测试计划） -->
            <template v-else-if="row.type === '测试'">
              <el-tooltip content="进度自动联动同版本测试计划用例执行率" placement="top">
                <div class="progress-cell">
                  <div class="progress-bar-mini progress-bar-mini--test" :class="{ 'is-zero': (row.test_progress ?? 0) === 0 }">
                    <div class="progress-bar-mini__fill" :style="{ width: (row.test_progress ?? 0) + '%', background: progressColor(row.test_progress ?? 0) }"></div>
                  </div>
                  <span class="progress-pct">{{ row.test_progress ?? '-' }}%</span>
                </div>
              </el-tooltip>
            </template>
            <!-- 产品/其他任务：可拖动进度条（同开发） -->
            <template v-else>
              <el-popover
                :visible="editingProgressId === row.id"
                placement="bottom"
                :width="260"
                trigger="click"
                @show="handleProgressClick(row)"
              >
                <div class="progress-popover">
                  <div class="progress-popover__header">
                    <span>调整进度</span>
                    <span class="progress-popover__val">{{ editingProgressVal }}%</span>
                  </div>
                  <el-slider
                    v-model="editingProgressVal"
                    :min="0"
                    :max="100"
                    :step="5"
                    :show-tooltip="false"
                  />
                  <div class="progress-popover__footer">
                    <el-button size="small" @click="editingProgressId = null">取消</el-button>
                    <el-button size="small" type="primary" @click="handleProgressSave(row)">确定</el-button>
                  </div>
                </div>
                <template #reference>
                  <div class="progress-cell progress-cell--editable">
                    <div class="progress-bar-mini" :class="{ 'is-zero': (row.progress || 0) === 0 }">
                      <div class="progress-bar-mini__fill" :style="{ width: (row.progress || 0) + '%', background: progressColor(row.progress || 0) }"></div>
                    </div>
                    <span class="progress-pct">{{ row.progress || 0 }}%</span>
                    <el-icon class="progress-drag-icon" :size="14"><DArrowRight /></el-icon>
                  </div>
                </template>
              </el-popover>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="assignee_name" label="指派给" min-width="110">
          <template #default="{ row }">
            <div v-if="row.assignee_name" class="user-cell">
              <el-avatar :size="20" :src="row.assignee_avatar || ''">{{ row.assignee_name.charAt(0) }}</el-avatar>
              <span>{{ row.assignee_name }}</span>
            </div>
            <span v-else style="color: var(--text-placeholder)">未指派</span>
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止日期" min-width="130">
          <template #default="{ row }">
            <span v-if="!row.deadline" style="color: var(--text-placeholder)">未设置</span>
            <span v-else>
              {{ row.deadline }}
              <el-tag
                v-if="isOverdue(row)"
                type="danger"
                size="small"
                style="margin-left: 4px"
              >延期</el-tag>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon size="48" style="color: var(--text-placeholder)"><Tickets /></el-icon>
            <p>暂无任务记录</p>
            <el-button type="primary" size="small" @click="handleAdd">创建第一个任务</el-button>
          </div>
        </template>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </div>

    <TaskDialog
      v-model:visible="dialogVisible"
      :editing-id="editingId"
      :initial-form="editingForm"
      :version-list="versionList"
      :user-list="userList"
      @saved="fetchList"
    />

    <TaskDetailDrawer
      v-model:visible="detailVisible"
      :row="detailRow"
      @edit="handleEdit"
    />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Tickets, Search, Plus, List, Loading, Clock, CircleCheckFilled, DArrowRight, Download } from '@element-plus/icons-vue';
import { getTaskList, updateTask, deleteTask } from '@/api/task';
import { exportToCSV } from '@/utils/export';
import { getUserList } from '@/api/user';
import { getVersionList } from '@/api/version';
import UserCascader from '@/components/UserCascader.vue';
import ModernSelect from '@/components/ModernSelect.vue';
import TaskDialog from './components/TaskDialog.vue';
import TaskDetailDrawer from './components/TaskDetailDrawer.vue';

const route = useRoute();
const tasks = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

const versionOptions = ref([]);
const versionList = ref([]);
const userList = ref([]);

const queryParams = ref({
  name: '',
  version: '',
  type: '',
  priority: '',
  status: '',
  assignee: '',
});

const statusOptions = ['未开始', '进行中', '已完成'];

const filterVersionOptions = computed(() =>
  versionOptions.value.map((v: any) => ({ label: v.name, value: v.name }))
);
const filterTypeOptions = [
  { label: '开发', value: '开发' },
  { label: '测试', value: '测试' },
];
const filterPriorityOptions = [
  { label: '高', value: '高' },
  { label: '中', value: '中' },
  { label: '低', value: '低' },
];
const filterStatusOptions = [
  { label: '未开始', value: '未开始' },
  { label: '进行中', value: '进行中' },
  { label: '已完成', value: '已完成' },
];

const hasFilter = computed(() => queryParams.value.name || queryParams.value.version || queryParams.value.type || queryParams.value.priority || queryParams.value.status || queryParams.value.assignee);

const fetchOptions = async () => {
  try {
    const [versionRes, userRes] = await Promise.all([
      getVersionList({ page: 1, pageSize: 999 }),
      getUserList(),
    ]);
    const vers = versionRes.data.list || [];
    versionList.value = vers.map((v) => ({ id: v.id, name: v.name }));
    versionOptions.value = vers.map((v) => ({ id: v.id, name: v.name }));
    userList.value = (userRes.data || []).map((u) => ({
      id: u.id,
      label: u.first_name || u.username,
      avatar: u.avatar || '',
      dept: u.dept || '',
    }));
  } catch {
    // 加载选项失败
  }
};

const fetchList = async () => {
  try {
    const params = {
      ...queryParams.value,
      page: currentPage.value,
      pageSize: pageSize.value,
    };
    const res = await getTaskList(params);
    tasks.value = res.data.list || [];
    total.value = res.data.total || 0;
  } catch {
    // 获取任务列表失败
  }
};

onMounted(async () => {
  await fetchOptions();
  await fetchList();
  const { openId } = route.query;
  if (openId) {
    const target = tasks.value.find((t) => String(t.id) === String(openId));
    if (target) handleDetail(target);
  }
});

const handleSearch = () => { currentPage.value = 1; fetchList(); };
const handleReset = () => {
  queryParams.value = {
    name: '',
    version: '',
    type: '',
    priority: '',
    status: '',
    assignee: '',
  };
  currentPage.value = 1;
  fetchList();
};

const isOverdue = (row) => {
  if (!row.deadline || row.status === '已完成') return false;
  return new Date(row.deadline) < new Date(new Date().toDateString());
};

const stats = computed(() => ({
  inProgress: tasks.value.filter((t) => t.status === '进行中').length,
  completed: tasks.value.filter((t) => t.status === '已完成').length,
  overdue: tasks.value.filter((t) => isOverdue(t)).length,
}));

const priorityType = (p) => ({ 高: 'danger', 中: 'warning', 低: 'info' }[p] || 'info');
const statusType = (s) => ({ 未开始: 'info', 进行中: 'warning', 已完成: 'success' }[s] || 'info');

const progressColor = (p: number) => {
  if (p <= 0) return 'var(--text-placeholder)';
  if (p < 30) return 'var(--text-secondary)';
  if (p < 70) return 'var(--el-color-primary)';
  return 'var(--el-color-success)';
};

// 开发任务进度点击 → 打开编辑弹窗调整进度
const editingProgressId = ref<number | null>(null);
const editingProgressVal = ref(0);

const handleProgressClick = (row: any) => {
  if (row.type !== '开发' && row.type !== '产品') return;
  editingProgressId.value = row.id;
  editingProgressVal.value = row.progress || 0;
};

const handleProgressSave = async (row: any) => {
  try {
    const payload: any = { progress: editingProgressVal.value };
    if (editingProgressVal.value >= 100) payload.status = '已完成';
    await updateTask(row.id, payload);
    row.progress = editingProgressVal.value;
    if (editingProgressVal.value >= 100) row.status = '已完成';
    ElMessage.success('进度已更新');
    editingProgressId.value = null;
  } catch {
    // ignore
  }
};



// 弹窗
const dialogVisible = ref(false);
const editingId = ref(null);
const editingForm = ref(null);

const handleAdd = () => {
  editingId.value = null;
  editingForm.value = null;
  dialogVisible.value = true;
};

const handleEdit = (row) => {
  detailVisible.value = false;
  editingId.value = row.id;
  editingForm.value = {
    name: row.name,
    version: row.version || null,
    type: row.type || '开发',
    priority: row.priority,
    status: row.status,
    assignee: row.assignee || null,
    deadline: row.deadline || '',
    progress: row.progress || 0,
    description: row.description || '',
  };
  dialogVisible.value = true;
};

const handleDelete = (row) => {
  ElMessageBox.confirm('确定删除任务「'.concat(row.name, '」？'), '提示', { type: 'warning' })
    .then(async () => {
      await deleteTask(row.id);
      ElMessage.success('已删除');
      fetchList();
    })
    .catch(() => {});
};

// 详情
const detailVisible = ref(false);
const detailRow = ref(null);

const handleDetail = (row) => {
  detailRow.value = row;
  detailVisible.value = true;
};

function handleExportCSV() {
  exportToCSV(tasks.value, [
    { label: '任务名称', value: 'name' },
    { label: '所属版本', value: 'version_name' },
    { label: '类型', value: 'type' },
    { label: '优先级', value: 'priority' },
    { label: '状态', value: 'status' },
    { label: '进度', value: (row) => (row.progress ?? 0) + '%' },
    { label: '指派给', value: 'assignee_name' },
    { label: '截止日期', value: 'deadline' },
    { label: '创建时间', value: 'created_at' },
  ], '任务列表');
}

// ── 行内编辑标题 ──
const inlineEditingId = ref(null);
const inlineEditText = ref('');

function startInlineEdit(row: any) {
  inlineEditingId.value = row.id;
  inlineEditText.value = row.name;
  nextTick(() => {
    const el = document.querySelector('.inline-title-input') as HTMLInputElement;
    el?.focus();
    el?.select();
  });
}

async function saveInlineEdit(row: any) {
  if (inlineEditingId.value !== row.id) return;
  const newName = inlineEditText.value.trim();
  if (newName && newName !== row.name) {
    try {
      await updateTask(row.id, { name: newName });
      row.name = newName;
    } catch {
      inlineEditText.value = row.name;
    }
  }
  inlineEditingId.value = null;
}

function cancelInlineEdit() {
  inlineEditingId.value = null;
}
</script>

<style scoped lang="scss">
.task-container {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── KPI Pills ── */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.kpi-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  &:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); }
}
.kpi-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; color: #fff; box-shadow: 0 3px 8px rgba(0,0,0,.15);
}
.kpi-body { flex: 1; min-width: 0; }
.kpi-value { display: block; font-size: 22px; font-weight: 700; color: var(--text-primary); line-height: 1.1; }
.kpi-label { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 2px; font-weight: 500; }

/* ── 表格区 ── */
.table-section {
  background: var(--bg-card);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
  padding: 16px 20px;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
  .toolbar-left  { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .toolbar-right { display: flex; gap: 8px; align-items: center; }
}

/* ── 表格 ── */
:deep(.el-table) {
  --el-table-border-color: transparent;
  --el-table-header-bg-color: var(--bg-elevated);

  th.el-table__cell {
    background: var(--bg-elevated);
    font-weight: 600;
    font-size: 12px;
    color: var(--text-secondary);
    letter-spacing: 0.3px;
    border-bottom: 1px solid var(--border-light);
  }

  .el-table__body tr:hover > td {
    background: var(--bg-hover) !important;
  }
}

:deep(.task-row) { cursor: pointer; }

.user-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  .el-avatar {
    flex-shrink: 0;
    font-size: 11px;
    background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-5));
    color: var(--text-inverse);
  }
  span { font-size: 13px; color: var(--text-primary); }
}

/* ── 行内编辑输入框 ── */
.inline-title-input {
  width: 100%;
  border: 1px solid var(--el-color-primary);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-card);
  outline: none;
  box-shadow: 0 0 0 2px var(--el-color-primary-light-7);
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  color: var(--text-secondary);
  p { margin: 12px 0; font-size: 14px; }
}

/* ── 进度条单元格 ── */
.progress-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;

  &--editable {
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 6px;
    transition: background 0.15s;
    &:hover {
      background: var(--bg-hover);
      .progress-drag-icon { opacity: 1; }
    }
  }
}

.progress-bar-mini {
  flex: 1;
  max-width: 60px;
  height: 6px;
  background: var(--bg-hover);
  border-radius: 3px;
  overflow: hidden;

  &--test {
    max-width: 60px;
  }

  &__fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s cubic-bezier(.34, 1.56, .64, 1);
    min-width: 0;
  }

  &.is-zero &__fill {
    background: var(--text-placeholder) !important;
  }
}

.progress-pct {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-regular);
  font-variant-numeric: tabular-nums;
  min-width: 32px;
  text-align: left;
}

.progress-drag-icon {
  color: var(--text-placeholder);
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

/* ── 进度 Popover ── */
.progress-popover {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--text-regular);
    font-weight: 500;
  }

  &__val {
    font-size: 18px;
    font-weight: 700;
    color: var(--el-color-primary);
    font-variant-numeric: tabular-nums;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }
}

</style>
