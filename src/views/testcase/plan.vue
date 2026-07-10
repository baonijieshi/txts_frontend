<template>
  <div class="testplan-container">
    <!-- 统计卡片 -->
    <div class="kpi-strip">
      <div class="kpi-pill kpi-pill--primary">
        <div class="kpi-icon"><el-icon :size="20"><Calendar /></el-icon></div>
        <div class="kpi-body">
          <span class="kpi-value">{{ totalCount }}</span>
          <span class="kpi-label">全部计划</span>
        </div>
        <div class="kpi-spark"></div>
      </div>
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe)"><el-icon :size="18"><Clock /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.pending }}</span><span class="kpi-label">未开始</span></div>
      </div>
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)"><el-icon :size="18"><VideoPlay /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.running }}</span><span class="kpi-label">进行中</span></div>
      </div>
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7)"><el-icon :size="18"><CircleCheckFilled /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.done }}</span><span class="kpi-label">已完成</span></div>
      </div>
    </div>

    <el-card class="main-card">
      <!-- 工具栏 -->
      <div class="list-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="queryParams.name"
            placeholder="搜索计划名称..."
            clearable
            style="width:260px"
            @input="debounceFetch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width:130px" @change="handleSearch">
            <el-option label="未开始" value="未开始" />
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
            <el-option label="已关闭" value="已关闭" />
          </el-select>
          <UserCascader v-model="queryParams.creator" :user-list="userOptions" value-key="label" placeholder="创建人" width="140px" />
        </div>
        <div class="toolbar-right">
          <template v-if="selectedRows.length > 0">
            <span class="selected-hint">已选 {{ selectedRows.length }} 项</span>
            <el-button type="danger" plain @click="handleBatchDelete">
              <el-icon><Delete /></el-icon>批量删除
            </el-button>
          </template>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新建计划
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="plans"
        style="width:100%"
        row-key="id"
        row-class-name="plan-row"
        @selection-change="(rows) => selectedRows = rows"
        @row-click="(row, column) => { if (column?.type !== 'selection') handleDetail(row) }"
        @sort-change="handleSortChange"
      >
        <el-table-column type="selection" width="40" :selectable="() => true" />
        <el-table-column prop="name" label="计划名称" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="plan-name">{{ row.name }}</span>
            <el-icon class="row-arrow"><ArrowRight /></el-icon>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <span :class="['status-pill', `pill-${statusKey(row.status)}`]">
              <span class="pill-dot"></span>
              <span class="pill-label">{{ row.status }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="测试进度" min-width="240">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-tooltip placement="top" :show-after="400">
                <template #content>
                  <div class="progress-tooltip">
                    <div class="pt-row"><span class="pt-dot" style="background:var(--el-color-success)"></span>通过 {{ row.passCount }}</div>
                    <div class="pt-row"><span class="pt-dot" style="background:var(--el-color-danger)"></span>失败 {{ row.failCount }}</div>
                    <div class="pt-row"><span class="pt-dot" style="background:var(--el-color-warning)"></span>阻塞 {{ row.blockCount }}</div>
                    <div class="pt-row"><span class="pt-dot" style="background:var(--text-placeholder)"></span>跳过 {{ row.skipCount }}</div>
                    <div class="pt-row"><span class="pt-dot" style="background:var(--border-color)"></span>未执行 {{ row.pendingCount }}</div>
                  </div>
                </template>
                <div class="stacked-bar" v-if="row.totalCount > 0">
                  <div v-if="row.passCount > 0" class="sb-seg sb-pass" :style="{ flex: row.passCount }"></div>
                  <div v-if="row.failCount > 0" class="sb-seg sb-fail" :style="{ flex: row.failCount }"></div>
                  <div v-if="row.blockCount > 0" class="sb-seg sb-block" :style="{ flex: row.blockCount }"></div>
                  <div v-if="row.skipCount > 0" class="sb-seg sb-skip" :style="{ flex: row.skipCount }"></div>
                  <div v-if="row.pendingCount > 0" class="sb-seg sb-pending" :style="{ flex: row.pendingCount }"></div>
                </div>
                <div v-else class="stacked-bar stacked-bar--empty"></div>
              </el-tooltip>
              <span class="progress-text">{{ calcPassRate(row) }}%</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="versionName" label="关联版本" width="120" show-overflow-tooltip />
        <el-table-column label="创建人" width="100">
          <template #default="{ row }">
            <div class="creator-cell">
              <el-avatar :src="row.creatorAvatar" :size="20" :style="row.creatorAvatar ? {} : avatarGradientStyle(row.creatorName)">{{ row.creatorName?.charAt(0) }}</el-avatar>
              <span>{{ row.creatorName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="时间范围" width="200">
          <template #default="{ row }">
            <span class="time-text">
              {{ row.startDate || '—' }} ~ {{ row.endDate || '—' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" sortable="custom">
          <template #default="{ row }">
            <span class="time-text">{{ row.createdAt }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click.stop="handleEdit(row)">编辑</el-button>
            <el-button size="small" link type="danger" @click.stop="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon size="48" style="color: var(--text-placeholder)"><Calendar /></el-icon>
            <p>暂无测试计划</p>
            <el-button type="primary" size="small" :icon="Plus" @click="handleAdd">
              新建第一个计划
            </el-button>
          </div>
        </template>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="totalCount"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="fetchList"
          @size-change="() => { currentPage = 1; fetchList(); }"
        />
      </div>
    </el-card>

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑计划' : '新建计划'"
      width="600px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <div class="form-section">
          <div class="form-section-title">基本信息</div>
          <el-form-item label="计划名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入计划名称" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="form.status" placeholder="请选择状态" style="width:100%">
              <el-option label="未开始" value="未开始" />
              <el-option label="进行中" value="进行中" />
              <el-option label="已完成" value="已完成" />
              <el-option label="已关闭" value="已关闭" />
            </el-select>
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="关联版本">
                <el-select v-model="form.version" placeholder="请选择版本" clearable filterable style="width:100%">
                  <el-option v-for="v in versionOptions" :key="v.id" :label="v.name" :value="v.id" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="关联项目">
                <el-select v-model="form.project" placeholder="请选择项目" clearable filterable style="width:100%">
                  <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        <div class="form-section">
          <div class="form-section-title">时间与描述</div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="开始日期">
                <el-date-picker v-model="form.startDate" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结束日期">
                <el-date-picker v-model="form.endDate" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="计划描述">
            <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus, Delete, ArrowRight, ArrowDown, Calendar, Clock, VideoPlay, CircleCheckFilled } from '@element-plus/icons-vue';
import { avatarGradientStyle } from '@/utils/avatar';

import {
  getTestPlanList, getTestPlanStats, createTestPlan, updateTestPlan, deleteTestPlan,
} from '@/api/testcase';
import { getUserList } from '@/api/user';
import { getVersionList } from '@/api/version';
import { getProjectList } from '@/api/project';
import UserCascader from '@/components/UserCascader.vue';

const router = useRouter();

// ── 加载与选择状态 ────────────────────────────────────────────
const loading = ref(false);
const selectedRows = ref([]);
const tableRef = ref(null);

// ── 选项数据 ──────────────────────────────────────────────────
const userOptions = ref([]);
const versionOptions = ref([]);
const projectOptions = ref([]);

const fetchOptions = async () => {
  try {
    const [userRes, versionRes, projectRes] = await Promise.all([
      getUserList(),
      getVersionList({ page: 1, pageSize: 999 }),
      getProjectList({ page: 1, pageSize: 999 }),
    ]);
    userOptions.value = (userRes.data || []).map((u) => ({
      id: u.id,
      label: u.first_name || u.username,
      avatar: u.avatar || '',
      dept: u.dept || '',
    }));
    versionOptions.value = (versionRes.data.list || []).map((v) => ({ id: v.id, name: v.name }));
    projectOptions.value = (projectRes.data.list || []).map((p) => ({ id: p.id, name: p.name }));
  } catch { /* ignore */ }
};

// ── 列表 ──────────────────────────────────────────────────────
const plans = ref([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

const queryParams = ref({
  name: '',
  status: '',
  creator: '',
});

const stats = ref({ pending: 0, running: 0, done: 0, total: 0 });

const fetchStats = async () => {
  try {
    const res = await getTestPlanStats();
    if (res.data) {
      stats.value = {
        pending: res.data.pending || 0,
        running: res.data.running || 0,
        done: res.data.done || 0,
        total: res.data.total || 0,
      };
    }
  } catch { /* ignore */ }
};

let searchTimer = null;
function debounceFetch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(handleSearch, 300);
}

const fetchList = async () => {
  loading.value = true;
  try {
    const params = { page: currentPage.value, pageSize: pageSize.value };
    const q = queryParams.value;
    if (q.name) params.name = q.name;
    if (q.status) params.status = q.status;
    if (q.creator) params.creator = q.creator;
    if (sortOrdering.value) params.ordering = sortOrdering.value;
    const res = await getTestPlanList(params);
    plans.value = (res.data.list || []).map((p) => ({
      ...p,
      name: p.name || '',
      status: p.status || '未开始',
      creatorName: p.creator_name || '',
      creatorAvatar: p.creator_avatar || '',
      projectName: p.project_name || '',
      versionName: p.version_name || '',
      startDate: p.start_date || '',
      endDate: p.end_date || '',
      createdAt: p.created_at || '',
      totalCount: p.total_count || 0,
      passCount: p.pass_count || 0,
      failCount: p.fail_count || 0,
      blockCount: p.block_count || 0,
      skipCount: p.skip_count || 0,
      pendingCount: p.pending_count || 0,
    }));
    totalCount.value = res.data.total || 0;
  } catch { /* ignore */ }
  loading.value = false;
};

const handleSearch = () => { currentPage.value = 1; fetchList(); };

const sortOrdering = ref('');
const handleSortChange = ({ prop, order }) => {
  if (prop === 'createdAt') {
    if (order === 'ascending') sortOrdering.value = 'created_at';
    else if (order === 'descending') sortOrdering.value = '-created_at';
    else sortOrdering.value = '';
  }
  fetchList();
};

// ── 工具函数 ──────────────────────────────────────────────────
const statusKey = (s) => {
  const map = { 未开始: 'pending', 进行中: 'active', 已完成: 'done', 已关闭: 'closed' };
  return map[s] || 'pending';
};


const calcPassRate = (row) => {
  if (!row.totalCount) return 0;
  return Math.round((row.passCount / row.totalCount) * 100);
};

// ── 新建 / 编辑 ───────────────────────────────────────────────
const dialogVisible = ref(false);
const editingId = ref(null);
const formRef = ref(null);

const defaultForm = () => ({
  name: '',
  status: '未开始',
  version: null,
  project: null,
  startDate: '',
  endDate: '',
  description: '',
});

const form = ref(defaultForm());

const formRules = {
  name: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

const handleAdd = () => {
  editingId.value = null;
  form.value = defaultForm();
  dialogVisible.value = true;
};

const handleEdit = (row) => {
  editingId.value = row.id;
  form.value = {
    name: row.name,
    status: row.status,
    version: row.version || null,
    project: row.project || null,
    startDate: row.startDate || '',
    endDate: row.endDate || '',
    description: row.description || '',
  };
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    const payload = {
      name: form.value.name,
      status: form.value.status,
      version: form.value.version || null,
      project: form.value.project || null,
      start_date: form.value.startDate || null,
      end_date: form.value.endDate || null,
      description: form.value.description || '',
    };
    if (editingId.value) {
      await updateTestPlan(editingId.value, payload);
      ElMessage.success('计划已更新');
    } else {
      await createTestPlan(payload);
      ElMessage.success('计划已创建');
    }
    dialogVisible.value = false;
    fetchList();
  } catch { /* 校验失败 */ }
};

// ── 快捷状态切换 ──────────────────────────────────────────────
const handleQuickStatus = async (row, newStatus) => {
  if (row.status === newStatus) return;
  try {
    await updateTestPlan(row.id, { status: newStatus });
    row.status = newStatus;
    ElMessage.success(`状态已切换为「${newStatus}」`);
    fetchList();
  } catch { ElMessage.error('状态切换失败'); }
};

// ── 删除 ──────────────────────────────────────────────────────
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除计划「${row.name}」？删除后相关测试数据将无法恢复。`, '删除确认', { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' })
    .then(async () => {
      await deleteTestPlan(row.id);
      ElMessage.success('已删除');
      if (plans.value.length <= 1 && currentPage.value > 1) {
        currentPage.value -= 1;
      }
      fetchList();
    })
    .catch(() => {});
};

// ── 批量删除 ──────────────────────────────────────────────────
const handleBatchDelete = () => {
  const names = selectedRows.value.map((r) => `「${r.name}」`).join('、');
  ElMessageBox.confirm(
    `确定删除以下 ${selectedRows.value.length} 个计划？${names}，删除后相关测试数据将无法恢复。`,
    '批量删除确认',
    { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
  )
    .then(async () => {
      loading.value = true;
      const ids = selectedRows.value.map((r) => r.id);
      await Promise.all(ids.map((id) => deleteTestPlan(id).catch(() => {})));
      ElMessage.success(`已删除 ${ids.length} 个计划`);
      selectedRows.value = [];
      fetchList();
    })
    .catch(() => {});
};

// ── 跳转详情 ──────────────────────────────────────────────────
const handleDetail = (row) => {
  router.push(`/test/testplan/${row.id}`);
};

onMounted(() => { fetchOptions(); fetchList(); fetchStats(); });
</script>

<style scoped lang="scss">
.testplan-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// ── 统计卡片 ──────────────────────────────────────────────────
.kpi-strip {
  display: grid;
  grid-template-columns: 1.25fr 1fr 1fr 1fr;
  gap: 14px;

  @keyframes kpi-enter {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .kpi-pill {
    animation: kpi-enter 0.5s ease both;
    &:nth-child(1) { animation-delay: 0.05s; }
    &:nth-child(2) { animation-delay: 0.12s; }
    &:nth-child(3) { animation-delay: 0.19s; }
    &:nth-child(4) { animation-delay: 0.26s; }
  }
}
.kpi-pill {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 16px 18px;
  background: var(--bg-card);
  border-radius: 16px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 4px 16px rgba(0, 0, 0, 0.05);
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.35s ease;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
    pointer-events: none;
  }
  &:hover {
    transform: translateY(-3px);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.04),
      0 8px 32px rgba(0, 0, 0, 0.08);
    &::after { opacity: 1; }
  }
  &.kpi-pill--primary {
    padding: 18px 22px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.07), rgba(118, 75, 162, 0.05));
    border: 1px solid rgba(102, 126, 234, 0.15);
    backdrop-filter: blur(2px);
    box-shadow:
      0 1px 2px rgba(102, 126, 234, 0.04),
      0 4px 24px rgba(102, 126, 234, 0.08);
    .kpi-value { font-size: 30px; font-weight: 800; }
    .kpi-icon {
      width: 46px; height: 46px; border-radius: 14px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
  }
}
.kpi-spark {
  position: absolute;
  right: 14px; top: 50%;
  width: 52px; height: 52px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
  transform: translateY(-50%);
  pointer-events: none;
  animation: spark-pulse 3s ease-in-out infinite;
  @keyframes spark-pulse {
    0%, 100% { opacity: 0.6; transform: translateY(-50%) scale(1); }
    50% { opacity: 1; transform: translateY(-50%) scale(1.15); }
  }
}
.kpi-icon {
  width: 38px; height: 38px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; color: #fff;
  box-shadow: 0 3px 10px rgba(0,0,0,.12);
}
.kpi-body { flex: 1; min-width: 0; }
.kpi-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
  letter-spacing: -0.5px;
}
.kpi-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 3px;
  font-weight: 500;
  letter-spacing: 0.2px;
}

// ── 主卡片 ────────────────────────────────────────────────────
.main-card {
  border-radius: 16px;
  border: 1px solid var(--border-light);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 4px 20px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  :deep(.el-card__body) { padding: 20px 24px; }
}

// ── 工具栏 ────────────────────────────────────────────────────
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);

  .toolbar-left  { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .toolbar-right { display: flex; gap: 10px; align-items: center; }
}

.selected-hint {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  margin-right: 6px;
  padding: 4px 10px;
  background: var(--bg-hover);
  border-radius: 6px;
}

// ── 表格 ──────────────────────────────────────────────────────
:deep(.el-table) {
  --el-table-border-color: transparent;

  th.el-table__cell {
    background: var(--bg-elevated);
    font-weight: 600;
    font-size: 12px;
    color: var(--text-secondary);
    letter-spacing: 0.3px;
    border-bottom: 1px solid var(--border-light);
  }
}

:deep(.plan-row) {
  cursor: pointer;
  transition: background 0.15s ease;
}

.el-table {
  :deep(.plan-row:hover > td) {
    background: var(--bg-hover) !important;
    &:first-child {
      position: relative;
      &::before {
        content: '';
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 3px;
        background: var(--el-color-primary);
        border-radius: 0 2px 2px 0;
      }
    }
  }
}

.plan-name {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  transition: color 0.15s ease;
  &:hover { color: var(--el-color-primary); }
}

.row-arrow {
  opacity: 0;
  transform: translateX(-6px);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 14px;
  color: var(--text-secondary);
  vertical-align: -1px;
  margin-left: 4px;
}

:deep(.plan-row:hover) .row-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--el-color-primary);
}

.progress-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

// 分段堆叠进度条
.stacked-bar {
  display: flex;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  gap: 2px;
  flex: 1;
  min-width: 90px;
  background: var(--border-color);

  .sb-seg {
    transition: flex 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    &:first-child { border-radius: 5px 0 0 5px; }
    &:last-child { border-radius: 0 5px 5px 0; }
    &:only-child { border-radius: 5px; }
  }
  .sb-pass    { background: var(--el-color-success); }
  .sb-fail    { background: var(--el-color-danger); }
  .sb-block   { background: var(--el-color-warning); }
  .sb-skip    { background: var(--text-placeholder); }
  .sb-pending { background: transparent; }

  &--empty {
    background: var(--border-color);
    flex: 1;
  }
}

.progress-text {
  font-size: 13px;
  color: var(--text-regular);
  white-space: nowrap;
  font-weight: 700;
  min-width: 38px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

// 进度 tooltip
.progress-tooltip {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  min-width: 110px;
  padding: 4px 0;
  .pt-row {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .pt-dot {
    width: 9px; height: 9px;
    border-radius: 3px;
    flex-shrink: 0;
  }
}

.creator-cell {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
}

.time-text { font-size: 13px; color: var(--text-secondary); }

// ── 空状态 ────────────────────────────────────────────────────
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 56px 0;
  color: var(--text-secondary);

  .el-icon {
    opacity: 0.5;
    transition: opacity 0.3s ease;
  }

  p {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    color: var(--text-placeholder);
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light);
}

// ── 弹窗表单分组 ──────────────────────────────────────────────
.form-section {
  margin-bottom: 4px;

  & + .form-section {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid var(--border-light);
  }
}

.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 14px;
}


// ── 状态胶囊 ──────────────────────────────────────────────
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 8px 0 7px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 550;
  user-select: none;
  white-space: nowrap;

  .pill-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  &.pill-pending {
    background: transparent;
    color: var(--text-placeholder);
    border: 1px solid var(--border-color);
    .pill-dot { background: var(--border-heavy); }
  }
  &.pill-active {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    .pill-dot { background: var(--el-color-primary); }
  }
  &.pill-done {
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
    .pill-dot { background: var(--el-color-success); }
  }
  &.pill-closed {
    background: var(--bg-hover);
    color: var(--text-secondary);
    .pill-dot { background: var(--text-secondary); }
  }
}


// ── 响应式 ────────────────────────────────────────────────────
@media (max-width: 1100px) {
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
  .kpi-pill--primary { grid-column: 1 / -1; }
  .testplan-container { padding: 16px 20px; }
}
@media (max-width: 640px) {
  .kpi-strip { grid-template-columns: 1fr; }
  .testplan-container { padding: 12px 14px; }
}</style>
