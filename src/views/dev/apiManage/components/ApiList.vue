<template>
  <div class="api-list-card">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索接口名称或路径..."
          clearable
          class="search-input"
          @input="handleSearchInput"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <template v-if="selectedIds.length > 0">
          <span class="selected-count">{{ selectedIds.length }} 项已选</span>
          <el-button type="primary" plain size="small" @click="bulkSetServiceVisible = true">
            设置服务
          </el-button>
          <el-button type="danger" plain size="small" @click="handleBulkDelete">
            <el-icon><Delete /></el-icon>删除
          </el-button>
        </template>
      </div>
      <div class="toolbar-right">
        <el-button :icon="Upload" @click="$emit('import')">导入 Swagger</el-button>
        <el-button type="primary" :icon="Plus" @click="$emit('add')">新增接口</el-button>
      </div>
    </div>

    <!-- 批量设置服务弹窗 -->
    <el-dialog
      v-model="bulkSetServiceVisible"
      title="批量设置所属服务"
      width="360px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="所属服务">
          <el-select
            v-model="bulkServiceId"
            placeholder="请选择服务（留空则清除）"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="svc in serviceList"
              :key="svc.id"
              :label="svc.name"
              :value="svc.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bulkSetServiceVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBulkSetService">确认</el-button>
      </template>
    </el-dialog>

    <!-- 骨架屏 -->
    <el-skeleton v-if="loading" :rows="6" animated class="skeleton-wrap" />

    <!-- 接口表格 -->
    <el-table
      v-else
      ref="tableRef"
      :data="list"
      style="width: 100%"
      row-key="id"
      :header-cell-style="headerCellStyle"
      row-class-name="clickable-row"
      @selection-change="handleSelectionChange"
      @row-click="handleRowClick"
    >
      <el-table-column type="selection" width="42" @click.stop />

      <el-table-column label="METHOD" width="96">
        <template #default="{ row }">
          <span class="method-badge" :class="`method-${row.method}`">{{ row.method }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="name" label="接口名称" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="api-name">{{ row.name }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="path" label="接口路径" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <code class="path-code" v-html="highlightPathParams(row.path)" />
        </template>
      </el-table-column>

      <el-table-column label="所属服务" width="120" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.service_name" class="service-pill">{{ row.service_name }}</span>
          <span v-else class="empty-text">-</span>
        </template>
      </el-table-column>

      <el-table-column prop="description" label="描述" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.description" class="desc-text">{{ row.description }}</span>
          <span v-else class="empty-text">-</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="110" fixed="right" align="center">
        <template #default="{ row }">
          <div class="row-actions">
            <el-tooltip content="调试" placement="top" :show-after="400">
              <el-icon class="action-btn success" @click.stop="$emit('debug', row)"><VideoPlay /></el-icon>
            </el-tooltip>
            <el-tooltip content="编辑" placement="top" :show-after="400">
              <el-icon class="action-btn primary" @click.stop="$emit('edit', row)"><Edit /></el-icon>
            </el-tooltip>
            <el-tooltip content="删除" placement="top" :show-after="400">
              <el-icon class="action-btn danger" @click.stop="$emit('delete', row)"><Delete /></el-icon>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>

      <template #empty>
        <div class="empty-state">
          <el-icon class="empty-icon"><Document /></el-icon>
          <p class="empty-title">暂无接口数据</p>
          <p class="empty-desc">点击「导入 Swagger」批量导入，或「新增接口」手动添加</p>
        </div>
      </template>
    </el-table>

    <!-- 分页 -->
    <div v-if="!loading && total > 0" class="pagination-wrapper">
      <el-pagination
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="(val) => $emit('page-change', val)"
        @size-change="(val) => $emit('size-change', val)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref } from 'vue';
import {
  Search, Delete, Plus, Upload, Edit, VideoPlay, Document,
} from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';

defineProps({
  list: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  serviceList: { type: Array, default: () => [] },
});

const emit = defineEmits([
  'row-click', 'edit', 'delete', 'bulk-delete', 'bulk-set-service',
  'debug', 'search', 'filter-method', 'page-change', 'size-change',
  'add', 'import',
]);

const searchKeyword = ref('');
const selectedIds = ref([]);
const tableRef = ref(null);
const bulkSetServiceVisible = ref(false);
const bulkServiceId = ref(null);

let searchTimer = null;

const headerCellStyle = () => ({
  background: 'var(--bg-elevated)',
  color: 'var(--text-secondary)',
  fontWeight: '600',
  fontSize: '12px',
  letterSpacing: '0.3px',
  borderBottom: '1px solid var(--border-color)',
});

function highlightPathParams(path) {
  if (!path) return '';
  return path.replace(/\{([^}]+)\}/g, '<span class="path-param">{$1}</span>');
}

function handleSearchInput(val) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { emit('search', val); }, 300);
}

function handleSelectionChange(rows) {
  selectedIds.value = rows.map((r) => r.id);
}

function handleRowClick(row) {
  emit('row-click', row);
}

async function handleBulkDelete() {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个接口吗？此操作不可撤销。`,
      '批量删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    );
    emit('bulk-delete', [...selectedIds.value]);
    selectedIds.value = [];
    tableRef.value?.clearSelection();
  } catch { /* 取消 */ }
}

function handleBulkSetService() {
  emit('bulk-set-service', { ids: [...selectedIds.value], serviceId: bulkServiceId.value ?? null });
  bulkSetServiceVisible.value = false;
  bulkServiceId.value = null;
  selectedIds.value = [];
  tableRef.value?.clearSelection();
}
</script>

<style scoped lang="scss">
.api-list-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  padding: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 10px;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .toolbar-right {
    display: flex;
    gap: 8px;
  }
}

.search-input {
  width: 280px;
}

.selected-count {
  font-size: 13px;
  color: var(--el-color-primary);
  font-weight: 500;
  padding: 0 4px;
}

// 方法徽章
.method-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
  letter-spacing: 0.5px;
  line-height: 1.4;

  &.method-GET { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.method-POST { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.method-PUT { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.method-PATCH { background: var(--bg-elevated); color: var(--text-secondary); }
  &.method-DELETE { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
}

.api-name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.path-code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--text-regular);
  background: var(--bg-elevated);
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;

  :deep(.path-param) {
    color: var(--el-color-primary);
    font-weight: 600;
  }
}

.service-pill {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-elevated);
  color: var(--text-regular);
  border-radius: 10px;
  font-size: 12px;
  border: 1px solid var(--border-light);
}

.desc-text {
  font-size: 13px;
  color: var(--text-regular);
}

.empty-text { color: var(--text-placeholder); font-size: 13px; }

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
    &.success { color: var(--el-color-success); background: var(--el-color-success-light-9); }
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

.skeleton-wrap {
  padding: 20px 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  flex-shrink: 0;
}

// 表格行样式
:deep(.el-table) {
  --el-table-row-hover-bg-color: var(--el-color-primary-light-9);
}

:deep(.clickable-row) {
  cursor: pointer;
  td {
    padding: 10px 0;
  }
}

:deep(.clickable-row:hover > td) {
  background: var(--el-color-primary-light-9) !important;
  .row-actions { opacity: 1; }
}
</style>
