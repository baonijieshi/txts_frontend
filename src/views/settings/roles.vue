<template>
  <div class="roles-page">
    <!-- ═══ 统计条 ═══ -->
    <div class="page-stats">
      <div class="stat-pill">
        <span class="stat-icon" style="background:var(--el-color-primary-light-9);color:var(--el-color-primary)">
          <el-icon :size="18"><Avatar /></el-icon>
        </span>
        <div class="stat-body">
          <span class="stat-value">{{ roles.length }}</span>
          <span class="stat-label">角色总数</span>
        </div>
      </div>
      <div class="stat-pill">
        <span class="stat-icon" style="background:var(--el-color-success-light-9);color:var(--el-color-success)">
          <el-icon :size="18"><Check /></el-icon>
        </span>
        <div class="stat-body">
          <span class="stat-value">{{ totalMenuCount }}</span>
          <span class="stat-label">权限项数</span>
        </div>
      </div>
      <div class="stat-pill">
        <span class="stat-icon" style="background:var(--el-color-warning-light-9);color:var(--el-color-warning)">
          <el-icon :size="18"><UserFilled /></el-icon>
        </span>
        <div class="stat-body">
          <span class="stat-value">{{ assignedCount }}</span>
          <span class="stat-label">已分配角色</span>
        </div>
      </div>
    </div>

    <!-- ═══ 主体：左侧角色列表 + 右侧权限配置 ═══ -->
    <div class="roles-body">
      <!-- 左侧：角色列表 -->
      <aside class="roles-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">角色列表</span>
          <el-button size="small" type="primary" @click="handleAddRole">
            <el-icon><Plus /></el-icon>新建
          </el-button>
        </div>

        <div class="role-list-wrap" v-loading="roleListLoading">
          <template v-if="roles.length > 0">
            <div
              v-for="role in roles"
              :key="role.id"
              class="role-item"
              :class="{ 'is-active': currentRole?.id === role.id }"
              @click="onRoleSelect(role)"
              @mouseenter="hoveredRole = role.id"
              @mouseleave="hoveredRole = null"
            >
              <span class="role-badge" :style="{ background: roleBadgeColor(role.name) }">
                {{ role.name.charAt(0) }}
              </span>
              <div class="role-info">
                <span class="role-name">{{ role.name }}</span>
                <span class="role-desc" v-if="role.description">{{ role.description }}</span>
              </div>
              <span class="role-count">{{ role.memberCount || 0 }}</span>
              <span v-if="hoveredRole === role.id" class="role-actions" @click.stop>
                <el-icon :size="13" class="action-icon" @click.stop="handleEditRole(role)"><Edit /></el-icon>
                <el-icon
                  :size="13"
                  class="action-icon action-icon--danger"
                  :class="{ 'is-disabled': role.name === '超级管理员' }"
                  @click.stop="role.name !== '超级管理员' && handleDeleteRole(role)"
                ><Delete /></el-icon>
              </span>
            </div>
          </template>
          <div v-else class="role-empty">
            <el-icon :size="28" style="color:var(--text-placeholder);opacity:.5"><Avatar /></el-icon>
            <p>暂无角色</p>
            <el-button size="small" type="primary" text style="margin-top:8px" @click="handleAddRole">
              <el-icon><Plus /></el-icon>新建角色
            </el-button>
          </div>
        </div>
      </aside>

      <!-- 右侧：权限配置 -->
      <main class="roles-main">
        <div class="perm-card">
          <div class="perm-header">
            <div class="perm-header-left">
              <span class="perm-title">
                菜单权限配置
                <template v-if="currentRole"> — {{ currentRole.name }}</template>
              </span>
              <el-tag v-if="currentRole" size="small" type="info" effect="plain">
                已选 {{ checkedCount }} / {{ totalMenuCount }} 项
              </el-tag>
            </div>
            <div class="perm-header-right">
              <el-checkbox
                v-if="currentRole"
                :model-value="isAllChecked"
                :indeterminate="isIndeterminate"
                @change="handleCheckAll"
              >全选</el-checkbox>
              <el-button size="small" link type="primary" @click="goToMenus">
                <el-icon><Link /></el-icon>管理菜单
              </el-button>
            </div>
          </div>

          <div v-if="currentRole" class="perm-body">
            <el-tree
              ref="treeRef"
              :data="menuTree"
              :props="treeProps"
              show-checkbox
              node-key="id"
              :default-checked-keys="currentRole.permissions"
              :default-expand-all="true"
              check-strictly
              @check="onTreeCheck"
            >
              <template #default="{ data }">
                <span class="tree-node">
                  <el-icon v-if="data.icon" style="margin-right:5px;font-size:14px">
                    <component :is="data.icon" />
                  </el-icon>
                  <span>{{ data.label }}</span>
                </span>
              </template>
            </el-tree>
          </div>

          <el-empty
            v-else
            description="请先在左侧选择或创建一个角色，然后为其分配菜单访问权限"
            :image-size="72"
          />

          <div v-if="currentRole" class="perm-footer">
            <el-button type="primary" :loading="savingPermissions" @click="handleSavePermissions">
              <el-icon><Check /></el-icon>保存权限
            </el-button>
          </div>
        </div>
      </main>
    </div>

    <!-- 新建/编辑角色弹窗 -->
    <RoleFormDialog
      v-model:visible="roleDialogVisible"
      :editing-role="editingRole"
      :submitting="roleSaving"
      @submit="onRoleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus, Edit, Delete, Avatar, Check, UserFilled, Link,
} from '@element-plus/icons-vue'
import RoleFormDialog from './components/RoleFormDialog.vue'
import { useRoleList } from '@/composables/useRoleList'
import { badgeColor } from '@/composables/useOrgColors'
import type { RoleDetail } from '@/types/organization'

const router = useRouter()

// ═══ Composables ═══
const role = useRoleList()

// ═══ 模板别名 ═══
const roleListLoading = role.roleListLoading
const roles = role.roles
const currentRole = role.currentRole
const menuTree = role.menuTree
const totalMenuCount = role.totalMenuCount
const treeProps = role.treeProps
const treeRef = role.treeRef
const checkedCount = role.checkedCount
const isAllChecked = role.isAllChecked
const isIndeterminate = role.isIndeterminate
const savingPermissions = role.savingPermissions
const assignedCount = role.assignedCount
const onRoleSelect = role.onRoleSelect
const handleCheckAll = role.handleCheckAll
const onTreeCheck = role.onTreeCheck
const handleSavePermissions = role.handleSavePermissions
const handleDeleteRole = role.handleDeleteRole
const roleSaving = role.roleSaving

// ── 角色徽章颜色 ──
const roleBadgeColor = badgeColor

// ── 悬浮态 ──
const hoveredRole = ref<number | null>(null)

// ── 弹窗 ──
const roleDialogVisible = ref(false)
const editingRole = ref<RoleDetail | null>(null)

function handleAddRole() {
  editingRole.value = null
  roleDialogVisible.value = true
}

function handleEditRole(row: RoleDetail) {
  editingRole.value = row
  roleDialogVisible.value = true
}

async function onRoleSubmit(payload: Record<string, unknown>) {
  role.roleSaving.value = true
  try {
    if (editingRole.value?.id) {
      await role.updateRoleApi(editingRole.value.id, payload)
    } else {
      await role.createRoleApi(payload)
    }
    roleDialogVisible.value = false
  } catch {
    /* API 层已处理 */
  } finally {
    role.roleSaving.value = false
  }
}

function goToMenus() {
  router.push('/settings/menus')
}

// ═══ 初始化 ═══
onMounted(() => {
  role.fetchRoles()
  role.fetchMenuTree()
})
</script>

<style scoped lang="scss">
.roles-page {
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

// ═══ 主体 ═══
.roles-body {
  flex: 1;
  display: flex;
  gap: 20px;
  min-height: 0;
  overflow: hidden;
}

// ── 左侧 ──
.roles-sidebar {
  width: 280px;
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
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--border-light);
}
.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: .3px;
}

.role-list-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
    &:hover { background: var(--text-placeholder); }
  }
}

.role-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all .18s;
  position: relative;

  &:hover { background: var(--bg-hover); }
  &.is-active {
    background: var(--el-color-primary-light-9);
    .role-name { color: var(--el-color-primary); font-weight: 600; }
    .role-badge { background: var(--el-color-primary) !important; }
    .role-count { background: var(--el-color-primary); color: #fff; }
  }
}
.role-badge {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; font-weight: 700;
  flex-shrink: 0;
}
.role-info {
  flex: 1;
  min-width: 0;
  display: flex; flex-direction: column;
  .role-name {
    font-size: 13px; font-weight: 500;
    color: var(--text-primary);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .role-desc {
    font-size: 11px; color: var(--text-secondary);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    margin-top: 1px;
  }
}
.role-count {
  padding: 1px 7px;
  border-radius: 8px;
  font-size: 11px; font-weight: 600;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  transition: all .15s;
  flex-shrink: 0;
}
.role-actions {
  display: flex; align-items: center; gap: 2px;
  flex-shrink: 0;
}
.action-icon {
  padding: 3px;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all .15s;
  &:hover { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &--danger:hover { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.is-disabled { opacity: .3; cursor: not-allowed; pointer-events: none; }
}

.role-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 8px;
  p { font-size: 13px; color: var(--text-placeholder); margin: 0; }
}

// ── 右侧 ──
.roles-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.perm-card {
  flex: 1;
  background: var(--bg-card);
  border-radius: 14px;
  box-shadow: var(--shadow-dropdown);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.perm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}
.perm-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.perm-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: .3px;
}
.perm-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.perm-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;

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
    --el-tree-node-content-height: 36px;
  }
  :deep(.el-tree-node__content) {
    border-radius: 6px;
    padding-left: 6px !important;
  }
}
.perm-footer {
  padding: 10px 20px;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.tree-node {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--text-regular);
}
</style>
