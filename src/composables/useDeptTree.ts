import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Department, DeptFormData, ContextMenuState, UserOption } from '@/types/organization'
import { getDeptTree, createDept, updateDept, deleteDept } from '@/api/department'
import { getUserList } from '@/api/user'

/** 部门树递归计数 */
function countDepts(nodes: Department[]): number {
  let c = 0
  for (const n of nodes) {
    c++
    if (n.children?.length) c += countDepts(n.children)
  }
  return c
}

/** 按名称在树中查找部门 */
export function findDeptByName(nodes: Department[], name: string): Department | null {
  for (const n of nodes) {
    if (n.name === name) return n
    if (n.children?.length) {
      const f = findDeptByName(n.children, name)
      if (f) return f
    }
  }
  return null
}

/** 按 ID 在树中查找部门 */
export function findDeptById(nodes: Department[], id: number): Department | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const f = findDeptById(n.children, id)
      if (f) return f
    }
  }
  return null
}

/** 按名称在树中查找部门 ID */
export function findDeptIdByName(nodes: Department[], name: string): number | null {
  const found = findDeptByName(nodes, name)
  return found ? found.id : null
}

export function useDeptTree(onDeptChanged?: () => void) {
  // ── 树状态 ──
  const deptTree = ref<Department[]>([])
  const treeLoading = ref(false)
  const deptCount = ref(0)
  const selectedDept = ref<Department | null>(null)
  const hoveredNode = ref<number | null>(null)
  const userOptions = ref<UserOption[]>([])

  // ── 树 Props ──
  const treeProps = { children: 'children', label: 'name' }

  // ── 获取部门树 ──
  async function fetchDeptTree() {
    treeLoading.value = true
    try {
      const res = await getDeptTree()
      deptTree.value = (res.data || []) as Department[]
      deptCount.value = countDepts(deptTree.value)
    } catch {
      /* 静默降级 — 页面展示空状态 */
    } finally {
      treeLoading.value = false
    }
  }

  // ── 获取用户选项 ──
  async function fetchUserOptions() {
    try {
      const res = await getUserList()
      userOptions.value = ((res.data || []) as Array<Record<string, unknown>>).map((u) => ({
        id: u.id as number,
        label: (u.first_name || u.username) as string,
        avatar: (u.avatar || '') as string,
        dept: (u.dept || '') as string,
      }))
    } catch {
      /* 静默降级 */
    }
  }

  // ── 选择部门 ──
  function selectDept(node: Department | null) {
    selectedDept.value = node
    onDeptChanged?.()
  }

  function selectDeptByName(name: string) {
    const found = findDeptByName(deptTree.value, name)
    if (found) selectDept(found)
  }

  function onTreeNodeClick(data: Department) {
    selectDept(data)
  }

  // ── 部门 CRUD 表单 ──
  const deptDialogVisible = ref(false)
  const deptDialogTitle = ref('新建部门')
  const deptFormRef = ref<any>(null)
  const editingDeptId = ref<number | null>(null)
  const deptSubmitting = ref(false)

  const defaultDeptForm = (): DeptFormData => ({
    name: '', description: '', parent: null, leader: null, sort_order: 0, status: '启用',
  })
  const deptForm = ref<DeptFormData>(defaultDeptForm())
  const deptFormRules = {
    name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  }

  function handleAddDept() {
    editingDeptId.value = null
    deptDialogTitle.value = '新建部门'
    deptForm.value = defaultDeptForm()
    deptDialogVisible.value = true
  }

  function handleEditDept(data: Department) {
    editingDeptId.value = data.id
    deptDialogTitle.value = '编辑部门'
    deptForm.value = {
      name: data.name,
      description: data.description || '',
      parent: data.parent ?? null,
      leader: data.leader ?? null,
      sort_order: data.sort_order ?? 0,
      status: data.status,
    }
    deptDialogVisible.value = true
  }

  async function handleSubmitDept() {
    if (!deptFormRef.value) return
    try {
      await deptFormRef.value.validate()
    } catch {
      return
    }
    deptSubmitting.value = true
    try {
      const payload = { ...deptForm.value }
      if (editingDeptId.value) {
        if (payload.parent === editingDeptId.value) {
          ElMessage.warning('不能将部门设为自身的子部门')
          deptSubmitting.value = false
          return
        }
        await updateDept(editingDeptId.value, payload as unknown as Record<string, unknown>)
        ElMessage.success('部门已更新')
      } else {
        await createDept(payload as unknown as Record<string, unknown>)
        ElMessage.success('部门已创建')
      }
      deptDialogVisible.value = false
      await fetchDeptTree()
      await fetchUserOptions()
    } catch {
      ElMessage.error('保存失败，请稍后重试')
    } finally {
      deptSubmitting.value = false
    }
  }

  async function handleDeleteDept(data: Department) {
    try {
      await ElMessageBox.confirm(
        `确定删除「${data.name}」？删除后该部门下成员的部门归属将变为空。`,
        '提示',
        { type: 'warning' }
      )
    } catch {
      return
    }
    try {
      await deleteDept(data.id)
      ElMessage.success('已删除')
      if (selectedDept.value?.id === data.id) selectDept(null)
      await fetchDeptTree()
    } catch {
      ElMessage.error('删除失败，请稍后重试')
    }
  }

  // ── 右键菜单 ──
  const ctxMenu = ref<ContextMenuState>({ visible: false, x: 0, y: 0, node: null })

  function handleTreeContext(e: MouseEvent, data: Department) {
    e.preventDefault()
    ctxMenu.value = { visible: true, x: e.clientX, y: e.clientY, node: data }
  }

  function closeCtxMenu() {
    ctxMenu.value.visible = false
  }

  function handleCtxCommand(cmd: string) {
    const node = ctxMenu.value.node
    ctxMenu.value.visible = false
    if (cmd === 'add') {
      if (onRequestDeptDialog) {
        onRequestDeptDialog(null, node?.id ?? null)
      } else {
        editingDeptId.value = null
        deptDialogTitle.value = '新建子部门'
        deptForm.value = { ...defaultDeptForm(), parent: node?.id ?? null }
        deptDialogVisible.value = true
      }
    } else if (cmd === 'edit' && node) {
      if (onRequestDeptDialog) onRequestDeptDialog(node)
      else handleEditDept(node)
    } else if (cmd === 'delete' && node) {
      handleDeleteDept(node).then(() => onDeptMutated?.())
    }
  }

  // ── 下拉菜单动作（新建/同步部门） ──
  function handleDeptAction(cmd: string, onSyncDept?: () => void) {
    if (cmd === 'add') {
      if (onRequestDeptDialog) onRequestDeptDialog(null)
      else handleAddDept()
    } else if (cmd === 'syncDept') {
      onSyncDept?.()
    }
  }

  // ── 回调：父组件可注入以接管弹窗管理 ──
  let onRequestDeptDialog: ((data: Department | null, parentId?: number | null) => void) | null = null
  let onDeptMutated: (() => void) | null = null

  function setDeptDialogHandler(handler: (data: Department | null, parentId?: number | null) => void) {
    onRequestDeptDialog = handler
  }

  function setDeptMutatedHandler(handler: () => void) {
    onDeptMutated = handler
  }

  // ── 纯 API 方法（供外部组件调用，不依赖内部表单） ──
  async function createDeptApi(payload: Record<string, unknown>) {
    await createDept(payload as Record<string, unknown>)
    ElMessage.success('部门已创建')
    await fetchDeptTree()
    await fetchUserOptions()
  }

  async function updateDeptApi(id: number, payload: Record<string, unknown>) {
    if (payload.parent === id) {
      ElMessage.warning('不能将部门设为自身的子部门')
      return
    }
    await updateDept(id, payload)
    ElMessage.success('部门已更新')
    await fetchDeptTree()
    await fetchUserOptions()
  }

  return {
    // 树状态
    deptTree,
    treeLoading,
    deptCount,
    selectedDept,
    hoveredNode,
    userOptions,
    treeProps,
    // 树操作
    fetchDeptTree,
    fetchUserOptions,
    selectDept,
    selectDeptByName,
    onTreeNodeClick,
    // 部门 CRUD
    deptDialogVisible,
    deptDialogTitle,
    deptFormRef,
    editingDeptId,
    deptSubmitting,
    deptForm,
    deptFormRules,
    handleAddDept,
    handleEditDept,
    handleSubmitDept,
    handleDeleteDept,
    // 右键菜单
    ctxMenu,
    handleTreeContext,
    closeCtxMenu,
    handleCtxCommand,
    // 下拉菜单
    handleDeptAction,
    // 回调注入
    setDeptDialogHandler,
    setDeptMutatedHandler,
    // 纯 API（供外部组件）
    createDeptApi,
    updateDeptApi,
  }
}
