<template>
  <div class="ticket-view">
    <!-- 统计条 -->
    <div class="stats-strip">
      <div
        v-for="item in statItems"
        :key="item.key"
        :class="['stat-chip', { active: viewMode === item.key }]"
        @click="switchView(item.key)"
      >
        <span class="chip-label">{{ item.label }}</span>
        <span :class="['chip-value', item.cls]">{{ stats[item.key] }}</span>
      </div>
    </div>

    <el-card class="main-card">
      <!-- 工具栏 -->
      <div class="list-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="queryParams.ticket_id"
            placeholder="搜索编号或标题..."
            clearable
            style="width:200px"
            @input="debounceFetch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-select
            v-model="queryParams.ticket_type"
            placeholder="类型"
            clearable
            style="width:90px"
            @change="handleSearch"
          >
            <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
          </el-select>

          <el-select
            v-model="queryParams.priority"
            placeholder="优先级"
            clearable
            style="width:80px"
            @change="handleSearch"
          >
            <el-option v-for="p in ['P0','P1','P2','P3']" :key="p" :label="p" :value="p" />
          </el-select>

          <el-select
            v-model="queryParams.status"
            placeholder="进度"
            clearable
            style="width:120px"
            @change="handleSearch"
          >
            <el-option v-for="s in STEPS" :key="s" :label="s" :value="s" />
          </el-select>

          <el-popover placement="bottom-start" :width="340" trigger="click">
            <template #reference>
              <el-button :type="moreFilterCount > 0 ? 'primary' : ''" plain size="small">
                <el-icon><Filter /></el-icon>
                <span v-if="moreFilterCount > 0" class="filter-count">{{ moreFilterCount }}</span>
              </el-button>
            </template>
            <el-form :model="queryParams" label-width="80px" size="small">
              <el-form-item label="问题模块">
                <el-select v-model="queryParams.module" placeholder="全部" clearable filterable style="width:100%">
                  <el-option v-for="m in moduleList" :key="m.id" :label="m.fullName || m.name" :value="m.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="当前处理人">
                <UserCascader v-model="queryParams.assignee" :user-list="userList" placeholder="全部" />
              </el-form-item>
              <el-form-item label="提交人">
                <UserCascader v-model="queryParams.reporter" :user-list="userList" placeholder="全部" />
              </el-form-item>
              <div style="text-align:right; margin-top:4px">
                <el-button size="small" @click="handleReset">清空</el-button>
                <el-button size="small" type="primary" @click="handleSearch">应用</el-button>
              </div>
            </el-form>
          </el-popover>
        </div>

        <div class="toolbar-right">
          <template v-if="selectedIds.length > 0">
            <span class="selected-tip">已选 {{ selectedIds.length }} 项</span>
            <el-button size="small" type="danger" plain @click="handleBatchDelete">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
          <el-button type="primary" size="small" @click="handleAdd">
            <el-icon><Plus /></el-icon>提交问题
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="list"
        style="width:100%"
        row-key="id"
        @selection-change="onSelectionChange"
        @row-click="handleDetail"
      >
        <el-table-column type="selection" width="40" @click.stop />
        <el-table-column prop="ticket_id" label="编号" width="125" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="ticket-id">{{ row.ticket_id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="title-cell">
              <span :class="['type-dot', `type-${row.ticket_type}`]" :title="row.ticket_type" />
              <span class="title-text">{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="68" align="center">
          <template #default="{ row }">
            <span :class="['pri-tag', `pri-${row.priority?.toLowerCase()}`]">{{ row.priority }}</span>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="110">
          <template #default="{ row }">
            <span :class="['step-badge', stepBadgeClass(row.status)]">{{ row.status }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="module_name" label="模块" width="100" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.module_name" class="module-tag">{{ row.module_name }}</span>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>
        <el-table-column label="处理人" width="100">
          <template #default="{ row }">
            <div v-if="row.assignee_name" class="user-cell">
              <el-avatar :size="20" :src="row.assignee_avatar || ''">
                <span>{{ String(row.assignee_name).charAt(0) }}</span>
              </el-avatar>
              <span>{{ row.assignee_name }}</span>
            </div>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="145">
          <template #default="{ row }">
            <span class="time-text">{{ row.created_at }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click.stop="handleEdit(row)">编辑</el-button>
            <el-button size="small" link type="danger" @click.stop="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon size="48" style="color: var(--text-placeholder)"><Tickets /></el-icon>
            <p>暂无问题记录</p>
          </div>
        </template>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="fetchList"
          @size-change="() => { currentPage = 1; fetchList(); }"
        />
      </div>
    </el-card>

    <TicketDialog
      v-model:visible="dialogVisible"
      :editing-row="editingRow"
      :user-list="userList"
      :test-user-list="testUserList"
      :dev-user-list="devUserList"
      @saved="() => { fetchStats(); fetchList(); }"
    />

    <TicketDetailDrawer
      v-model:visible="detailVisible"
      :row="detailRow"
      @edit="handleEdit"
      @advance="handleAdvance"
      @updated="fetchList"
    />

    <!-- 推进流程确认对话框 -->
    <el-dialog
      v-model="advanceDialog.visible"
      title="推进流程"
      width="420px"
      :close-on-click-modal="false"
    >
      <div class="advance-body">
        <p class="advance-info">
          将问题「<strong>{{ advanceDialog.title }}</strong>」从
          <span class="step-badge pending">{{ advanceDialog.from }}</span>
          推进至
          <span class="step-badge" :class="advanceDialog.toBadge">{{ advanceDialog.to }}</span>
        </p>
        <el-form-item v-if="advanceDialog.roleLabel" label="处理人" style="margin-top:16px">
          <UserCascader
            v-model="advanceDialog.assigneeId"
            :user-list="userList"
            :placeholder="'默认指派：' + advanceDialog.defaultAssigneeName"
          />
        </el-form-item>
      </div>
      <template #footer>
        <el-button @click="advanceDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="advanceDialog.loading" @click="confirmAdvance">
          确认推进
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, reactive, computed, onMounted,
} from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search, Filter, Plus, Delete, Tickets,
} from '@element-plus/icons-vue';
import { getTicketList, getTicketStats, deleteTicket, updateTicket } from '@/api/ticket';
import { getUserList } from '@/api/user';
import { getModuleFlatList } from '@/api/module';
import UserCascader from '@/components/UserCascader.vue';
import { STEPS, STEP_ROLE_MAP, typeOptions } from './ticketConstants';
import TicketDialog from './components/TicketDialog.vue';
import TicketDetailDrawer from './components/TicketDetailDrawer.vue';

const store = useStore();
const currentUserId = computed(() => store.state.user.id);

const list = ref([]);
const total = ref(0);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const userList = ref([]);
const testUserList = ref([]);
const devUserList = ref([]);
const moduleList = ref([]);
const selectedIds = ref([]);
const viewMode = ref('mine');

const defaultQuery = () => ({
  ticket_id: '',
  ticket_type: '',
  priority: '',
  status: '',
  module: null,
  assignee: null,
  test_assignee: null,
  dev_assignee: null,
  reporter: null,
});
const queryParams = ref(defaultQuery());

const stats = ref({ total: 0, mine: 0, created: 0, open: 0, urgent: 0 });

const statItems = [
  { key: 'total', label: '全部', cls: '' },
  { key: 'mine', label: '待我处理', cls: 'primary' },
  { key: 'open', label: '处理中', cls: 'warning' },
  { key: 'urgent', label: 'P0紧急', cls: 'danger' },
  { key: 'created', label: '我提交的', cls: 'info' },
];

async function fetchStats() {
  try {
    const res = await getTicketStats();
    if (res.data) stats.value = res.data;
  } catch { /* ignore */ }
}

const moreFilterCount = computed(() => [
  queryParams.value.module,
  queryParams.value.assignee,
  queryParams.value.reporter,
].filter(Boolean).length);

const stepBadgeClass = (status) => {
  if (status === '处理完成') return 'done';
  if (['研发解决中', '测试验收中'].includes(status)) return 'progress';
  if (['测试完成待发布', '交付验收中'].includes(status)) return 'review';
  return 'pending';
};

async function fetchList() {
  loading.value = true;
  try {
    const params = {
      ...queryParams.value,
      page: currentPage.value,
      pageSize: pageSize.value,
    };
    if (viewMode.value === 'mine') params.assignee = currentUserId.value;
    if (viewMode.value === 'created') params.reporter = currentUserId.value;
    if (viewMode.value === 'open') params.open = 'true';
    if (viewMode.value === 'urgent') params.priority = 'P0';
    const res = await getTicketList(params);
    list.value = res.data?.list || res.data || [];
    total.value = res.data?.total || 0;
  } finally {
    loading.value = false;
  }
}

async function fetchUsers() {
  const res = await getUserList();
  const all = (res.data || []).map((u) => ({
    id: u.id,
    label: u.first_name || u.username,
    avatar: u.avatar || '',
    dept: u.dept || '',
  }));
  userList.value = all;
  testUserList.value = all;
  devUserList.value = all;
}

async function fetchModules() {
  const res = await getModuleFlatList();
  moduleList.value = res.data || [];
}

onMounted(() => {
  fetchStats();
  fetchList();
  fetchUsers();
  fetchModules();
});

let debounceTimer = null;
function debounceFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchList();
  }, 300);
}

function switchView(mode) {
  viewMode.value = mode;
  currentPage.value = 1;
  fetchList();
}

function handleSearch() {
  currentPage.value = 1;
  fetchList();
}

function handleReset() {
  queryParams.value = defaultQuery();
  currentPage.value = 1;
  fetchList();
}

function onSelectionChange(rows) {
  selectedIds.value = rows.map((r) => r.id);
}

async function handleBatchDelete() {
  await ElMessageBox.confirm(
    `确定删除选中的 ${selectedIds.value.length} 条记录吗？`,
    '批量删除',
    { type: 'warning' },
  );
  await Promise.all(selectedIds.value.map((id) => deleteTicket(id)));
  ElMessage.success('批量删除成功');
  selectedIds.value = [];
  fetchStats();
  fetchList();
}

const dialogVisible = ref(false);
const editingRow = ref(null);

function handleAdd() {
  editingRow.value = null;
  dialogVisible.value = true;
}

function handleEdit(row) {
  detailVisible.value = false;
  editingRow.value = row;
  dialogVisible.value = true;
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除「${row.title}」？`, '删除确认', { type: 'warning' });
  await deleteTicket(row.id);
  ElMessage.success('已删除');
  fetchStats();
  fetchList();
}

const detailVisible = ref(false);
const detailRow = ref(null);

function handleDetail(row) {
  detailRow.value = row;
  detailVisible.value = true;
}

// ── 推进流程（带确认对话框 + 智能指派）──
const advanceDialog = reactive({
  visible: false,
  loading: false,
  title: '',
  from: '',
  to: '',
  toBadge: '',
  roleLabel: '',
  defaultAssigneeName: '',
  assigneeId: null,
  _row: null,
  _nextIdx: 0,
});

function getUserName(uid) {
  if (!uid) return '';
  const u = userList.value.find((x) => x.id === uid);
  return u ? (u.label || '') : '';
}

function handleAdvance(row, delta) {
  const i = STEPS.indexOf(row.status);
  if (i === -1) return;
  const nextIdx = i + delta;
  if (nextIdx < 0 || nextIdx >= STEPS.length) return;

  const role = STEP_ROLE_MAP[nextIdx];
  const defaultUid = role ? (row[role.field] || '') : '';
  const defaultName = getUserName(defaultUid);

  const badgeMap = { 7: 'done', 3: 'progress', 4: 'progress', 5: 'review', 6: 'review' };

  advanceDialog.visible = true;
  advanceDialog.loading = false;
  advanceDialog.title = row.title;
  advanceDialog.from = row.status;
  advanceDialog.to = STEPS[nextIdx];
  advanceDialog.toBadge = badgeMap[nextIdx] || '';
  advanceDialog.roleLabel = role ? role.label : '';
  advanceDialog.defaultAssigneeName = defaultName;
  advanceDialog.assigneeId = defaultUid || null;
  advanceDialog._row = row;
  advanceDialog._nextIdx = nextIdx;
}

async function confirmAdvance() {
  advanceDialog.loading = true;
  try {
    const { _row, _nextIdx, assigneeId } = advanceDialog;
    const nextStatus = STEPS[_nextIdx];
    const role = STEP_ROLE_MAP[_nextIdx];

    const payload = { status: nextStatus };
    if (role && assigneeId) {
      payload[role.field] = assigneeId;
      // 同步更新当前处理人，让列表页"处理人"列也反映最新状态
      if (role.field !== 'assignee') {
        payload.assignee = assigneeId;
      }
    } else if (role && !assigneeId) {
      // 用户清空了选择，保持现状
    }

    await updateTicket(_row.id, payload);
    _row.status = nextStatus;
    if (role && assigneeId) {
      _row[role.field] = assigneeId;
      // 同步更新抽屉中显示的 name / avatar 字段
      const user = userList.value.find((u) => u.id === assigneeId);
      if (user) {
        const nameKey = role.field + '_name';
        const avatarKey = role.field + '_avatar';
        _row[nameKey] = user.label;
        _row[avatarKey] = user.avatar || '';
      }
      if (role.field !== 'assignee') {
        _row.assignee = assigneeId;
        // 当前处理人的 name/avatar 也需要同步
        if (user) {
          _row.assignee_name = user.label;
          _row.assignee_avatar = user.avatar || '';
        }
      }
    }
    advanceDialog.visible = false;
    fetchList();
  } catch { /* ignore */ }
  finally { advanceDialog.loading = false; }
}
// ── 推进流程 END ──
</script>

<style scoped lang="scss">
.ticket-view {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 紧凑统计条 */
.stats-strip {
  display: flex;
  gap: 0;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.stat-chip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-right: 1px solid var(--border-color);

  &:last-child { border-right: none; }
  &:hover { background: var(--bg-elevated); }
  &.active { background: var(--el-color-primary-light-9); }

  .chip-label {
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .chip-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    min-width: 24px;
    text-align: center;

    &.primary { color: var(--el-color-primary); }
    &.warning { color: var(--el-color-warning); }
    &.danger  { color: var(--el-color-danger); }
    &.info    { color: var(--text-secondary); }
  }

  &.active .chip-label { color: var(--el-color-primary); }
}

/* 主卡片 */
.main-card {
  :deep(.el-card__body) { padding: 16px; }
}

/* 工具栏 */
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
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
  color: var(--text-regular);
}

.filter-count {
  margin-left: 4px;
  background: var(--el-color-primary);
  color: #fff;
  border-radius: 10px;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
  display: inline-block;
}

/* 表格内容 */
.ticket-id {
  font-size: 12px;
  color: var(--el-color-primary);
  font-family: monospace;
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.type-问题 { background: var(--el-color-danger); }
  &.type-需求 { background: var(--el-color-primary); }
  &.type-咨询 { background: var(--el-color-warning); }
  &.type-其他 { background: var(--text-secondary); }
}

.title-text {
  font-size: 14px;
  color: var(--text-primary);
}

.pri-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;

  &.pri-p0 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.pri-p1 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.pri-p2 { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.pri-p3 { background: var(--bg-elevated); color: var(--text-secondary); }
}

.step-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  white-space: nowrap;

  &.done    { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.progress { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.review  { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.pending { background: var(--bg-elevated); color: var(--text-secondary); }
}

.module-tag {
  display: inline-block;
  padding: 1px 6px;
  background: var(--bg-elevated);
  color: var(--text-regular);
  border-radius: 3px;
  font-size: 12px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-primary);
}

.user-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 13px;
}

.time-text {
  font-size: 13px;
  color: var(--text-regular);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  color: var(--text-secondary);

  p { margin-top: 12px; font-size: 14px; }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 推进确认对话框 */
.advance-body {
  .advance-info {
    font-size: 14px;
    color: var(--text-regular);
    line-height: 2;

    strong { color: var(--text-primary); }
  }
}
</style>
