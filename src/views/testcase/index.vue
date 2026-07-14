<template>
  <div class="testcase-container">
    <!-- 统计卡片 -->
    <div class="kpi-strip">
      <div class="kpi-pill kpi-pill--primary">
        <div class="kpi-icon"><el-icon :size="20"><DocumentChecked /></el-icon></div>
        <div class="kpi-body">
          <span class="kpi-value">{{ totalCount }}</span>
          <span class="kpi-label">全部用例</span>
        </div>
        <div class="kpi-spark"></div>
      </div>
      <div class="kpi-pill">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)"><el-icon :size="18"><WarningFilled /></el-icon></div>
        <div class="kpi-body"><span class="kpi-value">{{ p0Count }}</span><span class="kpi-label">P0 用例</span></div>
      </div>
    </div>

    <div class="table-section">
      <!-- Tab 切换 -->
      <div class="tab-segmented">
        <el-segmented v-model="activeTab" :options="tabOptions" size="default" @change="handleTabChange" />
      </div>

      <!-- 工具栏 -->
      <div class="list-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="queryParams.title"
            placeholder="搜索用例标题..."
            clearable
            style="width:220px"
            @input="debounceFetch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <!-- 快捷筛选 -->
          <el-select v-model="queryParams.priority" placeholder="优先级" clearable style="width:100px" @change="handleSearch">
            <el-option label="P0" value="P0" />
            <el-option label="P1" value="P1" />
            <el-option label="P2" value="P2" />
            <el-option label="P3" value="P3" />
          </el-select>
          <el-cascader
            v-model="queryParams.module"
            :options="moduleOptions"
            placeholder="所属模块"
            clearable
            filterable
            style="width:150px"
            :props="{ checkStrictly: true, emitPath: false }"
            @change="handleSearch"
          />

          <!-- 更多筛选展开 -->
          <el-popover placement="bottom-start" :width="520" trigger="click">
            <template #reference>
              <el-button :type="hasMoreFilter ? 'primary' : 'default'" plain size="default">
                <el-icon><Filter /></el-icon>
                更多筛选
                <el-badge v-if="moreFilterCount > 0" :value="moreFilterCount" class="filter-badge" />
              </el-button>
            </template>
            <el-form :model="queryParams" label-width="80px" size="small">
              <el-row :gutter="12">
                <el-col v-if="activeTab === 'version'" :span="12">
                  <el-form-item label="关联版本">
                    <el-select v-model="queryParams.version" placeholder="全部" clearable filterable style="width:100%">
                      <el-option v-for="v in versionOptions" :key="v.id" :label="v.name" :value="v.id" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="用例类型">
                    <el-select v-model="queryParams.type" placeholder="全部" clearable style="width:100%">
                      <el-option label="功能测试" value="功能测试" />
                      <el-option label="性能测试" value="性能测试" />
                      <el-option label="接口测试" value="接口测试" />
                      <el-option label="安全测试" value="安全测试" />
                      <el-option label="兼容性测试" value="兼容性测试" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="创建人">
                    <UserCascader v-model="queryParams.creator" :user-list="userOptions" value-key="label" placeholder="全部" />
                  </el-form-item>
                </el-col>
                <el-col v-if="activeTab === 'version'" :span="12">
                  <el-form-item label="关联需求">
                    <el-select v-model="queryParams.storyId" placeholder="全部" clearable filterable style="width:100%">
                      <el-option v-for="s in storyOptions" :key="s.id" :label="s.title" :value="s.id" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              <div style="text-align:right; margin-top:4px">
                <el-button size="small" @click="handleReset">重置</el-button>
                <el-button size="small" type="primary" @click="handleSearch">应用</el-button>
              </div>
            </el-form>
          </el-popover>
        </div>

        <div class="toolbar-right">
          <!-- 批量操作（有选中时显示） -->
          <template v-if="selectedIds.length > 0">
            <span class="selected-tip">已选 {{ selectedIds.length }} 条</span>
            <!-- 版本用例 Tab：加入基线 -->
            <el-button v-if="activeTab === 'version'" size="small" type="warning" plain @click="handleAddToBaseline">
              <el-icon><Star /></el-icon>加入基线
            </el-button>
            <!-- 基线用例 Tab：导入到版本 -->
            <el-button v-if="activeTab === 'baseline'" size="small" type="success" plain @click="importToVersionVisible = true">
              <el-icon><Download /></el-icon>导入到版本
            </el-button>
            <el-button v-if="activeTab === 'version'" size="small" type="primary" plain @click="batchStoryVisible = true">
              <el-icon><Link /></el-icon>关联需求
            </el-button>
            <el-button size="small" type="danger" plain @click="handleBatchDelete">
              <el-icon><Delete /></el-icon>删除
            </el-button>
            <el-divider direction="vertical" />
          </template>
          <el-button plain @click="handleExportCSV">
            <el-icon><Download /></el-icon>导出
          </el-button>
          <el-button v-if="activeTab === 'version'" type="warning" plain @click="importDialogVisible = true">
            <el-icon><Upload /></el-icon>导入 XMind
          </el-button>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新建用例
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        :data="testcases"
        v-loading="loading"
        style="width:100%"
        row-key="id"
        @selection-change="onSelectionChange"
        @row-click="(row) => handleDetail(row)"
        @sort-change="handleSortChange"
        row-class-name="case-row"
      >
        <el-table-column type="selection" width="46" @click.stop />
        <el-table-column prop="title" label="用例标题" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="case-title">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="72" align="center">
          <template #default="{ row }">
            <span :class="['priority-dot', `priority-${row.priority?.toLowerCase()}`]">{{ row.priority }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="module" label="模块" width="130" show-overflow-tooltip />
        <el-table-column v-if="activeTab === 'version'" prop="versionName" label="版本" width="130" show-overflow-tooltip />
        <el-table-column label="创建人" width="100">
          <template #default="{ row }">
            <div class="creator-cell">
              <el-avatar :src="row.creatorAvatar" :size="20" :style="row.creatorAvatar ? {} : avatarGradientStyle(row.creator)">{{ row.creator?.charAt(0) }}</el-avatar>
              <span>{{ row.creator }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="155" sortable="custom">
          <template #default="{ row }">
            <span class="time-text">{{ row.createTime }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click.stop="handleEdit(row)">编辑</el-button>
            <el-button size="small" link type="danger" @click.stop="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon size="48" style="color: var(--text-placeholder)"><DocumentChecked /></el-icon>
            <p>{{ activeTab === 'baseline' ? '暂无基线用例' : '暂无测试用例' }}</p>
            <el-button type="primary" size="small" :icon="Plus" @click="handleAdd">
              {{ activeTab === 'baseline' ? '新建基线用例' : '新建第一个用例' }}
            </el-button>
          </div>
        </template>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalCount"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="fetchList"
          @size-change="() => { currentPage = 1; fetchList(); }"
        />
      </div>
    </div>

    <!-- 子组件 -->
    <TestcaseDialog
      v-model:visible="dialogVisible"
      :editing-id="editingId"
      :initial-form="editingForm"
      :version-options="versionOptions"
      :story-options="storyOptions"
      :module-options="moduleOptions"
      :is-baseline="activeTab === 'baseline'"
      @saved="fetchList"
    />

    <TestcaseDetailDrawer
      v-model:visible="detailVisible"
      :testcase="detailCase"
      :current-index="detailIndex"
      :total-count="testcases.length"
      @prev="handleDetailPrev"
      @next="handleDetailNext"
    />

    <TestcaseImportDialog
      v-model:visible="importDialogVisible"
      @imported="fetchList"
    />

    <!-- 批量关联需求 -->
    <el-dialog v-model="batchStoryVisible" title="批量关联需求" width="400px" destroy-on-close>
      <el-form label-width="80px" style="margin-top:8px">
        <el-form-item label="关联需求">
          <el-select v-model="batchStoryId" placeholder="请选择需求" filterable clearable style="width:100%">
            <el-option v-for="s in storyOptions" :key="s.id" :label="s.title" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="">
          <span style="color:var(--text-secondary); font-size:13px">已选 {{ selectedIds.length }} 条用例</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchStoryVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchStory">确定</el-button>
      </template>
    </el-dialog>

    <!-- 从基线导入到版本 -->
    <el-dialog v-model="importToVersionVisible" title="从基线导入到版本" width="400px" destroy-on-close>
      <el-form label-width="80px" style="margin-top:8px">
        <el-form-item label="目标版本">
          <el-select v-model="importTargetVersion" placeholder="请选择版本" filterable style="width:100%">
            <el-option v-for="v in versionOptions" :key="v.id" :label="v.name" :value="v.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="">
          <span style="color:var(--text-secondary); font-size:13px">已选 {{ selectedIds.length }} 条基线用例</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importToVersionVisible = false">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="handleImportFromBaseline">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search, Filter, Plus, Link, Delete, Upload, Download, Star, DocumentChecked,
  WarningFilled,
} from '@element-plus/icons-vue';
import { avatarGradientStyle } from '@/utils/avatar';

import {
  getTestcaseList, updateTestcase, deleteTestcase, addToBaseline, importFromBaseline,
} from '@/api/testcase';
import { getUserList } from '@/api/user';
import { getStoryList } from '@/api/story';
import { getVersionList } from '@/api/version';
import { getModuleList } from '@/api/module';
import { exportToCSV } from '@/utils/export';
import UserCascader from '@/components/UserCascader.vue';
import TestcaseDialog from './components/TestcaseDialog.vue';
import TestcaseDetailDrawer from './components/TestcaseDetailDrawer.vue';
import TestcaseImportDialog from './components/TestcaseImportDialog.vue';

// ── Tab 切换 ──────────────────────────────────────────────────
const activeTab = ref('version');
const tabOptions = [
  { label: '版本用例', value: 'version' },
  { label: '基线用例', value: 'baseline' },
];

function handleTabChange() {
  currentPage.value = 1;
  selectedIds.value = [];
  handleReset();
}

// ── 选项数据 ──────────────────────────────────────────────────
const versionOptions = ref([]);
const userOptions = ref([]);
const storyOptions = ref([]);
const moduleOptions = ref([]);

function buildCascaderOptions(nodes) {
  return nodes.map((node) => {
    const item = { value: node.id, label: node.name };
    if (node.children && node.children.length) {
      item.children = buildCascaderOptions(node.children);
    }
    return item;
  });
}

const fetchOptions = async () => {
  try {
    const [userRes, storyRes, versionRes, moduleRes] = await Promise.all([
      getUserList(),
      getStoryList({ page: 1, pageSize: 999 }),
      getVersionList({ page: 1, pageSize: 999 }),
      getModuleList(),
    ]);
    userOptions.value = (userRes.data || []).map((u) => ({
      id: u.id,
      label: u.first_name || u.username,
      avatar: u.avatar || '',
      dept: u.dept || '',
    }));
    storyOptions.value = (storyRes.data.list || []).map((s) => ({ id: s.id, title: s.title }));
    versionOptions.value = (versionRes.data.list || []).map((v) => ({ id: v.id, name: v.name }));
    moduleOptions.value = buildCascaderOptions(moduleRes.data || []);
  } catch { /* ignore */ }
};

// ── 列表 ──────────────────────────────────────────────────────
const testcases = ref([]);
const loading = ref(false);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

const queryParams = ref({
  title: '',
  version: null,
  module: null,
  priority: '',
  type: '',
  creator: '',
  storyId: null,
});

const sortOrdering = ref('');

const p0Count = computed(() => testcases.value.filter((t) => t.priority === 'P0').length);

const hasMoreFilter = computed(() => !!(
  queryParams.value.version || queryParams.value.type
  || queryParams.value.creator || queryParams.value.storyId
));
const moreFilterCount = computed(() => [
  queryParams.value.version, queryParams.value.type,
  queryParams.value.creator, queryParams.value.storyId,
].filter(Boolean).length);

let searchTimer = null;
function debounceFetch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(handleSearch, 300);
}

const fetchList = async () => {
  loading.value = true;
  try {
    const params = { page: currentPage.value, pageSize: pageSize.value };
    // 根据 Tab 传递 is_baseline 参数
    params.is_baseline = activeTab.value === 'baseline' ? '1' : '0';
    const q = queryParams.value;
    if (q.title) params.title = q.title;
    if (q.version) params.version = q.version;
    if (q.module) params.module = q.module;
    if (q.priority) params.priority = q.priority;
    if (q.type) params.type = q.type;
    if (q.creator) params.creator = q.creator;
    if (q.storyId) params.story = q.storyId;
    if (sortOrdering.value) params.ordering = sortOrdering.value;
    const res = await getTestcaseList(params);
    testcases.value = (res.data.list || []).map((tc) => ({
      ...tc,
      createTime: tc.created_at || '',
      creator: tc.creator_name || '',
      creatorAvatar: tc.creator_avatar || '',
      versionName: tc.version_name || '',
      module: tc.module || '',
      storyId: tc.story || null,
      steps: tc.steps || [],
    }));
    totalCount.value = res.data.total || 0;
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
};

const handleSearch = () => { currentPage.value = 1; fetchList(); };

const handleSortChange = ({ prop, order }) => {
  if (prop === 'createTime') {
    if (order === 'ascending') sortOrdering.value = 'created_at';
    else if (order === 'descending') sortOrdering.value = '-created_at';
    else sortOrdering.value = '';
  } else {
    sortOrdering.value = '';
  }
  fetchList();
};

const handleReset = () => {
  queryParams.value = {
    title: '',
    version: null,
    module: null,
    priority: '',
    type: '',
    creator: '',
    storyId: null,
  };
  sortOrdering.value = '';
  currentPage.value = 1;
  fetchList();
};

// ── 选择 ──────────────────────────────────────────────────────
const selectedIds = ref([]);
const onSelectionChange = (rows) => { selectedIds.value = rows.map((r) => r.id); };

// ── 新建 / 编辑 ───────────────────────────────────────────────
const dialogVisible = ref(false);
const editingId = ref(null);
const editingForm = ref(null);

const handleAdd = () => { editingId.value = null; editingForm.value = null; dialogVisible.value = true; };
const handleEdit = (row) => {
  editingId.value = row.id;
  editingForm.value = {
    versionId: row.version || null,
    module: row.module || '',
    type: row.type,
    title: row.title,
    priority: row.priority,
    storyId: row.storyId,
    precondition: row.precondition,
    steps: row.steps.map((s) => ({ ...s })),
    remark: row.remark,
  };
  dialogVisible.value = true;
};

// ── 删除 ──────────────────────────────────────────────────────
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除用例「${row.title}」？`, '提示', { type: 'warning' })
    .then(async () => {
      await deleteTestcase(row.id);
      ElMessage.success('已删除');
      if (testcases.value.length <= 1 && currentPage.value > 1) {
        currentPage.value -= 1;
      }
      fetchList();
    })
    .catch(() => {});
};

const handleBatchDelete = () => {
  ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 条用例？`, '提示', { type: 'warning' })
    .then(async () => {
      const deletedCount = selectedIds.value.length;
      await Promise.all(selectedIds.value.map((id) => deleteTestcase(id)));
      selectedIds.value = [];
      ElMessage.success('批量删除成功');
      // 如果删完当前页所有数据且不在第一页，回退到上一页
      const remaining = testcases.value.length - deletedCount;
      if (remaining <= 0 && currentPage.value > 1) {
        currentPage.value -= 1;
      }
      fetchList();
    })
    .catch(() => {});
};

// ── 加入基线 ──────────────────────────────────────────────────
const handleAddToBaseline = async () => {
  try {
    await ElMessageBox.confirm(
      `确定将选中的 ${selectedIds.value.length} 条用例加入基线？（将复制为基线用例）`,
      '加入基线',
      { type: 'info' },
    );
    const res = await addToBaseline(selectedIds.value);
    ElMessage.success(res.message || '加入基线成功');
    selectedIds.value = [];
  } catch { /* 取消 */ }
};

// ── 从基线导入到版本 ──────────────────────────────────────────
const importToVersionVisible = ref(false);
const importTargetVersion = ref(null);
const importLoading = ref(false);

const handleImportFromBaseline = async () => {
  if (!importTargetVersion.value) { ElMessage.warning('请选择目标版本'); return; }
  importLoading.value = true;
  try {
    const res = await importFromBaseline(selectedIds.value, importTargetVersion.value);
    ElMessage.success(res.message || '导入成功');
    importToVersionVisible.value = false;
    importTargetVersion.value = null;
    selectedIds.value = [];
  } catch { ElMessage.error('导入失败'); } finally { importLoading.value = false; }
};

// ── 批量关联需求 ──────────────────────────────────────────────
const batchStoryVisible = ref(false);
const batchStoryId = ref(null);

const handleBatchStory = async () => {
  if (!batchStoryId.value) { ElMessage.warning('请选择需求'); return; }
  try {
    await Promise.all(selectedIds.value.map((id) => updateTestcase(id, { story: batchStoryId.value })));
    ElMessage.success('批量关联需求成功');
    batchStoryVisible.value = false;
    batchStoryId.value = null;
    fetchList();
  } catch { ElMessage.error('操作失败'); }
};

// ── 详情 ──────────────────────────────────────────────────────
const detailVisible = ref(false);
const detailCase = ref(null);
const detailIndex = ref(0);
const handleDetail = (row) => {
  const idx = testcases.value.findIndex((t) => t.id === row.id);
  detailIndex.value = idx >= 0 ? idx : 0;
  detailCase.value = row;
  detailVisible.value = true;
};
const handleDetailPrev = () => {
  if (detailIndex.value > 0) {
    detailIndex.value -= 1;
    detailCase.value = testcases.value[detailIndex.value];
  }
};
const handleDetailNext = () => {
  if (detailIndex.value < testcases.value.length - 1) {
    detailIndex.value += 1;
    detailCase.value = testcases.value[detailIndex.value];
  }
};

// ── 导入 ──────────────────────────────────────────────────────
const importDialogVisible = ref(false);

function handleExportCSV() {
  exportToCSV(testcases.value, [
    { label: '用例标题', value: 'title' },
    { label: '优先级', value: 'priority' },
    { label: '类型', value: 'type' },
    { label: '模块', value: 'module' },
    { label: '执行结果', value: 'last_result' },
    { label: '创建人', value: 'creator_name' },
    { label: '创建时间', value: 'createTime' },
  ], '用例列表');
}

onMounted(() => { fetchOptions(); fetchList(); });
</script>

<style scoped lang="scss">
.testcase-container {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── KPI Pills ── */
.kpi-strip {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 12px;
}
@media (max-width: 640px) { .kpi-strip { grid-template-columns: 1fr 1fr; } }
.kpi-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-card);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
  &:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); }
  &.kpi-pill--primary {
    padding: 16px 20px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.06), rgba(118, 75, 162, 0.04));
    border: 1px solid rgba(102, 126, 234, 0.12);
    .kpi-value { font-size: 28px; }
    .kpi-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, #667eea, #764ba2);
    }
  }
}
.kpi-spark {
  position: absolute;
  right: 12px; top: 50%;
  width: 48px; height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.08) 0%, transparent 70%);
  transform: translateY(-50%);
  pointer-events: none;
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

.tab-segmented {
  margin-bottom: 12px;
}

/* ── 工具栏 ── */
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
.selected-tip {
  font-size: 13px;
  color: var(--el-color-primary);
  font-weight: 500;
}
.filter-badge {
  :deep(.el-badge__content) { top: -2px; right: -6px; }
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

:deep(.case-row) { cursor: pointer; }

.case-title {
  color: var(--text-primary);
  font-size: 13px;
  &:hover { color: var(--el-color-primary); }
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
  &.priority-p3 { background: var(--el-color-success-light-9); color: var(--el-color-success); }
}

.creator-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.time-text { font-size: 12px; color: var(--text-secondary); }

/* ── 空状态 ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 0;
  color: var(--text-secondary);
  p { margin: 0; font-size: 14px; }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
