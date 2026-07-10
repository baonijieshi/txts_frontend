/** 部门节点（含树形结构） */
export interface Department {
  id: number
  name: string
  description?: string
  parent?: number | null
  leader?: number | null
  sort_order?: number
  status: '启用' | '禁用'
  memberCount?: number
  children?: Department[]
}

/** 成员/用户 */
export interface Member {
  id: number
  name: string
  username: string
  email: string
  phone: string
  avatar?: string
  roleIds?: number[]
  dept?: string
  status: '启用' | '禁用'
  createTime?: string
}

/** 成员列表查询参数 */
export interface MemberQueryParams {
  name?: string
  roleId?: string
  status?: string
  dept?: string
  ordering?: string
  page?: number
  pageSize?: number
}

/** 成员表单数据 */
export interface MemberFormData {
  name: string
  username: string
  email: string
  phone: string
  roleId: number | null
  dept: string
  status: '启用' | '禁用'
  password: string
}

/** 部门表单数据 */
export interface DeptFormData {
  name: string
  description: string
  parent: number | null
  leader: number | null
  sort_order: number
  status: '启用' | '禁用'
}

/** 角色 */
export interface Role {
  id: number
  name: string
}

/** 角色详情（含权限和成员数） */
export interface RoleDetail extends Role {
  description?: string
  permissions: string[]
  memberCount?: number
  created_at?: string
}

/** 菜单节点（树形） */
export interface MenuNode {
  id: string
  label: string
  icon?: string
  children?: MenuNode[]
}

/** 角色表单数据 */
export interface RoleFormData {
  name: string
  description: string
}

/** 模块节点（含树形结构） */
export interface ModuleNode {
  id: number
  name: string
  description?: string
  parent?: number | null
  sort_order?: number
  status: '启用' | '禁用'
  children?: ModuleNode[]
  hasChildren?: boolean
}

/** 模块表单数据 */
export interface ModuleFormData {
  parentPath: number[]
  name: string
  description: string
  status: '启用' | '禁用'
}

/** 用户选项（用于 UserCascader） */
export interface UserOption {
  id: number
  label: string
  avatar: string
  dept: string
}

/** 成员列表 API 响应 */
export interface MemberListResponse {
  list: Member[]
  total: number
  activeCount: number
  inactiveCount: number
}

/** 飞书同步计数结果 */
export interface SyncCountResult {
  created?: number
  updated?: number
  skipped?: number
  errors?: unknown[]
}

/** 右键菜单状态 */
export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  node: Department | null
}

/** 表单校验规则 */
export interface FormRule {
  required?: boolean
  message: string
  trigger: string
  type?: string
  pattern?: RegExp
}
