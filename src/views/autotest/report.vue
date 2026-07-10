<template>
  <div class="report-view">
    <!-- KPI 统计条 -->
    <div class="kpi-strip">
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)"><el-icon :size="18"><DataAnalysis /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ total }}</span><span class="kpi-label">全部报告</span></div>
      </div>
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7)"><el-icon :size="18"><CircleCheckFilled /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.passed }}</span><span class="kpi-label">通过</span></div>
      </div>
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)"><el-icon :size="18"><WarningFilled /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.failed }}</span><span class="kpi-label">失败</span></div>
      </div>
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe)"><el-icon :size="18"><TrendCharts /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.avgRate }}<span class="kpi-unit">%</span></span><span class="kpi-label">平均通过率</span></div>
      </div>
    </div>

    <!-- 表格区 -->
    <div class="table-section">
      <div class="list-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="query.scene_name"
            placeholder="搜索场景名称..."
            clearable
            style="width:220px"
            @input="debounceFetch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <ModernSelect
            v-model="query.status"
            :options="reportStatusOptions"
            placeholder="全部状态"
            clearable
            style="width:130px"
            @change="fetchReports"
          />
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width:240px"
            value-format="YYYY-MM-DD"
            @change="fetchReports"
          />
        </div>
        <el-button
          v-if="selectedRows.length > 0"
          type="danger"
          plain
          size="small"
          @click="handleBatchDelete"
        >
          删除选中 ({{ selectedRows.length }})
        </el-button>
      </div>

      <!-- 表格 -->
      <el-table
        :data="reports"
        v-loading="loading"
        style="width:100%"
        row-class-name="report-row"
        @selection-change="selectedRows = $event"
        @row-click="(row) => viewDetail(row)"
      >
        <el-table-column type="selection" width="46" @click.stop />
        <el-table-column prop="scene_name" label="场景名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="通过率" width="130" align="center">
          <template #default="{ row }">
            <div class="pass-rate-cell">
              <el-progress
                :percentage="row.pass_rate"
                :color="rateColor(row.pass_rate)"
                :stroke-width="6"
                :show-text="false"
                style="flex:1"
              />
              <span class="rate-text" :style="{ color: rateColor(row.pass_rate) }">
                {{ row.pass_rate }}%
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="步骤" width="90" align="center">
          <template #default="{ row }">
            <span class="step-text">
              <span class="step-pass">{{ row.passed_steps }}</span>
              <span class="step-sep">/</span>
              <span>{{ row.total_steps }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="90" align="center">
          <template #default="{ row }">
            <span class="time-text">{{ row.duration_ms }}ms</span>
          </template>
        </el-table-column>
        <el-table-column prop="env_name" label="环境" width="110" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.env_name" class="env-tag">{{ row.env_name }}</span>
            <span v-else class="time-text">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="executor_name" label="执行人" width="90" />
        <el-table-column label="执行时间" width="155">
          <template #default="{ row }">
            <span class="time-text">{{ row.created_at }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="danger" @click.stop="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon size="48" style="color: var(--text-placeholder)"><DataAnalysis /></el-icon>
            <p>暂无执行报告</p>
          </div>
        </template>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="(v) => { page = v; fetchReports(); }"
          @size-change="(v) => { pageSize = v; page = 1; fetchReports(); }"
        />
      </div>
    </div>

    <!-- 报告详情抽屉 -->
    <el-drawer
      v-model="detailVisible"
      title="报告详情"
      size="820px"
      destroy-on-close
    >
      <ReportDetail v-if="currentReport" :report="currentReport" />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted } from 'vue';
import { Search, DataAnalysis, CircleCheckFilled, WarningFilled, TrendCharts } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getReportList, getReportDetail, deleteReport } from '@/api/autotest';
import ModernSelect from '@/components/ModernSelect.vue';
import ReportDetail from './components/ReportDetail.vue';

const reports = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const query = ref({ status: '', scene_name: '' });
const dateRange = ref(null);
const selectedRows = ref([]);

const reportStatusOptions = [
  { label: '通过', value: '通过' },
  { label: '失败', value: '失败' },
  { label: '执行中', value: '执行中' },
];

// 统计（基于当前页数据，直观反映筛选结果）
const stats = computed(() => {
  const passed = reports.value.filter((r) => r.status === '通过').length;
  const failed = reports.value.filter((r) => r.status === '失败').length;
  const rates = reports.value.map((r) => r.pass_rate).filter((v) => v != null);
  const avgRate = rates.length
    ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
    : 0;
  return { passed, failed, avgRate };
});

let searchTimer = null;
function debounceFetch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(fetchReports, 300);
}

async function fetchReports() {
  loading.value = true;
  try {
    const params = {
      ...query.value,
      page: page.value,
      pageSize: pageSize.value,
    };
    if (dateRange.value) {
      [params.date_start, params.date_end] = dateRange.value;
    }
    const res = await getReportList(params);
    reports.value = res.data.list || [];
    total.value = res.data.total || 0;
  } finally {
    loading.value = false;
  }
}

// 详情抽屉
const detailVisible = ref(false);
const currentReport = ref(null);

async function viewDetail(row) {
  const res = await getReportDetail(row.id);
  currentReport.value = res.data;
  detailVisible.value = true;
}

// 删除
async function handleDelete(row) {
  await ElMessageBox.confirm('确定删除该报告吗？', '删除确认', { type: 'warning' });
  await deleteReport(row.id);
  ElMessage.success('已删除');
  reports.value = reports.value.filter((r) => r.id !== row.id);
  total.value -= 1;
}

async function handleBatchDelete() {
  await ElMessageBox.confirm(
    `确定删除选中的 ${selectedRows.value.length} 条报告吗？`,
    '批量删除',
    { type: 'warning' },
  );
  await Promise.all(selectedRows.value.map((r) => deleteReport(r.id)));
  ElMessage.success('已删除');
  fetchReports();
}

function statusTagType(s) {
  return { 通过: 'success', 失败: 'danger', 执行中: 'warning' }[s] || 'info';
}

function rateColor(rate) {
  if (rate === 100) return 'var(--el-color-success)';
  if (rate >= 60) return 'var(--el-color-warning)';
  return 'var(--el-color-danger)';
}

onMounted(fetchReports);
</script>

<style scoped lang="scss">
.report-view {
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
.kpi-unit { font-size: 13px; font-weight: 400; margin-left: 1px; }

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
  .toolbar-left { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
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

:deep(.report-row) { cursor: pointer; }

.pass-rate-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  .rate-text { font-size: 12px; font-weight: 600; white-space: nowrap; min-width: 34px; text-align: right; }
}

.step-text {
  font-size: 13px;
  .step-pass { color: var(--el-color-success); font-weight: 600; }
  .step-sep  { color: var(--text-placeholder); margin: 0 1px; }
}

.time-text { font-size: 12px; color: var(--text-secondary); }

.env-tag {
  font-size: 12px;
  color: var(--text-regular);
  background: var(--bg-elevated);
  padding: 1px 6px;
  border-radius: 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  color: var(--text-secondary);
  p { margin: 12px 0; font-size: 14px; }
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
