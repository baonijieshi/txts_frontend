<template>
  <div class="mock-view">
    <div class="main-card">
      <!-- 工具栏 -->
      <div class="list-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="queryParams.path"
            placeholder="搜索接口地址..."
            clearable
            style="width: 260px"
            @input="debounceFetch"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-input
            v-model="queryParams.snow_id"
            placeholder="Snow ID"
            clearable
            style="width: 180px"
            @input="debounceFetch"
          >
            <template #prefix><el-icon><Key /></el-icon></template>
          </el-input>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" :icon="Plus" @click="handleAdd">新建 Mock</el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        :data="mockList"
        v-loading="loading"
        style="width: 100%"
        row-key="id"
        :header-cell-style="headerCellStyle"
        row-class-name="mock-row"
        @row-click="(row) => handleDetail(row)"
      >
        <el-table-column prop="snow_id" label="SNOW ID" width="180">
          <template #default="{ row }">
            <span class="snow-id">{{ row.snow_id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="app_name" label="应用名称" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="app-name-cell">{{ row.app_name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="接口地址" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">
            <code class="path-code">{{ row.path }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="创建人" width="100" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.creator" class="creator-text">{{ row.creator }}</span>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="create_time" label="创建时间" width="165">
          <template #default="{ row }">
            <span class="time-text">{{ row.create_time }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right" align="center">
          <template #default="{ row }">
            <div class="row-actions">
              <el-icon class="action-btn primary" @click.stop="handleEdit(row)"><Edit /></el-icon>
              <el-icon class="action-btn danger" @click.stop="handleDelete(row)"><Delete /></el-icon>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon class="empty-icon"><Box /></el-icon>
            <p class="empty-title">暂无 Mock 数据</p>
            <p class="empty-desc">点击「新建 Mock」开始创建你的第一个 Mock 接口</p>
          </div>
        </template>
      </el-table>

      <div v-if="total > 0" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="fetchList"
          @size-change="fetchList"
        />
      </div>
    </div>

    <MockDialog
      v-model:visible="dialogVisible"
      :editing-snow-id="editingSnowId"
      :initial-form="editingForm"
      @saved="fetchList"
    />

    <MockDetailDrawer
      v-model:visible="detailVisible"
      :mock="detailMock"
    />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus, Box, Key, Edit, Delete } from '@element-plus/icons-vue';
import { getMockList, deleteMock } from '@/api/mock';
import MockDialog from './components/MockDialog.vue';
import MockDetailDrawer from './components/MockDetailDrawer.vue';

const mockList = ref([]);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const queryParams = ref({ path: '', snow_id: '' });

const dialogVisible = ref(false);
const editingSnowId = ref(null);
const editingForm = ref(null);
const detailVisible = ref(false);
const detailMock = ref(null);

const headerCellStyle = () => ({
  background: 'var(--bg-elevated)',
  color: 'var(--text-secondary)',
  fontWeight: '600',
  fontSize: '12px',
  letterSpacing: '0.3px',
  borderBottom: '1px solid var(--border-color)',
});

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
    const params = { page: currentPage.value, pageSize: pageSize.value };
    if (queryParams.value.path) params.path = queryParams.value.path;
    if (queryParams.value.snow_id) params.snow_id = queryParams.value.snow_id;
    const res = await getMockList(params);
    const d = res.data;
    mockList.value = d?.list || d?.results || [];
    total.value = d?.total || mockList.value.length;
  } finally {
    loading.value = false;
  }
}

function handleAdd() {
  editingSnowId.value = null;
  editingForm.value = null;
  dialogVisible.value = true;
}

function handleEdit(row) {
  editingSnowId.value = row.snow_id;
  editingForm.value = {
    app_name: row.app_name,
    path: row.path,
    re_data: typeof row.re_data === 'string' ? row.re_data : JSON.stringify(row.re_data),
  };
  dialogVisible.value = true;
}

function handleDetail(row) {
  detailMock.value = row;
  detailVisible.value = true;
}

async function handleDelete(row) {
  await ElMessageBox.confirm(
    `确定删除 Mock「${row.app_name} - ${row.path}」吗？`,
    '删除确认',
    { type: 'warning' },
  );
  await deleteMock(row.snow_id);
  ElMessage.success('已删除');
  fetchList();
}

onMounted(() => { fetchList(); });
</script>

<style scoped lang="scss">
.mock-view {
  padding: 20px;
}

.main-card {
  background: var(--bg-card);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  padding: 16px;
}

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

.snow-id {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--text-regular);
  background: var(--bg-elevated);
  padding: 2px 8px;
  border-radius: 4px;
}

.app-name-cell {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 13px;
}

.path-code {
  background: var(--bg-elevated);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--text-primary);
}

.empty-text { color: var(--text-placeholder); font-size: 13px; }
.creator-text { font-size: 13px; color: var(--text-regular); }
.time-text { font-size: 13px; color: var(--text-regular); }

// 操作按钮
.row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.action-btn {
  font-size: 15px;
  padding: 5px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;

  &:hover {
    &.primary { color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
    &.danger { color: var(--el-color-danger); background: var(--el-color-danger-light-9); }
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
}
.empty-icon {
  font-size: 48px;
  color: var(--text-placeholder);
  margin-bottom: 12px;
}
.empty-title {
  font-size: 15px;
  color: var(--text-regular);
  margin: 0 0 4px;
}
.empty-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

// 表格行
:deep(.mock-row) {
  cursor: pointer;
  td { padding: 10px 0; }
}

:deep(.mock-row:hover > td) {
  background: var(--el-color-primary-light-9) !important;
  .row-actions { opacity: 1; }
}
</style>
