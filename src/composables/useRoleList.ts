import { ref, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getRoleList, createRole, updateRole, deleteRole, saveRolePermissions, getMenuTree,
} from '@/api/role'
import type { RoleDetail, MenuNode } from '@/types/organization'

/** 将后端菜单数据转为 tree 组件需要的格式 */
function toTreeShape(items: Array<Record<string, unknown>>): MenuNode[] {
  return items.map((item) => ({
    id: item.perm_id as string,
    label: item.title as string,
    icon: (item.icon || '') as string,
    children: item.children ? toTreeShape(item.children as Array<Record<string, unknown>>) : undefined,
  }))
}

/** 递归收集所有菜单 ID */
function collectIds(nodes: MenuNode[]): string[] {
  const ids: string[] = []
  const walk = (items: MenuNode[]) => {
    items.forEach((item) => {
      ids.push(item.id)
      if (item.children) walk(item.children)
    })
  }
  walk(nodes)
  return ids
}

export function useRoleList() {
  // ── 角色列表 ──
  const roleListLoading = ref(false)
  const roles = ref<RoleDetail[]>([])

  async function fetchRoles() {
    roleListLoading.value = true
    try {
      const res = await getRoleList()
      roles.value = (res.data || []) as RoleDetail[]
    } catch {
      /* 静默降级 */
    } finally {
      roleListLoading.value = false
    }
  }

  // ── 菜单树 ──
  const menuTree = ref<MenuNode[]>([])
  const allMenuIds = ref<string[]>([])
  const totalMenuCount = ref(0)

  async function fetchMenuTree() {
    try {
      const res = await getMenuTree()
      const shaped = toTreeShape(res.data || [])
      menuTree.value = shaped
      const ids = collectIds(shaped)
      allMenuIds.value = ids
      totalMenuCount.value = ids.length
    } catch {
      /* 静默降级 */
    }
  }

  const treeProps = { children: 'children', label: 'label' }

  // ── 当前选中角色 ──
  const currentRole = ref<RoleDetail | null>(null)
  const treeRef = ref<any>(null)

  function onRoleSelect(row: RoleDetail) {
    currentRole.value = row
    nextTick(() => {
      if (treeRef.value && row) {
        treeRef.value.setCheckedKeys(row.permissions || [])
      }
    })
  }

  // ── 全选逻辑 ──
  const checkedCount = computed(() =>
    currentRole.value ? (currentRole.value.permissions || []).length : 0
  )

  const isAllChecked = computed(() =>
    checkedCount.value === totalMenuCount.value && totalMenuCount.value > 0
  )

  const isIndeterminate = computed(() =>
    checkedCount.value > 0 && checkedCount.value < totalMenuCount.value
  )

  function handleCheckAll(val: boolean) {
    if (!treeRef.value || !currentRole.value) return
    if (val) {
      treeRef.value.setCheckedKeys(allMenuIds.value)
      currentRole.value.permissions = [...allMenuIds.value]
    } else {
      treeRef.value.setCheckedKeys([])
      currentRole.value.permissions = []
    }
  }

  function onTreeCheck() {
    if (!treeRef.value || !currentRole.value) return
    currentRole.value.permissions = treeRef.value.getCheckedKeys()
  }

  // ── 保存权限 ──
  const savingPermissions = ref(false)

  async function handleSavePermissions() {
    if (!currentRole.value) return
    savingPermissions.value = true
    try {
      await saveRolePermissions(currentRole.value.id, currentRole.value.permissions || [])
      ElMessage.success('权限已保存')
      await fetchRoles()
    } catch {
      ElMessage.error('保存权限失败')
    } finally {
      savingPermissions.value = false
    }
  }

  // ── 角色 CRUD ──
  const roleSaving = ref(false)

  async function createRoleApi(payload: Record<string, unknown>) {
    await createRole({ ...payload, permissions: ['dashboard'] })
    ElMessage.success('角色已创建')
    await fetchRoles()
  }

  async function updateRoleApi(id: number, payload: Record<string, unknown>) {
    await updateRole(id, payload)
    ElMessage.success('角色已更新')
    await fetchRoles()
  }

  async function handleDeleteRole(row: RoleDetail) {
    try {
      await ElMessageBox.confirm(
        `确定删除角色「${row.name}」？删除后该角色下的成员将失去对应权限。`,
        '提示',
        { type: 'warning' }
      )
    } catch {
      return
    }
    try {
      await deleteRole(row.id)
      if (currentRole.value?.id === row.id) {
        currentRole.value = null
      }
      ElMessage.success('已删除')
      await fetchRoles()
    } catch {
      ElMessage.error('删除失败，请稍后重试')
    }
  }

  // ── 统计 ──
  const assignedCount = computed(() =>
    roles.value.filter((r) => (r.memberCount || 0) > 0).length
  )

  return {
    // 角色
    roleListLoading,
    roles,
    fetchRoles,
    assignedCount,
    // 菜单
    menuTree,
    allMenuIds,
    totalMenuCount,
    fetchMenuTree,
    treeProps,
    // 选中
    currentRole,
    treeRef,
    onRoleSelect,
    // 权限操作
    checkedCount,
    isAllChecked,
    isIndeterminate,
    handleCheckAll,
    onTreeCheck,
    savingPermissions,
    handleSavePermissions,
    // CRUD
    roleSaving,
    createRoleApi,
    updateRoleApi,
    handleDeleteRole,
  }
}
