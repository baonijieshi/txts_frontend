<template>
  <div class="bug-view">
    <!-- 统计卡片 -->
    <div class="kpi-strip">
      <div class="kpi-pill" :class="{ active: viewMode === 'all' }" @click="switchView('all')">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)"><el-icon :size="18"><WarningFilled /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.total }}</span><span class="kpi-label">全部 Bug</span></div>
      </div>
      <div class="kpi-pill" :class="{ active: viewMode === 'mine' }" @click="switchView('mine')">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)"><el-icon :size="18"><UserFilled /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.mine }}</span><span class="kpi-label">指派给我</span></div>
      </div>
      <div class="kpi-pill" :class="{ active: viewMode === 'created' }" @click="switchView('created')">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe)"><el-icon :size="18"><EditPen /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.created }}</span><span class="kpi-label">我创建的</span></div>
      </div>
      <div class="kpi-pill" :class="{ active: viewMode === 'open' }" @click="switchView('open')">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #fa709a, #fee140)"><el-icon :size="18"><Clock /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.open }}</span><span class="kpi-label">未关闭</span></div>
      </div>
      <div class="kpi-pill fatal" :class="{ active: viewMode === 'fatal' }" @click="switchView('fatal')">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #e74c3c, #c0392b)"><el-icon :size="18"><CircleCloseFilled /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.fatal }}</span><span class="kpi-label">致命/严重</span></div>
      </div>
      <div class="kpi-pill" :class="{ active: viewMode === 'resolved' }" @click="switchView('resolved')">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7)"><el-icon :size="18"><CircleCheckFilled /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.resolved }}</span><span class="kpi-label">已解决</span></div>
      </div>
    </div>

    <div class="table-section">
      <!-- 工具栏 -->
      <div class="list-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="queryParams.title"
            placeholder="搜索 Bug 标题..."
            clearable
            style="width:220px"
            @input="debounceFetch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select v-model="queryParams.severity" placeholder="严重程度" clearable style="width:110px" @change="handleSearch">
            <el-option v-for="s in severityOptions" :key="s" :label="s" :value="s" />
          </el-select>
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width:110px" @change="handleSearch">
            <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
          </el-select>
          <el-select v-model="queryParams.priority" placeholder="优先级" clearable style="width:100px" @change="handleSearch">
            <el-option label="P0" value="P0" />
            <el-option label="P1" value="P1" />
            <el-option label="P2" value="P2" />
            <el-option label="P3" value="P3" />
          </el-select>

          <!-- 更多筛选 -->
          <el-popover placement="bottom-start" :width="360" trigger="click">
            <template #reference>
              <el-button :type="hasMoreFilter ? 'primary' : 'default'" plain>
                <el-icon><Filter /></el-icon>更多
                <el-badge v-if="moreFilterCount > 0" :value="moreFilterCount" class="filter-badge" />
              </el-button>
            </template>
            <el-form :model="queryParams" label-width="80px" size="small">
              <el-form-item label="关联版本">
                <el-select v-model="queryParams.versionId" placeholder="全部" clearable filterable style="width:100%">
                  <el-option v-for="v in versionOptions" :key="v.id" :label="v.name" :value="v.id" />
                </el-select>
              </el-form-item>
              <div style="text-align:right; margin-top:4px">
                <el-button size="small" @click="handleReset">重置</el-button>
                <el-button size="small" type="primary" @click="handleSearch">应用</el-button>
              </div>
            </el-form>
          </el-popover>

          <el-tag v-if="projectFilter" closable type="info" @close="clearProjectFilter">
            项目：{{ projectFilter }}
          </el-tag>
        </div>

        <div class="toolbar-right">
          <template v-if="selectedIds.length > 0">
            <span class="selected-tip">已选 {{ selectedIds.length }} 条</span>
            <el-button size="small" type="danger" plain @click="handleBatchDelete">
              <el-icon><Delete /></el-icon>删除
            </el-button>
            <el-divider direction="vertical" />
          </template>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>提交 Bug
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        :data="paginatedData"
        v-loading="loading"
        style="width:100%"
        row-key="id"
        row-class-name="bug-row"
        @selection-change="onSelectionChange"
        @row-click="handleRowClick"
      >
        <el-table-column type="selection" width="46" />
        <el-table-column prop="title" label="Bug 标题" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="bug-title-cell">
              <span :class="['severity-dot', `sev-${row.severity}`]" :title="row.severity" />
              <span class="bug-title">{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="72" align="center">
          <template #default="{ row }">
            <span :class="['priority-dot', `priority-${row.priority?.toLowerCase()}`]">{{ row.priority }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-dropdown trigger="click" @command="(val) => handleStatusChange(row, val)">
              <span :class="['status-badge', `status-${row.status}`]" @click.stop>
                {{ row.status }}<el-icon style="margin-left:2px; font-size:10px"><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu @click.stop>
                  <el-dropdown-item v-for="s in statusOptions" :key="s" :command="s">
                    <span :class="['status-badge', `status-${s}`]">{{ s }}</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
        <el-table-column label="指派给" width="120">
          <template #default="{ row }">
            <div v-if="row.assignee_name" class="user-cell">
              <el-avatar :size="20" :src="row.assignee_avatar || ''" :style="row.assignee_avatar ? {} : avatarGradientStyle(row.assignee_name)">
                <span>{{ String(row.assignee_name).charAt(0) }}</span>
              </el-avatar>
              <span>{{ row.assignee_name }}</span>
            </div>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>
        <el-table-column label="创建人" width="110">
          <template #default="{ row }">
            <div v-if="row.reporter_name" class="user-cell">
              <el-avatar :size="20" :src="row.reporter_avatar || ''" :style="row.reporter_avatar ? {} : avatarGradientStyle(row.reporter_name)">
                <span>{{ String(row.reporter_name).charAt(0) }}</span>
              </el-avatar>
              <span>{{ row.reporter_name }}</span>
            </div>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="version_name" label="版本" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.version_name" class="version-tag">{{ row.version_name }}</span>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            <span class="time-text">{{ row.created_at }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click.stop="handleEdit(row)">编辑</el-button>
            <el-button
              v-if="!['已解决', '已关闭'].includes(row.status)"
              size="small" link type="success"
              @click.stop="handleResolve(row)"
            >解决</el-button>
            <el-button
              v-else
              size="small" link type="warning"
              @click.stop="handleActivate(row)"
            >激活</el-button>
            <el-button size="small" link type="danger" @click.stop="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon size="48" style="color: var(--text-placeholder)"><WarningFilled /></el-icon>
            <p v-if="hasActiveFilter">
              未找到符合条件的 Bug
              <el-button type="primary" link @click="handleResetAllFilters">清除筛选</el-button>
            </p>
            <p v-else>暂无 Bug 记录</p>
          </div>
        </template>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredList.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </div>

    <BugDialog
      v-model:visible="dialogVisible"
      :editing-id="editingId"
      :initial-form="editingForm"
      :user-list="userList"
      :project-list="projectList"
      :version-options="versionOptions"
      @saved="fetchList"
    />

    <BugDetailDrawer
      v-model:visible="detailVisible"
      :bug="detailBug"
      @edit="handleEdit"
      @resolve="handleResolve"
      @activate="handleActivate"
      @statusChange="handleStatusChange"
      @delete="handleDelete"
    />

    <BugResolveDialog
      v-model:visible="resolveVisible"
      :bug-id="resolvingBugId"
      @saved="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, computed, onMounted, nextTick,
} from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search, Filter, Plus, Delete, ArrowDown, WarningFilled,
  UserFilled, EditPen, Clock, CircleCloseFilled, CircleCheckFilled,
} from '@element-plus/icons-vue';
import {
  getBugList, updateBug, activateBug, deleteBug, batchDeleteBug,
} from '@/api/bug';
import { getUserList } from '@/api/user';
import { getProjectList } from '@/api/project';
import { getVersionList } from '@/api/version';
import BugDialog from './components/BugDialog.vue';
import BugDetailDrawer from './components/BugDetailDrawer.vue';
import BugResolveDialog from './components/BugResolveDialog.vue';

const store = useStore();
const route = useRoute();
const currentUserId = computed(() => store.getters.userId);

const severityOptions = ['致命', '严重', '一般', '轻微', '建议'];
const statusOptions = ['待处理', '处理中', '已解决', '已关闭', '已拒绝'];

const avatarGradients = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
];
function avatarGradientStyle(name) {
  if (!name) return { background: avatarGradients[0], color: '#fff' };
  return { background: avatarGradients[name.charCodeAt(0) % avatarGradients.length], color: '#fff' };
}

const bugList = ref([]);
const loading = ref(false);
const userList = ref([]);
const projectList = ref([]);
const versionOptions = ref([]);

const viewMode = ref('all');
const queryParams = ref({
  title: '',
  severity: '',
  status: '',
  priority: '',
  versionId: null,
});
const projectFilter = ref('');
const currentPage = ref(1);
const pageSize = ref(20);
const selectedIds = ref([]);

const dialogVisible = ref(false);
const editingId = ref(null);
const editingForm = ref(null);
const detailVisible = ref(false);
const detailBug = ref(null);
const resolveVisible = ref(false);
const resolvingBugId = ref(null);

const debounceTimer = ref(null);
function debounceFetch() {
  clearTimeout(debounceTimer.value);
  debounceTimer.value = setTimeout(() => {
    currentPage.value = 1;
    fetchList();
  }, 300);
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await getBugList();
    const d = res.data;
    bugList.value = Array.isArray(d) ? d : (d?.list || d?.results || []);
  } finally {
    loading.value = false;
  }
}

const stats = computed(() => {
  const list = bugList.value;
  return {
    total: list.length,
    mine: list.filter((b) => b.assignee === currentUserId.value).length,
    created: list.filter((b) => b.reporter === currentUserId.value).length,
    open: list.filter((b) => !['已解决', '已关闭'].includes(b.status)).length,
    fatal: list.filter((b) => ['致命', '严重'].includes(b.severity)).length,
    resolved: list.filter((b) => b.status === '已解决').length,
  };
});

const filteredList = computed(() => {
  let list = Array.isArray(bugList.value) ? [...bugList.value] : [];
  if (viewMode.value === 'mine') {
    list = list.filter((b) => b.assignee === currentUserId.value);
  } else if (viewMode.value === 'created') {
    list = list.filter((b) => b.reporter === currentUserId.value);
  } else if (viewMode.value === 'open') {
    list = list.filter((b) => !['已解决', '已关闭'].includes(b.status));
  } else if (viewMode.value === 'fatal') {
    list = list.filter((b) => ['致命', '严重'].includes(b.severity));
  } else if (viewMode.value === 'resolved') {
    list = list.filter((b) => b.status === '已解决');
  }
  const q = queryParams.value;
  if (q.title) list = list.filter((b) => b.title?.includes(q.title));
  if (q.severity) list = list.filter((b) => b.severity === q.severity);
  if (q.status) list = list.filter((b) => b.status === q.status);
  if (q.priority) list = list.filter((b) => b.priority === q.priority);
  if (q.versionId) list = list.filter((b) => b.version === q.versionId);
  if (projectFilter.value) list = list.filter((b) => b.project_name === projectFilter.value);
  return list;
});

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredList.value.slice(start, start + pageSize.value);
});

const hasMoreFilter = computed(() => !!queryParams.value.versionId);
const moreFilterCount = computed(() => (queryParams.value.versionId ? 1 : 0));

const hasActiveFilter = computed(() => {
  const q = queryParams.value;
  return !!(q.title || q.severity || q.status || q.priority || q.versionId || projectFilter.value || viewMode.value !== 'all');
});

function handleResetAllFilters() {
  handleReset();
  viewMode.value = 'all';
  projectFilter.value = '';
}

function switchView(mode) {
  viewMode.value = mode;
  currentPage.value = 1;
}

function handleSearch() {
  currentPage.value = 1;
}

function handleReset() {
  queryParams.value = {
    title: '',
    severity: '',
    status: '',
    priority: '',
    versionId: null,
  };
  currentPage.value = 1;
  fetchList();
}

function clearProjectFilter() {
  projectFilter.value = '';
}

function onSelectionChange(rows) {
  selectedIds.value = rows.map((r) => r.id);
}

function handleAdd() {
  editingId.value = null;
  editingForm.value = null;
  dialogVisible.value = true;
}

function handleEdit(row) {
  detailVisible.value = false;
  editingId.value = row.id;
  editingForm.value = {
    title: row.title,
    module: row.module,
    bugType: row.bug_type,
    severity: row.severity,
    priority: row.priority,
    assignee: row.assignee,
    project: row.project,
    versionId: row.version,
    stepsToReproduce: row.steps_to_reproduce,
    remark: row.remark,
  };
  dialogVisible.value = true;
}

function handleRowClick(row, column, event) {
  if (column?.type === 'selection') return;
  handleDetail(row);
}

function handleDetail(row) {
  detailBug.value = row;
  detailVisible.value = true;
}

function handleResolve(row) {
  detailVisible.value = false;
  resolvingBugId.value = row.id;
  resolveVisible.value = true;
}

async function handleActivate(row) {
  try {
    await activateBug(row.id);
    ElMessage.success('Bug已激活');
    fetchList();
  } catch {
    // 激活失败
  }
}

async function handleStatusChange(row, val) {
  if (val === '已解决') {
    handleResolve(row);
    return;
  }
  if (['已关闭', '已拒绝'].includes(val)) {
    try {
      await ElMessageBox.confirm(`确定将状态切换为「${val}」吗？`, '状态变更确认', { type: 'warning' });
    } catch {
      return;
    }
  }
  try {
    await updateBug(row.id, { status: val });
    row.status = val;
    ElMessage.success('状态已更新');
  } catch {
    // 更新失败
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除 Bug「${row.title}」吗？`, '删除确认', { type: 'warning' });
  await deleteBug(row.id);
  ElMessage.success('已删除');
  detailVisible.value = false;
  fetchList();
}

async function handleBatchDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 条 Bug 吗？`, '批量删除', { type: 'warning' });
  await batchDeleteBug(selectedIds.value);
  ElMessage.success('批量删除成功');
  selectedIds.value = [];
  fetchList();
}

onMounted(async () => {
  await fetchList();

  // 如果 URL 带 openId 参数，自动打开对应 Bug 详情
  const { openId } = route.query;
  if (openId) {
    await nextTick();
    const target = bugList.value.find((b) => String(b.id) === String(openId));
    if (target) {
      handleDetail(target);
    }
  }

  const [uRes, pRes, vRes] = await Promise.all([
    getUserList(),
    getProjectList(),
    getVersionList(),
  ]);
  userList.value = (uRes.data || []).map((u) => ({
    id: u.id,
    label: u.first_name || u.username,
    avatar: u.avatar,
    dept: u.dept || '',
  }));
  projectList.value = pRes.data?.list || pRes.data || [];
  versionOptions.value = vRes.data?.list || vRes.data || [];
});
</script>

<style scoped lang="scss">
.bug-view {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── KPI Pills ── */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
.kpi-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-card);
  border-radius: 12px;
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  &:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); }
  &.active { box-shadow: 0 0 0 2px var(--el-color-primary), var(--shadow-card); }
  &.fatal.active { box-shadow: 0 0 0 2px #c0392b, var(--shadow-card); }
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
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.selected-tip {
  font-size: 13px;
  color: var(--el-color-primary);
  font-weight: 500;
}
.filter-badge {
  margin-left: 4px;
  :deep(.el-badge__content) { top: -2px; }
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

.bug-row { cursor: pointer; }

.bug-title-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.severity-dot {
  display: inline-block;
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  &.sev-致命 { background: var(--el-color-danger); }
  &.sev-严重 { background: var(--el-color-warning); }
  &.sev-一般 { background: var(--el-color-primary); }
  &.sev-轻微 { background: var(--el-color-success); }
  &.sev-建议 { background: var(--text-secondary); }
}
.bug-title {
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.priority-dot {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  &.priority-p0 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.priority-p1 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.priority-p2 { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.priority-p3 { background: var(--bg-hover); color: var(--text-secondary); }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  :deep(.el-icon) { display: inline-flex; }
  &.status-待处理 { background: var(--bg-hover); color: var(--text-secondary); }
  &.status-处理中 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.status-已解决 { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.status-已关闭 { background: var(--bg-hover); color: var(--text-regular); }
  &.status-已拒绝 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-primary);
}

.version-tag {
  display: inline-block;
  padding: 1px 7px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 4px;
  font-size: 12px;
}

.empty-text { color: var(--text-placeholder); font-size: 13px; }
.time-text { font-size: 13px; color: var(--text-regular); }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  color: var(--text-secondary);
  p { margin-top: 12px; font-size: 14px; }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 1100px) { .kpi-strip { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 640px) { .kpi-strip { grid-template-columns: repeat(2, 1fr); } }
</style>
