import { ref, computed, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import type {
  Member, MemberFormData, MemberQueryParams, Role, MemberListResponse,
} from '@/types/organization'
import {
  getMemberList, createMember, updateMember, deleteMember, toggleMemberStatus,
} from '@/api/member'
import { getRoleList } from '@/api/role'
import { findDeptIdByName } from './useDeptTree'
import type { Department } from '@/types/organization'

export function useMemberList(deptTree: () => Department[], selectedDept: () => Department | null) {
  // ── 列表状态 ──
  const members = ref<Member[]>([])
  const listLoading = ref(false)
  const selectedRows = ref<Member[]>([])
  const total = ref(0)
  const activeCount = ref(0)
  const inactiveCount = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const queryParams = ref<MemberQueryParams>({ name: '', roleId: '', status: '', dept: '', ordering: '' })

  // ── 全局概览统计（不受部门筛选影响） ──
  const overviewTotal = ref(0)
  const overviewActiveCount = ref(0)
  const overviewInactiveCount = ref(0)

  /** 单独请求全局统计（不带 dept 筛选） */
  async function fetchOverviewStats() {
    try {
      const res = await getMemberList({ page: 1, pageSize: 1 })
      const data = res.data as MemberListResponse
      overviewTotal.value = data?.total || 0
      overviewActiveCount.value = data?.activeCount ?? 0
      overviewInactiveCount.value = data?.inactiveCount ?? 0
    } catch {
      /* 静默降级 */
    }
  }

  // ── 角色 ──
  const roles = ref<Role[]>([])

  async function fetchRoles() {
    try {
      const res = await getRoleList()
      roles.value = ((res.data || []) as Array<Record<string, unknown>>).map((r) => ({
        id: r.id as number,
        name: r.name as string,
      }))
    } catch {
      /* 静默降级 */
    }
  }

  function getRoleName(id: number | string): string {
    return roles.value.find((r) => Number(r.id) === Number(id))?.name || ''
  }

  // ── 获取成员列表 ──
  async function fetchMembers() {
    listLoading.value = true
    try {
      const res = await getMemberList({
        ...queryParams.value,
        page: currentPage.value,
        pageSize: pageSize.value,
      })
      const data = res.data as MemberListResponse
      members.value = data?.list || []
      total.value = data?.total || 0
      activeCount.value = data?.activeCount ?? 0
      inactiveCount.value = data?.inactiveCount ?? 0
    } catch {
      /* 静默降级 */
    } finally {
      listLoading.value = false
    }
  }

  // ── 选择部门时的回掉 ──
  function onDeptChanged() {
    const dept = selectedDept()
    queryParams.value.dept = dept ? dept.name : ''
    currentPage.value = 1
    fetchMembers()
  }

  // ── 搜索（防抖） ──
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  function handleSearch() {
    currentPage.value = 1
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => fetchMembers(), 300)
  }

  function handleSizeChange() {
    currentPage.value = 1
    fetchMembers()
  }

  function onSortChange({ prop, order }: { prop: string; order: string | null }) {
    if (order) {
      queryParams.value.ordering = order === 'descending' ? `-${prop}` : prop
    } else {
      delete queryParams.value.ordering
    }
    fetchMembers()
  }

  // ── 清理定时器 ──
  function cleanup() {
    if (searchTimer) {
      clearTimeout(searchTimer)
      searchTimer = null
    }
  }

  onUnmounted(cleanup)

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

  // ── 手机号脱敏 ──
  function phoneMask(phone: string): string {
    if (!phone || phone.length < 7) return phone || '-'
    return phone.replace(/(\d{3})\d{4}(\d+)/, '$1****$2')
  }

  // ── 成员 CRUD 表单 ──
  const memberDialogVisible = ref(false)
  const memberDialogTitle = ref('添加成员')
  const memberFormRef = ref<any>(null)
  const editingMemberId = ref<number | null>(null)
  const memberSubmitting = ref(false)
  const memberFormDeptId = ref<number | null>(null)

  const defaultMemberForm = (): MemberFormData => ({
    name: '', username: '', email: '', phone: '',
    roleId: null, dept: '', status: '启用', password: '',
  })
  const memberForm = ref<MemberFormData>(defaultMemberForm())

  const memberFormRules = computed(() => {
    const rules: Record<string, Array<Record<string, unknown>>> = {
      name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
      username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
      email: [
        { required: true, message: '请输入邮箱', trigger: 'blur' },
        { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
      ],
      phone: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^\+?[\d\s-]{7,15}$/, message: '手机号格式不正确', trigger: 'blur' },
      ],
      roleId: [{ required: true, message: '请选择角色', trigger: 'change' }],
      dept: [{ required: true, message: '请选择部门', trigger: 'change' }],
    }
    if (!editingMemberId.value) {
      rules.password = [{ required: true, message: '请输入初始密码', trigger: 'blur' }]
    }
    return rules
  })

  function handleAddMember() {
    editingMemberId.value = null
    memberDialogTitle.value = '添加成员'
    const form = defaultMemberForm()
    const selDept = selectedDept()
    if (selDept) form.dept = selDept.name
    memberForm.value = form
    memberFormDeptId.value = selDept
      ? findDeptIdByName(deptTree(), selDept.name)
      : null
    memberDialogVisible.value = true
  }

  function handleEditMember(row: Member) {
    editingMemberId.value = row.id
    memberDialogTitle.value = '编辑成员'
    memberForm.value = {
      name: row.name,
      username: row.username,
      email: row.email,
      phone: row.phone,
      roleId: row.roleIds?.[0] ?? null,
      dept: row.dept || '',
      status: row.status,
      password: '',
    }
    memberFormDeptId.value = row.dept ? findDeptIdByName(deptTree(), row.dept) : null
    memberDialogVisible.value = true
  }

  function onMemberDeptChange(val: number | null) {
    if (!val) {
      memberForm.value.dept = ''
    } else {
      const deptNode = findDeptById(deptTree(), val)
      memberForm.value.dept = deptNode ? deptNode.name : ''
    }
  }

  async function handleSubmitMember() {
    if (!memberFormRef.value) return
    try {
      await memberFormRef.value.validate()
    } catch {
      return
    }
    memberSubmitting.value = true
    try {
      const payload: Record<string, unknown> = { ...memberForm.value }
      payload.roleIds = payload.roleId != null ? [payload.roleId] : []
      delete payload.roleId
      if (editingMemberId.value) {
        await updateMember(editingMemberId.value, payload)
        ElMessage.success('成员已更新')
      } else {
        await createMember(payload)
        ElMessage.success('成员已添加')
      }
      memberDialogVisible.value = false
      await fetchMembers()
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.message || '保存失败，请稍后重试')
    } finally {
      memberSubmitting.value = false
    }
  }

  async function handleToggleStatus(row: Member) {
    const isDisabling = row.status === '启用'
    if (isDisabling) {
      try {
        await ElMessageBox.confirm(
          `确定禁用「${row.name}」？禁用后该成员将无法登录。`,
          '禁用确认',
          { type: 'warning' }
        )
      } catch {
        return
      }
    }
    try {
      const res = await toggleMemberStatus(row.id)
      row.status = (res.data as { status: '启用' | '禁用' }).status
      ElMessage.success(isDisabling ? '已禁用' : '已启用')
      await fetchMembers()
    } catch {
      ElMessage.error('操作失败')
    }
  }

  async function handleDeleteMember(row: Member) {
    try {
      await ElMessageBox.confirm(
        `确定删除「${row.name}」？删除后该成员的所有数据将被清除。`,
        '提示',
        { type: 'warning' }
      )
    } catch {
      return
    }
    try {
      await deleteMember(row.id)
      ElMessage.success('已删除')
      await fetchMembers()
    } catch {
      ElMessage.error('删除失败，请稍后重试')
    }
  }

  // ── 批量操作 ──
  async function batchToggle(targetStatus: string) {
    const ids = selectedRows.value.map((r) => r.id)
    if (!ids.length) return
    try {
      await ElMessageBox.confirm(
        `确定将选中的 ${ids.length} 名成员${targetStatus}吗？`,
        '批量操作',
        { type: 'warning' }
      )
    } catch {
      return
    }
    const notifyId = `batch-${Date.now()}`
    ;(ElNotification as any)({
      id: notifyId,
      title: '批量操作进行中',
      message: `正在处理 ${ids.length} 名成员...`,
      type: 'info',
      duration: 0,
    })
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const res = await toggleMemberStatus(id)
        const row = members.value.find((m) => m.id === id)
        if (row) row.status = (res.data as { status: '启用' | '禁用' }).status
      })
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    ;(ElNotification as any).close(notifyId)
    if (failed > 0) {
      ElMessage.warning(`已完成：${results.length - failed} 人${targetStatus}，${failed} 人失败`)
    } else {
      ElMessage.success(`已${targetStatus} ${results.length} 名成员`)
    }
    selectedRows.value = []
    await fetchMembers()
  }

  // ── 纯 API 方法（供外部组件调用，不依赖内部表单状态） ──
  async function createMemberApi(payload: Record<string, unknown>) {
    await createMember(payload)
    ElMessage.success('成员已添加')
    await fetchMembers()
  }

  async function updateMemberApi(id: number, payload: Record<string, unknown>) {
    await updateMember(id, payload)
    ElMessage.success('成员已更新')
    await fetchMembers()
  }

  return {
    // 列表状态
    members,
    listLoading,
    selectedRows,
    total,
    activeCount,
    inactiveCount,
    overviewTotal,
    overviewActiveCount,
    overviewInactiveCount,
    currentPage,
    pageSize,
    queryParams,
    roles,
    // 成员操作
    fetchMembers,
    fetchRoles,
    fetchOverviewStats,
    getRoleName,
    onDeptChanged,
    handleSearch,
    handleSizeChange,
    onSortChange,
    headerCellStyle,
    phoneMask,
    cleanup,
    // CRUD 表单
    memberDialogVisible,
    memberDialogTitle,
    memberFormRef,
    editingMemberId,
    memberSubmitting,
    memberFormDeptId,
    memberForm,
    memberFormRules,
    handleAddMember,
    handleEditMember,
    onMemberDeptChange,
    handleSubmitMember,
    handleToggleStatus,
    handleDeleteMember,
    // 批量
    batchToggle,
    // 纯 API（供外部组件）
    createMemberApi,
    updateMemberApi,
  }
}

/** 按 ID 在树中查找 — 本地工具函数 */
function findDeptById(nodes: Department[], id: number): Department | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const f = findDeptById(n.children, id)
      if (f) return f
    }
  }
  return null
}
