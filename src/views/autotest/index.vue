<template>
  <div class="autotest-view">
    <!-- KPI 统计条 -->
    <div class="kpi-strip">
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)"><el-icon :size="18"><DocumentChecked /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ total }}</span><span class="kpi-label">全部场景</span></div>
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
        <div class="kpi-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe)"><el-icon :size="18"><Clock /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ stats.pending }}</span><span class="kpi-label">未执行</span></div>
      </div>
    </div>

    <!-- 表格区 -->
    <div class="table-section">
      <div class="list-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="query.name"
            placeholder="搜索场景名称..."
            clearable
            style="width:220px"
            @input="debounceFetch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <ModernSelect
            v-model="query.status"
            :options="statusFilterOptions"
            placeholder="全部状态"
            clearable
            style="width:130px"
            @change="fetchScenes"
          />
        </div>
        <el-button type="primary" :icon="Plus" @click="openSceneDialog(null)">新建场景</el-button>
      </div>

      <!-- 表格 -->
      <el-table
        :data="scenes"
        v-loading="loading"
        style="width:100%"
        row-class-name="scene-row"
        @row-click="(row) => openReportDrawer(row)"
      >
        <el-table-column prop="name" label="场景名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="step_count" label="步骤数" width="75" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info" round>{{ row.step_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近状态" width="95" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.last_status)" size="small">{{ row.last_status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近执行" width="155">
          <template #default="{ row }">
            <span class="time-text">{{ row.last_run_at || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="creator_name" label="创建人" width="90" />
        <el-table-column prop="created_at" label="创建时间" width="155">
          <template #default="{ row }">
            <span class="time-text">{{ row.created_at }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center" @click.stop>
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click.stop="openSceneDialog(row)">编辑</el-button>
            <el-button size="small" link type="success" :loading="runningId === row.id" @click.stop="handleRun(row)">
              {{ runningId === row.id ? '执行中' : '执行' }}
            </el-button>
            <el-button size="small" link type="info" @click.stop="openReportDrawer(row)">报告</el-button>
            <el-button size="small" link type="danger" @click.stop="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon size="48" style="color: var(--text-placeholder)"><DocumentChecked /></el-icon>
            <p>暂无测试场景</p>
            <el-button type="primary" size="small" :icon="Plus" @click="openSceneDialog(null)">新建第一个场景</el-button>
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
          @current-change="(v) => { page = v; fetchScenes(); }"
          @size-change="(v) => { pageSize = v; page = 1; fetchScenes(); }"
        />
      </div>
    </div>

    <!-- 场景编辑弹窗 -->
    <el-dialog
      v-model="sceneDialogVisible"
      :title="editingScene ? '编辑场景' : '新建场景'"
      width="900px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <SceneEditor ref="sceneEditorRef" :scene="editingScene" />
      <template #footer>
        <el-button @click="sceneDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveScene">保存</el-button>
      </template>
    </el-dialog>

    <!-- 执行弹窗 -->
    <el-dialog v-model="runDialogVisible" title="执行场景" width="460px" :close-on-click-modal="false">
      <el-form label-width="90px" style="margin-top:8px">
        <el-form-item label="执行环境">
          <ModernSelect v-model="runForm.envId" :options="envOptions" placeholder="选择环境（可选）" clearable @change="onEnvChange" />
        </el-form-item>
        <el-form-item label="Base URL">
          <el-input v-model="runForm.base_url" placeholder="如 https://api.example.com" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="runDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="running" @click="confirmRun">开始执行</el-button>
      </template>
    </el-dialog>

    <!-- 报告抽屉 -->
    <el-drawer
      v-model="reportDrawerVisible"
      :title="`「${reportScene?.name}」执行报告`"
      size="780px"
      destroy-on-close
    >
      <div class="report-drawer-body">
        <!-- 报告列表 -->
        <div v-if="!currentReport" class="report-list-panel">
          <div v-if="reportLoading" class="report-loading">
            <el-skeleton :rows="4" animated />
          </div>
          <div v-else-if="reports.length === 0" class="report-empty">
            <el-empty description="暂无执行记录" :image-size="80" />
          </div>
          <div v-else class="report-list">
            <div
              v-for="r in reports"
              :key="r.id"
              class="report-item"
              @click="viewReportDetail(r)"
            >
              <div class="report-item-left">
                <el-tag :type="statusTagType(r.status)" size="small">{{ r.status }}</el-tag>
                <span class="report-time">{{ r.created_at }}</span>
                <span v-if="r.env_name" class="report-env">{{ r.env_name }}</span>
              </div>
              <div class="report-item-right">
                <el-progress
                  :percentage="r.pass_rate"
                  :status="r.pass_rate === 100 ? 'success' : 'exception'"
                  :stroke-width="6"
                  style="width:80px"
                />
                <span class="report-steps">{{ r.passed_steps }}/{{ r.total_steps }} 步</span>
                <span class="report-duration">{{ r.duration_ms }}ms</span>
                <el-button size="small" link type="danger" @click.stop="handleDeleteReport(r)">删除</el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 报告详情 -->
        <div v-else class="report-detail-panel">
          <div class="detail-nav">
            <el-button link :icon="ArrowLeft" @click="currentReport = null">返回列表</el-button>
          </div>
          <ReportDetail :report="currentReport" />
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted } from 'vue';
import {
  Plus, Search, ArrowLeft, DocumentChecked, CircleCheckFilled, WarningFilled, Clock,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getSceneList, createScene, updateScene, deleteScene, runScene,
  getReportList, getReportDetail, deleteReport,
} from '@/api/autotest';
import { getEnvList } from '@/api/apiManage';
import ModernSelect from '@/components/ModernSelect.vue';
import SceneEditor from './components/SceneEditor.vue';
import ReportDetail from './components/ReportDetail.vue';

// ── 列表 ──────────────────────────────────────────────────────
const scenes = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const query = ref({ name: '', status: '' });

const statusFilterOptions = [
  { label: '未执行', value: '未执行' },
  { label: '通过', value: '通过' },
  { label: '失败', value: '失败' },
];

const stats = computed(() => ({
  passed: scenes.value.filter((s) => s.last_status === '通过').length,
  failed: scenes.value.filter((s) => s.last_status === '失败').length,
  pending: scenes.value.filter((s) => s.last_status === '未执行').length,
}));

let searchTimer = null;
function debounceFetch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(fetchScenes, 300);
}

async function fetchScenes() {
  loading.value = true;
  try {
    const res = await getSceneList({ ...query.value, page: page.value, pageSize: pageSize.value });
    scenes.value = res.data.list || [];
    total.value = res.data.total || 0;
  } finally {
    loading.value = false;
  }
}

// ── 场景编辑 ──────────────────────────────────────────────────
const sceneDialogVisible = ref(false);
const editingScene = ref(null);
const saving = ref(false);
const sceneEditorRef = ref(null);

function openSceneDialog(scene) {
  editingScene.value = scene;
  sceneDialogVisible.value = true;
}

async function handleSaveScene() {
  const data = sceneEditorRef.value?.getData();
  if (!data) { ElMessage.error('请修复步骤中的 JSON 格式错误后再保存'); return; }
  if (!data.name?.trim()) { ElMessage.warning('请输入场景名称'); return; }
  saving.value = true;
  try {
    if (editingScene.value) {
      await updateScene(editingScene.value.id, data);
    } else {
      await createScene(data);
    }
    ElMessage.success('保存成功');
    sceneDialogVisible.value = false;
    fetchScenes();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除场景「${row.name}」吗？`, '删除确认', { type: 'warning' });
  await deleteScene(row.id);
  ElMessage.success('已删除');
  fetchScenes();
}

// ── 执行 ──────────────────────────────────────────────────────
const runDialogVisible = ref(false);
const running = ref(false);
const runningId = ref(null);
const runningScene = ref(null);
const runForm = ref({ envId: null, base_url: '', env_name: '' });
const envList = ref([]);
const envOptions = computed(() =>
  envList.value.map((e: any) => ({ label: e.name, value: e.id }))
);

async function handleRun(row) {
  runningScene.value = row;
  runForm.value = { envId: null, base_url: '', env_name: '' };
  const res = await getEnvList();
  envList.value = res.data || [];
  runDialogVisible.value = true;
}

function onEnvChange(id) {
  const env = envList.value.find((e) => e.id === id);
  if (env) {
    runForm.value.base_url = env.url;
    runForm.value.env_name = env.name;
  }
}

async function confirmRun() {
  running.value = true;
  runningId.value = runningScene.value.id;
  runDialogVisible.value = false;
  try {
    const res = await runScene(runningScene.value.id, {
      base_url: runForm.value.base_url,
      env_name: runForm.value.env_name,
    });
    const r = res.data;
    // 直接更新列表行状态，无需整页刷新
    const target = scenes.value.find((s) => s.id === runningScene.value.id);
    if (target) {
      target.last_status = r.status;
      target.last_run_at = r.created_at;
    }
    ElMessage[r.status === '通过' ? 'success' : 'error'](
      `执行完成：${r.passed_steps}/${r.total_steps} 步通过，耗时 ${r.duration_ms}ms`,
    );
  } finally {
    running.value = false;
    runningId.value = null;
  }
}

// ── 报告抽屉 ──────────────────────────────────────────────────
const reportDrawerVisible = ref(false);
const reportLoading = ref(false);
const reports = ref([]);
const reportScene = ref(null);
const currentReport = ref(null);

async function openReportDrawer(row) {
  reportScene.value = row;
  currentReport.value = null;
  reportDrawerVisible.value = true;
  reportLoading.value = true;
  try {
    const res = await getReportList({ scene_id: row.id, pageSize: 50 });
    reports.value = res.data.list || [];
  } finally {
    reportLoading.value = false;
  }
}

async function viewReportDetail(row) {
  const res = await getReportDetail(row.id);
  currentReport.value = res.data;
}

async function handleDeleteReport(row) {
  await ElMessageBox.confirm('确定删除该报告吗？', '删除确认', { type: 'warning' });
  await deleteReport(row.id);
  ElMessage.success('已删除');
  reports.value = reports.value.filter((r) => r.id !== row.id);
}

function statusTagType(status) {
  const map = {
    通过: 'success', 失败: 'danger', 执行中: 'warning', 未执行: 'info',
  };
  return map[status] || 'info';
}

onMounted(fetchScenes);
</script>

<style scoped lang="scss">
.autotest-view {
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

:deep(.scene-row) { cursor: pointer; }

.time-text { font-size: 12px; color: var(--text-secondary); }

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

/* ── 报告抽屉 ── */
.report-drawer-body { height: 100%; overflow-y: auto; }
.report-loading { padding: 16px; }
.report-empty { display: flex; justify-content: center; padding: 40px 0; }

.report-list { display: flex; flex-direction: column; gap: 8px; }

.report-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--bg-card);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(.34, 1.56, .64, 1);
  box-shadow: var(--shadow-card);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
  }

  .report-item-left { display: flex; align-items: center; gap: 10px; }
  .report-item-right { display: flex; align-items: center; gap: 12px; }
  .report-time { font-size: 13px; color: var(--text-regular); }
  .report-env  { font-size: 12px; color: var(--text-secondary); background: var(--bg-elevated); padding: 1px 8px; border-radius: 4px; }
  .report-steps { font-size: 12px; color: var(--text-regular); white-space: nowrap; }
  .report-duration { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
}

.detail-nav {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}
</style>
