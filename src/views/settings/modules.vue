<template>
  <div class="modules-page">
    <!-- ═══ 统计条 ═══ -->
    <div class="page-stats">
      <div class="stat-pill">
        <span class="stat-icon" style="background:var(--el-color-primary-light-9);color:var(--el-color-primary)">
          <el-icon :size="18"><Grid /></el-icon>
        </span>
        <div class="stat-body">
          <span class="stat-value">{{ flatModules.length }}</span>
          <span class="stat-label">模块总数</span>
        </div>
      </div>
      <div class="stat-pill">
        <span class="stat-icon" style="background:var(--el-color-success-light-9);color:var(--el-color-success)">
          <el-icon :size="18"><Check /></el-icon>
        </span>
        <div class="stat-body">
          <span class="stat-value">{{ activeModuleCount }}</span>
          <span class="stat-label">启用中</span>
        </div>
      </div>
      <div class="stat-pill">
        <span class="stat-icon" style="background:var(--el-color-danger-light-9);color:var(--el-color-danger)">
          <el-icon :size="18"><Remove /></el-icon>
        </span>
        <div class="stat-body">
          <span class="stat-value">{{ inactiveModuleCount }}</span>
          <span class="stat-label">已禁用</span>
        </div>
      </div>
    </div>

    <!-- ═══ 工具栏 ═══ -->
    <div class="toolbar-card">
      <div class="toolbar-left">
        <el-input
          v-model="queryParams.name"
          placeholder="搜索模块名称..."
          clearable
          :prefix-icon="Search"
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable class="filter-select" @change="handleSearch">
          <el-option label="启用" value="启用" />
          <el-option label="禁用" value="禁用" />
        </el-select>
        <el-button @click="handleReset">
          <el-icon><Refresh /></el-icon>重置
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" @click="handleAdd(null)">
          <el-icon><Plus /></el-icon>新建模块
        </el-button>
      </div>
    </div>

    <!-- ═══ 树形表格 ═══ -->
    <div class="table-card">
      <div v-if="!listLoading && modules.length === 0" class="table-empty">
        <div class="empty-icon"><el-icon :size="48"><Grid /></el-icon></div>
        <p class="empty-title">暂无模块数据</p>
        <p class="empty-desc">点击右上角「新建模块」创建第一个模块</p>
        <el-button type="primary" size="small" @click="handleAdd(null)">
          <el-icon><Plus /></el-icon>新建模块
        </el-button>
      </div>

      <el-table
        v-else
        v-loading="listLoading"
        :data="modules"
        style="width: 100%"
        row-key="id"
        :header-cell-style="headerCellStyle"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        :indent="28"
        default-expand-all
      >
        <el-table-column label="模块名称" min-width="260">
          <template #default="{ row }">
            <div class="module-name-cell">
              <span class="module-id-badge">{{ row.id }}</span>
              <span class="module-name">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.description" class="desc-text">{{ row.description }}</span>
            <span v-else class="desc-text desc-text--empty">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <span class="inline-status" :class="row.status === '启用' ? 'active' : 'inactive'">
              {{ row.status }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="handleAdd(row)">添加子模块</el-button>
            <el-button size="small" text type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- ═══ 新建/编辑弹窗 ═══ -->
    <ModuleFormDialog
      v-model:visible="dialogVisible"
      :is-editing="isEditing"
      :initial-form="dialogForm"
      :module-tree-options="moduleTreeOptions"
      :submitting="saving"
      @submit="onSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Search, Refresh, Plus, Grid, Check, Remove,
} from '@element-plus/icons-vue'
import ModuleFormDialog from './components/ModuleFormDialog.vue'
import { useModuleList } from '@/composables/useModuleList'
import type { ModuleNode } from '@/types/organization'

// ═══ Composables ═══
const mod = useModuleList()

// ═══ 模板别名 ═══
const queryParams = mod.queryParams
const listLoading = mod.listLoading
const modules = mod.modules
const flatModules = mod.flatModules
const handleSearch = mod.handleSearch
const handleReset = mod.handleReset
const activeModuleCount = mod.activeModuleCount
const inactiveModuleCount = mod.inactiveModuleCount
const moduleTreeOptions = mod.moduleTreeOptions
const saving = mod.saving
const handleDelete = mod.handleDelete

// ── 表头样式 ──
const headerCellStyle = () => ({
  background: 'var(--bg-elevated)',
  color: 'var(--text-regular)',
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '.3px',
  borderBottom: '1px solid var(--border-color)',
})

// ── 弹窗 ──
const dialogVisible = ref(false)
const isEditing = ref(false)
const dialogForm = ref({ parentPath: [] as number[], name: '', description: '', status: '启用' })

function handleAdd(parentRow: ModuleNode | null) {
  isEditing.value = false
  dialogForm.value = mod.initFormForAdd(parentRow)
  dialogVisible.value = true
}

function handleEdit(row: ModuleNode) {
  isEditing.value = true
  dialogForm.value = mod.initFormForEdit(row)
  dialogVisible.value = true
}

async function onSubmit(payload: { name: string; description: string; parentPath: number[]; status: string }) {
  mod.saving.value = true
  try {
    await mod.submitModule(payload)
    dialogVisible.value = false
  } catch {
    /* API 层已处理 */
  } finally {
    mod.saving.value = false
  }
}

// ═══ 初始化 ═══
onMounted(() => {
  mod.fetchList()
  mod.fetchFlatList()
})
</script>

<style scoped lang="scss">
.modules-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  height: calc(100vh - 120px);
  overflow: hidden;
}

// ═══ 统计条 ═══
.page-stats {
  display: flex;
  gap: 14px;
  flex-shrink: 0;
}
.stat-pill {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-dropdown);
  transition: box-shadow .25s, transform .25s;
  position: relative;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 3px;
    background: currentColor;
    opacity: .06;
    border-radius: 0 0 12px 12px;
    transition: height .25s, opacity .25s;
  }
  &:hover {
    box-shadow: var(--shadow-hover);
    transform: translateY(-2px);
    &::after { height: 4px; opacity: .12; }
  }
}
.stat-icon {
  width: 38px; height: 38px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-body {
  display: flex; flex-direction: column;
  .stat-value { font-size: 20px; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
  .stat-label { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
}

// ═══ 工具栏 ═══
.toolbar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-dropdown);
  gap: 12px;
  flex-shrink: 0;
}
.toolbar-left { display: flex; align-items: center; gap: 10px; }
.toolbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.search-input { width: 200px; }
.filter-select { width: 110px; }

// ═══ 表格 ═══
.table-card {
  flex: 1;
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-dropdown);
  padding: 12px 0 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.el-table) {
    flex: 1;
    --el-table-border-color: transparent;
    --el-table-row-hover-bg-color: var(--el-color-primary-light-9);
  }
  :deep(.el-table__body tr) { transition: background .15s; }
  :deep(.el-table th.el-table__cell) { border-bottom: 1px solid var(--border-color); }

  // ── 树形缩进（SCSS 循环生成，覆盖 0~9 级，每级 28px） ──
  @for $i from 1 through 9 {
    :deep(.el-table__row--level-#{$i} > td:first-child .cell) {
      padding-left: #{$i * 28}px;
    }
  }
  // 展开/折叠图标
  :deep(.el-table__expand-icon) {
    width: 20px; height: 20px;
    color: var(--text-secondary);
    transition: color .15s, transform .2s;
    .el-icon { font-size: 16px; }
    &:hover { color: var(--el-color-primary); }
  }
  // 顶层 — 加粗突出，ID 徽章主色高亮
  :deep(.el-table__row--level-0) {
    .module-name { font-weight: 600; font-size: 14px; }
    .module-id-badge {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      font-weight: 700;
    }
  }
  // 一级子 — 常规字号
  :deep(.el-table__row--level-1) {
    .module-name { font-size: 13px; font-weight: 500; }
  }
  // 二级子 — 稍弱化
  :deep(.el-table__row--level-2) {
    .module-name { font-size: 13px; font-weight: 400; color: var(--text-regular); }
    .module-id-badge { opacity: .6; }
  }
}

.module-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.module-id-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px; height: 20px;
  padding: 0 6px;
  font-size: 11px; font-weight: 600;
  border-radius: 5px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  flex-shrink: 0;
}
.module-name {
  font-size: 14px; font-weight: 500;
  color: var(--text-primary);
}

.desc-text {
  color: var(--text-secondary);
  font-size: 13px;
  &--empty { color: var(--text-placeholder); }
}

.inline-status {
  font-size: 12px; font-weight: 500;
  padding: 3px 10px; border-radius: 20px;
  &.active { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.inactive { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
}

// ── 空状态 ──
.table-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px;
  .empty-icon { color: var(--text-placeholder); margin-bottom: 16px; opacity: .5; }
  .empty-title { font-size: 15px; font-weight: 600; color: var(--text-regular); margin: 0 0 6px; }
  .empty-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; }
}
</style>
