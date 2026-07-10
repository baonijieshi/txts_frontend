<template>
  <div class="org-page">
    <!-- ═══ 左侧：部门树面板 ═══ -->
    <aside class="org-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">组织架构</span>
        <span v-if="deptCount" class="sidebar-badge">{{ deptCount }} 个部门</span>
        <el-dropdown trigger="click" @command="handleDeptAction">
          <el-button size="small" text circle>
            <el-icon :size="16"><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="add">
                <el-icon><Plus /></el-icon>新建部门
              </el-dropdown-item>
              <el-dropdown-item command="syncDept">
                <el-icon><Refresh /></el-icon>同步飞书部门
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <!-- 全部成员入口 -->
      <div
        class="dept-node dept-node--all"
        :class="{ 'is-active': !selectedDept }"
        @click="selectDept(null)"
      >
        <div class="dept-node__icon">
          <el-icon :size="16"><UserFilled /></el-icon>
        </div>
        <span class="dept-node__label">全部成员</span>
        <span class="dept-node__count">{{ overviewTotal }}</span>
      </div>

      <!-- 部门树 -->
      <div class="dept-tree-wrap" v-loading="treeLoading">
        <el-tree
          v-if="deptTree.length > 0"
          ref="treeRef"
          :data="deptTree"
          :props="treeProps"
          node-key="id"
          highlight-current
          :expand-on-click-node="false"
          :default-expand-all="true"
          :indent="24"
          @node-click="onTreeNodeClick"
          @node-contextmenu="handleTreeContext"
        >
          <template #default="{ node, data }">
            <div class="tree-node-content" @mouseenter="hoveredNode = data.id" @mouseleave="hoveredNode = null">
              <div class="tree-node-left">
                <span class="tree-node-badge" :style="{ background: badgeColor(data.name) }">{{ data.name?.charAt(0) }}</span>
                <span class="tree-node-name">{{ data.name }}</span>
              </div>
              <div class="tree-node-right">
                <span class="tree-node-count">{{ data.memberCount || 0 }}</span>
                <span v-if="hoveredNode === data.id" class="tree-node-actions" @click.stop>
                  <el-icon :size="13" class="action-icon" @click.stop="handleEditDept(data)"><Edit /></el-icon>
                  <el-icon :size="13" class="action-icon action-icon--danger" @click.stop="handleDeleteDept(data)"><Delete /></el-icon>
                </span>
              </div>
            </div>
          </template>
        </el-tree>
        <div v-else-if="!treeLoading" class="dept-tree-empty">
          <el-icon :size="28" style="color:var(--text-placeholder);opacity:.5"><OfficeBuilding /></el-icon>
          <p>暂无部门</p>
          <el-button size="small" type="primary" text style="margin-top:8px" @click="handleAddDept">
            <el-icon><Plus /></el-icon>新建部门
          </el-button>
        </div>
      </div>

      <!-- 底部同步信息 -->
      <div class="sidebar-footer" v-if="lastSyncTime">
        <span class="sync-hint">上次同步：{{ lastSyncTime }}</span>
      </div>
    </aside>

    <!-- ═══ 右侧：成员管理区 ═══ -->
    <main class="org-main">
      <!-- 统计条 -->
      <StatPills
        :total="overviewTotal"
        :active-count="overviewActiveCount"
        :inactive-count="overviewInactiveCount"
        :dept-count="deptCount"
      />

      <!-- 工具栏 -->
      <div class="toolbar-card">
        <div class="toolbar-left">
          <el-tag
            v-if="selectedDept"
            class="dept-filter-tag"
            closable
            type="primary"
            effect="plain"
            size="large"
            @close="selectDept(null)"
          >
            <el-icon :size="13" style="vertical-align: -2px"><OfficeBuilding /></el-icon>
            {{ selectedDept.name }}
          </el-tag>
          <el-input
            v-model="queryParams.name"
            placeholder="搜索姓名..."
            clearable
            :prefix-icon="Search"
            class="search-input"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
          <el-select v-model="queryParams.roleId" placeholder="全部角色" clearable class="filter-select" @change="handleSearch">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
          <el-select v-model="queryParams.status" placeholder="全部状态" clearable class="filter-select-sm" @change="handleSearch">
            <el-option label="启用" value="启用" />
            <el-option label="禁用" value="禁用" />
          </el-select>
        </div>
        <div class="toolbar-right">
          <el-button :loading="syncing" @click="handleSyncAll">
            <el-icon><Refresh /></el-icon>飞书同步
          </el-button>
          <el-button type="primary" @click="handleAddMember">
            <el-icon><Plus /></el-icon>添加成员
          </el-button>
        </div>
      </div>

      <!-- 成员表格 -->
      <div class="table-card">
        <!-- 批量操作浮条 -->
        <transition name="fade">
          <div v-if="selectedRows.length > 0" class="batch-bar">
            <span class="batch-text">已选 {{ selectedRows.length }} 人</span>
            <el-button size="small" type="success" plain @click="batchToggle('启用')">批量启用</el-button>
            <el-button size="small" type="warning" plain @click="batchToggle('禁用')">批量禁用</el-button>
            <el-button size="small" text @click="selectedRows = []">取消选择</el-button>
          </div>
        </transition>

        <!-- 空状态 -->
        <div v-if="!listLoading && members.length === 0" class="table-empty">
          <div class="empty-icon"><el-icon :size="48"><UserFilled /></el-icon></div>
          <p class="empty-title">暂无成员数据</p>
          <p class="empty-desc">
            <template v-if="selectedDept">该部门下暂无成员</template>
            <template v-else>手动添加或通过飞书同步通讯录</template>
          </p>
          <div class="empty-actions">
            <el-button type="primary" size="small" @click="handleAddMember">
              <el-icon><Plus /></el-icon>添加成员
            </el-button>
            <el-button size="small" @click="handleSyncAll" :loading="syncing">
              <el-icon><Refresh /></el-icon>飞书同步
            </el-button>
          </div>
        </div>

        <el-table
          v-else
          :data="members"
          style="width: 100%"
          row-key="id"
          :header-cell-style="headerCellStyle"
          @selection-change="selectedRows = $event"
          @sort-change="onSortChange"
          v-loading="listLoading"
        >
          <el-table-column type="selection" width="44" />
          <el-table-column label="成员" min-width="200" sortable="custom" prop="first_name">
            <template #default="{ row }">
              <div class="member-cell">
                <el-avatar
                  :size="34"
                  :src="row.avatar || ''"
                  :style="row.avatar ? {} : { background: avatarColor(row.name), color: '#fff' }"
                  class="member-avatar"
                >{{ (row.name || '').length >= 2 ? row.name.slice(-2) : row.name?.charAt(0) }}</el-avatar>
                <div class="member-info">
                  <span class="member-name">{{ row.name }}</span>
                  <span class="member-account">@{{ row.username }}</span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="email" label="邮箱" min-width="170" show-overflow-tooltip sortable="custom" />
          <el-table-column label="手机号" min-width="120">
            <template #default="{ row }">
              <span>{{ phoneMask(row.phone) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="角色" min-width="100">
            <template #default="{ row }">
              <el-tag v-for="rid in row.roleIds" :key="rid" hit="true" size="small" effect="plain" style="margin-right:4px" round>{{ getRoleName(rid) }}</el-tag>
              <span v-if="!row.roleIds?.length" style="color:var(--text-placeholder);font-size:12px">未分配</span>
            </template>
          </el-table-column>
          <el-table-column prop="dept" label="部门" min-width="100">
            <template #default="{ row }">
              <span v-if="row.dept" class="dept-tag" @click.stop="selectDeptByName(row.dept)">{{ row.dept }}</span>
              <span v-else style="color:var(--text-placeholder);font-size:12px">未分配</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100" align="center" sortable="custom">
            <template #default="{ row }">
              <span class="inline-status" :class="row.status === '启用' ? 'active' : 'inactive'">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="加入时间" width="120" align="center" sortable="custom" />
          <el-table-column label="操作" width="220" fixed="right" align="center">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="handleEditMember(row)">编辑</el-button>
              <el-button size="small" text type="warning" @click="handleToggleStatus(row)">
                {{ row.status === '启用' ? '禁用' : '启用' }}
              </el-button>
              <el-button size="small" text type="danger" @click="handleDeleteMember(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="total, sizes, prev, pager, next"
            background
            @current-change="fetchMembers"
            @size-change="handleSizeChange"
          />
        </div>
      </div>
    </main>

    <!-- ═══ 添加/编辑成员弹窗 ═══ -->
    <MemberFormDialog
      v-model:visible="memberDialogVisible"
      :editing-member="editingMember"
      :roles="roles"
      :dept-tree="deptTree"
      :submitting="memberSubmitting"
      @submit="onMemberSubmit"
    />

    <!-- ═══ 新建/编辑部门弹窗 ═══ -->
    <DeptFormDialog
      v-model:visible="deptDialogVisible"
      :editing-dept="editingDept"
      :dept-tree="deptTree"
      :user-options="userOptions"
      :submitting="deptSubmitting"
      @submit="onDeptSubmit"
    />
    <!-- ═══ 右键菜单 ═══ -->
    <teleport to="body">
      <transition name="ctx-menu">
        <div
          v-if="ctxMenu.visible"
          class="ctx-menu"
          :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
          @click.stop
        >
          <div class="ctx-menu-item" @click="handleCtxCommand('add')">
            <el-icon><FolderAdd /></el-icon><span>新建子部门</span>
          </div>
          <div class="ctx-menu-item" @click="handleCtxCommand('edit')">
            <el-icon><Edit /></el-icon><span>编辑部门</span>
          </div>
          <div class="ctx-menu-divider" />
          <div class="ctx-menu-item ctx-menu-item--danger" @click="handleCtxCommand('delete')">
            <el-icon><Delete /></el-icon><span>删除部门</span>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Search, OfficeBuilding, Refresh, Plus,
  UserFilled, MoreFilled, Edit, Delete, FolderAdd,
} from '@element-plus/icons-vue'
import StatPills from './components/StatPills.vue'
import MemberFormDialog from './components/MemberFormDialog.vue'
import DeptFormDialog from './components/DeptFormDialog.vue'
import { useDeptTree, findDeptByName } from '@/composables/useDeptTree'
import { useMemberList } from '@/composables/useMemberList'
import { useFeishuSync } from '@/composables/useFeishuSync'
import { badgeColor, avatarColor } from '@/composables/useOrgColors'
import type { Department, Member } from '@/types/organization'

// ═══ 树引用（模板 ref） ═══
const treeRef = ref<any>(null)

// ═══ Composables ═══
const dept = useDeptTree()

const member = useMemberList(
  () => dept.deptTree.value,
  () => dept.selectedDept.value
)

const sync = useFeishuSync(() => {
  dept.fetchDeptTree()
  dept.fetchUserOptions()
  member.fetchMembers()
  member.fetchOverviewStats()
})

// ═══ 弹窗编辑状态 ═══
const editingMember = ref<Member | null>(null)
const editingDept = ref<Department | null>(null)
const memberDialogVisible = ref(false)
const memberSubmitting = ref(false)
const deptDialogVisible = ref(false)
const deptSubmitting = ref(false)

// ═══ 注入部门弹窗回调，接管弹窗管理 ═══
dept.setDeptDialogHandler((data: Department | null, parentId?: number | null) => {
  if (data) {
    editingDept.value = data
  } else {
    editingDept.value = parentId != null ? { id: 0, name: '', parent: parentId, status: '启用' } as Department : null
  }
  deptDialogVisible.value = true
})

dept.setDeptMutatedHandler(() => {
  member.fetchMembers()
})

// ═══ 模板别名 ═══
// — 部门树
const deptTree = dept.deptTree
const treeLoading = dept.treeLoading
const deptCount = dept.deptCount
const selectedDept = dept.selectedDept
const hoveredNode = dept.hoveredNode
const userOptions = dept.userOptions
const treeProps = dept.treeProps
const handleTreeContext = dept.handleTreeContext
const ctxMenu = dept.ctxMenu
const handleCtxCommand = dept.handleCtxCommand
// — 成员列表
const members = member.members
const listLoading = member.listLoading
const selectedRows = member.selectedRows
const total = member.total
const activeCount = member.activeCount
const inactiveCount = member.inactiveCount
const overviewTotal = member.overviewTotal
const overviewActiveCount = member.overviewActiveCount
const overviewInactiveCount = member.overviewInactiveCount
const currentPage = member.currentPage
const pageSize = member.pageSize
const queryParams = member.queryParams
const roles = member.roles
// — 成员列表操作
const fetchMembers = member.fetchMembers
const getRoleName = member.getRoleName
const handleSearch = member.handleSearch
const handleSizeChange = member.handleSizeChange
const onSortChange = member.onSortChange
const headerCellStyle = member.headerCellStyle
const phoneMask = member.phoneMask
const batchToggle = member.batchToggle
// — 飞书同步
const syncing = sync.syncing
const lastSyncTime = sync.lastSyncTime
const handleSyncAll = sync.handleSyncAll

// ═══ 跨 composable 协调函数 ═══

/** 选择部门 */
function selectDept(node: Department | null) {
  dept.selectDept(node)
  member.onDeptChanged()
  if (treeRef.value) {
    treeRef.value.setCurrentKey(node ? node.id : null)
  }
}

/** 树节点点击 — 走包装版 selectDept */
function onTreeNodeClick(data: Department) {
  selectDept(data)
}

function selectDeptByName(name: string) {
  const found = findDeptByName(dept.deptTree.value, name)
  if (found) selectDept(found)
}

function handleDeptAction(cmd: string) {
  if (cmd === 'add') {
    editingDept.value = null
    deptDialogVisible.value = true
  } else if (cmd === 'syncDept') {
    sync.handleSyncDeptsOnly()
  }
}

// ── 成员操作 ──
function handleAddMember() {
  editingMember.value = null
  memberDialogVisible.value = true
}

function handleEditMember(row: Member) {
  editingMember.value = row
  memberDialogVisible.value = true
}

async function onMemberSubmit(payload: Record<string, unknown>) {
  memberSubmitting.value = true
  try {
    if (editingMember.value?.id) {
      await member.updateMemberApi(editingMember.value.id, payload)
    } else {
      await member.createMemberApi(payload)
    }
    memberDialogVisible.value = false
    dept.fetchDeptTree()
    member.fetchOverviewStats()
  } catch {
    /* API 层已处理错误消息 */
  } finally {
    memberSubmitting.value = false
  }
}

async function handleToggleStatus(row: Member) {
  await member.handleToggleStatus(row)
  dept.fetchDeptTree()
  member.fetchOverviewStats()
}

async function handleDeleteMember(row: Member) {
  await member.handleDeleteMember(row)
  dept.fetchDeptTree()
  member.fetchOverviewStats()
}

// ── 部门操作 ──
function handleAddDept() {
  editingDept.value = null
  deptDialogVisible.value = true
}

function handleEditDept(data: Department) {
  editingDept.value = data
  deptDialogVisible.value = true
}

async function onDeptSubmit(payload: Record<string, unknown>) {
  deptSubmitting.value = true
  try {
    if (editingDept.value?.id) {
      await dept.updateDeptApi(editingDept.value.id, payload)
    } else {
      await dept.createDeptApi(payload)
    }
    deptDialogVisible.value = false
    member.fetchMembers()
    member.fetchOverviewStats()
  } catch {
    /* API 层已处理错误消息 */
  } finally {
    deptSubmitting.value = false
  }
}

async function handleDeleteDept(data: Department) {
  await dept.handleDeleteDept(data)
  member.fetchMembers()
}

// ═══ 初始化 ═══
onMounted(() => {
  document.addEventListener('click', dept.closeCtxMenu)
  dept.fetchDeptTree()
  dept.fetchUserOptions()
  member.fetchRoles()
  member.fetchMembers()
  member.fetchOverviewStats()
})

onUnmounted(() => {
  document.removeEventListener('click', dept.closeCtxMenu)
  member.cleanup()
})</script>

<style scoped lang="scss">
.org-page {
  display: flex;
  gap: 20px;
  padding: 24px;
  height: calc(100vh - 120px);
  overflow: hidden;
}

// ═══ 左侧面板 ═══
.org-sidebar {
  width: 260px;
  flex-shrink: 0;
  background: var(--bg-card);
  border-radius: 14px;
  box-shadow: var(--shadow-dropdown);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--border-light);
}
.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: .3px;
}

.dept-node--all {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  margin: 8px 10px 4px;
  border-radius: 10px;
  cursor: pointer;
  transition: all .18s;

  &:hover { background: var(--bg-hover); }
  &.is-active {
    background: var(--el-color-primary-light-9);
    .dept-node__label { color: var(--el-color-primary); font-weight: 600; }
    .dept-node__icon { background: var(--el-color-primary); color: #fff; }
    .dept-node__count { background: var(--el-color-primary); color: #fff; }
  }
}
.dept-node__icon {
  width: 30px; height: 30px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: all .18s;
}
.dept-node__label {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}
.dept-node__count {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

// ─── 部门树 ───
.dept-tree-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 4px 10px 10px;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
    &:hover { background: var(--text-placeholder); }
  }

  :deep(.el-tree) {
    background: transparent;
    --el-tree-node-hover-bg-color: var(--bg-hover);
    --el-tree-node-content-height: 40px;
  }
  :deep(.el-tree-node__content) {
    border-radius: 8px;
    padding-left: 8px;
  }
  :deep(.el-tree-node.is-current > .el-tree-node__content) {
    background: var(--el-color-primary-light-9);
    .tree-node-name { color: var(--el-color-primary); font-weight: 600; }
    .tree-node-count { background: var(--el-color-primary); color: #fff; }
  }
}

.tree-node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 4px;
}
.tree-node-left {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}
.tree-node-badge {
  width: 24px; height: 24px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 11px; font-weight: 700;
  flex-shrink: 0;
}
.tree-node-name {
  font-size: 13px;
  max-width: 8em;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-node-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.tree-node-count {
  padding: 1px 7px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  transition: all .15s;
}
.tree-node-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.action-icon {
  padding: 3px;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all .15s;
  &:hover { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &--danger:hover { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
}

.dept-tree-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 8px;
  p { font-size: 13px; color: var(--text-placeholder); margin: 0; }
}

.sidebar-footer {
  padding: 10px 18px;
  border-top: 1px solid var(--border-light);
}
.sync-hint {
  font-size: 11px;
  color: var(--text-placeholder);
}

// ═══ 右侧主区域 ═══
.org-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

// ── 工具栏 ──
.toolbar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: var(--bg-card);
  border-radius: 12px;
  margin-bottom: 14px;
  box-shadow: var(--shadow-dropdown);
  gap: 12px;
}
.toolbar-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.toolbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.search-input { width: 170px; }
.filter-select { width: 120px; }
.filter-select-sm { width: 100px; }
.dept-filter-tag { font-weight: 500; cursor: default; }

.batch-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 18px; margin: 4px 12px 8px;
  background: var(--el-color-primary-light-9);
  border-radius: 10px;
  border: 1px solid var(--el-color-primary-light-7);
  box-shadow: var(--shadow-card);
  .batch-text { font-size: 13px; color: var(--el-color-primary); font-weight: 600; white-space: nowrap; }
}

// ── 表格 ──
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
}

.member-cell { display: flex; align-items: center; gap: 12px; }
.member-avatar { border-radius: 10px; font-size: 14px; font-weight: 600; flex-shrink: 0; }
.member-info {
  display: flex; flex-direction: column;
  .member-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
  .member-account { font-size: 12px; color: var(--text-secondary); margin-top: 1px; }
}

.inline-status {
  font-size: 12px; font-weight: 500;
  padding: 3px 10px; border-radius: 20px;
  &.active { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.inactive { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
}

.dept-tag {
  display: inline-block;
  padding: 2px 10px;
  background: var(--bg-elevated);
  border-radius: 12px;
  font-size: 12px; color: var(--text-regular);
  cursor: pointer;
  transition: all .15s;
  &:hover { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
}

.pagination-wrap {
  display: flex; justify-content: flex-end;
  padding: 14px 20px 6px;
}

// ── 空状态 ──
.table-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px;
  .empty-icon { color: var(--text-placeholder); margin-bottom: 16px; opacity: .5; }
  .empty-title { font-size: 15px; font-weight: 600; color: var(--text-regular); margin: 0 0 6px; }
  .empty-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; }
  .empty-actions { display: flex; gap: 10px; }
}

// ── 动画 ──
.fade-enter-active, .fade-leave-active { transition: all .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }

// ── 右键菜单 ──
.ctx-menu {
  position: fixed;
  z-index: 9999;
  min-width: 150px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: var(--shadow-dropdown);
  padding: 5px;
}
.ctx-menu-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 6px;
  font-size: 13px; color: var(--text-regular);
  cursor: pointer; transition: all .15s;
  &:hover { background: var(--bg-hover); color: var(--text-primary); }
  &--danger {
    color: var(--el-color-danger);
    &:hover { background: var(--el-color-danger-light-9); }
  }
}
.ctx-menu-divider {
  height: 1px; background: var(--border-light); margin: 4px 8px;
}
.ctx-menu-enter-active, .ctx-menu-leave-active { transition: all .15s ease; }
.ctx-menu-enter-from, .ctx-menu-leave-to { opacity: 0; transform: scale(.95); }

// ── 侧边栏徽章 ──
.sidebar-badge {
  font-size: 11px; color: var(--text-secondary);
  padding: 2px 8px; border-radius: 8px;
  background: var(--bg-hover); font-weight: 500;
}
</style>
