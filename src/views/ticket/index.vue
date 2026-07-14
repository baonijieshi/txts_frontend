<template>
  <div class="ticket-view">
    <!-- KPI 统计卡片 -->
    <div class="kpi-strip">
      <div
        v-for="item in statItems"
        :key="item.key"
        :class="['kpi-pill', { active: viewMode === item.key }, item.cls]"
        @click="switchView(item.key)"
      >
        <div class="kpi-icon" :style="{ background: item.gradient }">
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
        </div>
        <div class="kpi-body">
          <span class="kpi-value">{{ stats[item.key] }}</span>
          <span class="kpi-label">{{ item.label }}</span>
        </div>
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

          <el-popover placement="bottom-start" :width="280" trigger="click">
            <template #reference>
              <el-button :type="moreFilterCount > 0 ? 'primary' : ''" plain size="small">
                <el-icon><Filter /></el-icon>
                <span v-if="moreFilterCount > 0" class="filter-count">{{ moreFilterCount }}</span>
              </el-button>
            </template>
            <el-form :model="queryParams" label-width="60px" size="small">
              <el-form-item label="版本">
                <el-select v-model="queryParams.versionId" placeholder="全部" clearable filterable style="width:100%">
                  <el-option v-for="v in versionList" :key="v.id" :label="v.name" :value="v.id" />
                </el-select>
              </el-form-item>
              <div style="text-align:right; margin-top:4px">
                <el-button size="small" @click="handleReset">清空</el-button>
                <el-button size="small" type="primary" @click="handleSearch">应用</el-button>
              </div>
            </el-form>
          </el-popover>
        </div>

        <div class="toolbar-right">
          <el-button plain @click="handleExportCSV">
            <el-icon><Download /></el-icon>导出
          </el-button>
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
            <div class="empty-icon-wrap">
              <el-icon :size="48"><Tickets /></el-icon>
            </div>
            <p class="empty-title">暂无线上问题</p>
            <p class="empty-desc" v-if="!hasActiveFilter">还没有记录任何线上问题，点击下方按钮开始记录</p>
            <p class="empty-desc" v-else>没有符合筛选条件的问题</p>
            <div class="empty-actions">
              <el-button v-if="hasActiveFilter" @click="handleReset">清除筛选</el-button>
              <el-button v-else type="primary" @click="handleAdd">
                <el-icon><Plus /></el-icon>提交第一个问题
              </el-button>
            </div>
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
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search, Filter, Plus, Delete, Tickets, Download,
  UserFilled, Clock, WarningFilled, EditPen,
} from '@element-plus/icons-vue';
import { getTicketList, getTicketStats, deleteTicket, updateTicket } from '@/api/ticket';
import { exportToCSV } from '@/utils/export';
import { getVersionList } from '@/api/version';
import { getUserList } from '@/api/user';
import { STEPS, STEP_ROLE_MAP, typeOptions } from './ticketConstants';
import TicketDialog from './components/TicketDialog.vue';
import TicketDetailDrawer from './components/TicketDetailDrawer.vue';

const store = useStore();
const route = useRoute();
const router = useRouter();
const currentUserId = computed(() => store.state.user.id);

const list = ref([]);
const total = ref(0);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const userList = ref([]);
const testUserList = ref([]);
const devUserList = ref([]);
const versionList = ref([]);
const selectedIds = ref([]);
const viewMode = ref('mine');

const defaultQuery = () => ({
  ticket_id: '',
  ticket_type: '',
  priority: '',
  status: '',
  versionId: null,
  test_assignee: null,
  dev_assignee: null,
  reporter: null,
});
const queryParams = ref(defaultQuery());

const stats = ref({ total: 0, mine: 0, created: 0, open: 0, urgent: 0 });

const statItems = [
  { key: 'total', label: '全部问题', cls: '', icon: Tickets, gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { key: 'mine', label: '待我处理', cls: 'primary', icon: UserFilled, gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
  { key: 'open', label: '处理中', cls: 'warning', icon: Clock, gradient: 'linear-gradient(135deg, #fa709a, #fee140)' },
  { key: 'urgent', label: 'P0 紧急', cls: 'danger', icon: WarningFilled, gradient: 'linear-gradient(135deg, #e74c3c, #c0392b)' },
  { key: 'created', label: '我提交的', cls: 'info', icon: EditPen, gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
];

async function fetchStats() {
  try {
    const res = await getTicketStats();
    if (res.data) stats.value = res.data;
  } catch { /* ignore */ }
}

const moreFilterCount = computed(() => queryParams.value.versionId ? 1 : 0);

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



async function fetchVersions() {
  try {
    const res = await getVersionList();
    versionList.value = res.data?.list || res.data || [];
  } catch { /* ignore */ }
}

onMounted(() => {
  fetchStats();
  fetchList();
  fetchUsers();
  fetchVersions();
  if (route.query.create) {
    // 等数据加载完成后自动打开新建弹窗
    setTimeout(() => {
      handleAdd();
      router.replace({ query: {} });
    }, 300);
  }
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

function handleExportCSV() {
  exportToCSV(list.value, [
    { label: '编号', value: 'ticket_id' },
    { label: '标题', value: 'title' },
    { label: '类型', value: 'ticket_type' },
    { label: '优先级', value: 'priority' },
    { label: '模块', value: 'module_name' },
    { label: '版本', value: 'version_name' },
    { label: '处理人', value: 'assignee_name' },
    { label: '状态', value: 'status' },
    { label: '创建时间', value: 'created_at' },
  ], '线上问题列表');
}

</script>

<style scoped lang="scss">
.ticket-view {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── KPI 统计卡片 ── */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
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
  &:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,0.08); }
  &.active { box-shadow: 0 0 0 2px var(--el-color-primary), var(--shadow-card); }
  &.danger.active { box-shadow: 0 0 0 2px var(--el-color-danger), var(--shadow-card); }
}

.kpi-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; color: #fff; box-shadow: 0 3px 8px rgba(0,0,0,.15);
}

.kpi-body { flex: 1; min-width: 0; }
.kpi-value { display: block; font-size: 22px; font-weight: 700; color: var(--text-primary); line-height: 1.1; }
.kpi-label { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 2px; font-weight: 500; }

/* ── 主卡片 ── */
.main-card {
  border-radius: 14px;
  border: 1px solid var(--border-light);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 4px 20px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  :deep(.el-card__body) { padding: 20px; }
}

/* ── 工具栏 ── */
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
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

/* ── 现代表格 ── */
:deep(.el-table) {
  --el-table-border-color: transparent;
  --el-table-header-bg-color: var(--bg-elevated);

  th.el-table__cell {
    background: var(--bg-elevated);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    font-weight: 650;
    font-size: 11px;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
    text-transform: uppercase;
    border-bottom: 2px solid var(--border-light) !important;
    border-right: none !important;
    padding: 12px 0;
  }

  td.el-table__cell {
    border-bottom: 1px solid var(--border-light) !important;
    border-right: none !important;
    padding: 14px 0;
    vertical-align: middle;
  }

  .el-table__body tr:hover > td {
    background: var(--bg-hover) !important;
  }

  tr:last-child td { border-bottom: none !important; }

  .el-table__cell { border-right: none !important; }
}

/* ── 表格内容 ── */
.ticket-id {
  font-size: 12px;
  color: var(--el-color-primary);
  font-family: 'SF Mono', 'Cascadia Code', monospace;
  font-weight: 600;
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%; flex-shrink: 0;

  &.type-问题 { background: var(--el-color-danger); box-shadow: 0 0 0 3px var(--el-color-danger-light-8); }
  &.type-需求 { background: var(--el-color-primary); box-shadow: 0 0 0 3px var(--el-color-primary-light-8); }
  &.type-咨询 { background: var(--el-color-warning); box-shadow: 0 0 0 3px var(--el-color-warning-light-8); }
  &.type-其他 { background: var(--text-secondary); }
}

.title-text {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.pri-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2px;

  &.pri-p0 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.pri-p1 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.pri-p2 { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.pri-p3 { background: var(--bg-hover); color: var(--text-secondary); }
}

.step-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 12px;
  white-space: nowrap;
  font-weight: 550;

  &.done    { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.progress { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.review  { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.pending { background: var(--bg-hover); color: var(--text-regular); }
}

.module-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
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
  color: var(--text-placeholder);
  font-size: 13px;
}

.time-text {
  font-size: 13px;
  color: var(--text-regular);
}

/* ── 空状态 ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56px 0;
}
.empty-icon-wrap {
  color: var(--text-placeholder);
  opacity: .45;
  margin-bottom: 8px;
}
.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-regular);
  margin: 0 0 4px;
}
.empty-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 16px;
}
.empty-actions {
  display: flex;
  gap: 10px;
}

/* ── 分页 ── */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* ── 推进确认对话框 ── */
.advance-body {
  .advance-info {
    font-size: 14px;
    color: var(--text-regular);
    line-height: 2;
    strong { color: var(--text-primary); }
  }
}

@media (max-width: 1100px) { .kpi-strip { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 640px) { .kpi-strip { grid-template-columns: repeat(2, 1fr); } }
</style>