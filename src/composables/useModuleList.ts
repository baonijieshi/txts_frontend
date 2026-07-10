import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getModuleList, getModuleFlatList, createModule, updateModule, deleteModule,
} from '@/api/module'
import type { ModuleNode } from '@/types/organization'

/** 在树中查找从根到目标节点 id 的路径 */
function findParentPath(nodes: ModuleNode[], targetId: number, path: number[] = []): number[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return [...path, node.id]
    if (node.children) {
      const result = findParentPath(node.children, targetId, [...path, node.id])
      if (result) return result
    }
  }
  return null
}

export function useModuleList() {
  // ── 列表 ──
  const queryParams = ref({ name: '', status: '' })
  const listLoading = ref(false)
  const modules = ref<ModuleNode[]>([])
  const flatModules = ref<ModuleNode[]>([])

  async function fetchList() {
    listLoading.value = true
    try {
      const params: Record<string, string> = {}
      if (queryParams.value.name) params.name = queryParams.value.name
      if (queryParams.value.status) params.status = queryParams.value.status
      const res = await getModuleList(params)
      modules.value = (res.data || []) as ModuleNode[]
    } catch {
      /* 静默降级 */
    } finally {
      listLoading.value = false
    }
  }

  async function fetchFlatList() {
    try {
      const res = await getModuleFlatList()
      flatModules.value = (res.data || []) as ModuleNode[]
    } catch {
      /* 静默降级 */
    }
  }

  function handleSearch() { fetchList() }
  function handleReset() {
    queryParams.value = { name: '', status: '' }
    fetchList()
  }

  // ── 统计 ──
  const activeModuleCount = computed(() =>
    flatModules.value.filter((m) => m.status === '启用').length
  )
  const inactiveModuleCount = computed(() =>
    flatModules.value.filter((m) => m.status === '禁用').length
  )

  // ── cascader 选项 ──
  const editingId = ref<number | null>(null)

  const moduleTreeOptions = computed(() => {
    const build = (nodes: ModuleNode[], depth = 1): Array<{ id: number; name: string; children?: ReturnType<typeof build> }> =>
      nodes
        .filter((n) => n.id !== editingId.value)
        .map((n) => ({
          id: n.id,
          name: n.name,
          children: n.children?.length && depth < 3 ? build(n.children, depth + 1) : undefined,
        }))
    return build(modules.value)
  })

  // ── CRUD ──
  const saving = ref(false)

  function initFormForAdd(parentRow: ModuleNode | null) {
    editingId.value = null
    return {
      parentPath: parentRow ? (findParentPath(modules.value, parentRow.id) || [parentRow.id]) : [],
      name: '',
      description: '',
      status: '启用' as const,
    }
  }

  function initFormForEdit(row: ModuleNode) {
    editingId.value = row.id
    return {
      parentPath: row.parent ? (findParentPath(modules.value, row.parent) || [row.parent]) : [],
      name: row.name,
      description: row.description || '',
      status: row.status,
    }
  }

  async function submitModule(
    payload: { name: string; description: string; parentPath: number[]; status: string }
  ) {
    const apiPayload: Record<string, unknown> = {
      name: payload.name,
      description: payload.description,
      parent: payload.parentPath?.length ? payload.parentPath[payload.parentPath.length - 1] : null,
      status: payload.status,
    }
    if (editingId.value) {
      await updateModule(editingId.value, apiPayload)
      ElMessage.success('模块已更新')
    } else {
      await createModule(apiPayload)
      ElMessage.success('模块已创建')
    }
    await fetchList()
    await fetchFlatList()
  }

  async function handleDelete(row: ModuleNode) {
    try {
      await ElMessageBox.confirm(
        `确定删除模块「${row.name}」？删除后子模块也将一并删除。`,
        '提示',
        { type: 'warning' }
      )
    } catch {
      return
    }
    try {
      await deleteModule(row.id)
      ElMessage.success('已删除')
      await fetchList()
      await fetchFlatList()
    } catch {
      ElMessage.error('删除失败，请稍后重试')
    }
  }

  return {
    // 列表
    queryParams,
    listLoading,
    modules,
    flatModules,
    fetchList,
    fetchFlatList,
    handleSearch,
    handleReset,
    // 统计
    activeModuleCount,
    inactiveModuleCount,
    // 表单
    editingId,
    moduleTreeOptions,
    saving,
    initFormForAdd,
    initFormForEdit,
    submitModule,
    handleDelete,
  }
}
