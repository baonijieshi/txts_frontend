<template>
  <el-dialog
    :model-value="visible"
    :title="isEditing ? '编辑成员' : '添加成员'"
    width="620px"
    destroy-on-close
    :close-on-click-modal="false"
    class="org-dialog"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" class="org-form">
      <div class="form-section">
        <div class="form-section-title">基本信息</div>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="账号" prop="username">
              <el-input v-model="form.username" placeholder="请输入账号" :disabled="isEditing" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <div class="form-section">
        <div class="form-section-title">组织归属</div>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="部门" prop="dept">
              <el-tree-select
                v-model="deptId"
                :data="deptTree"
                :props="{ label: 'name', value: 'id', children: 'children' }"
                placeholder="请选择部门"
                clearable
                check-strictly
                filterable
                style="width: 100%"
                @change="onDeptChange"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色" prop="roleId">
              <el-select v-model="form.roleId" placeholder="请选择角色" style="width: 100%">
                <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="启用" value="启用" />
                <el-option label="禁用" value="禁用" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item v-if="!isEditing" label="密码" prop="password">
              <el-input v-model="form.password" type="password" show-password placeholder="请输入初始密码" />
              <div class="field-hint">建议用户首次登录后修改密码</div>
            </el-form-item>
          </el-col>
        </el-row>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { Department, Role, Member, MemberFormData } from '@/types/organization'
import { findDeptById } from '@/composables/useDeptTree'

const props = defineProps<{
  visible: boolean
  editingMember: Member | null
  roles: Role[]
  deptTree: Department[]
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: Record<string, unknown>]
}>()

const formRef = ref<any>(null)
const isEditing = computed(() => !!props.editingMember)

// ── 工具函数 ──
function findDeptIdByName(nodes: Department[], name: string): number | null {
  for (const n of nodes) {
    if (n.name === name) return n.id
    if (n.children?.length) {
      const f = findDeptIdByName(n.children, name)
      if (f) return f
    }
  }
  return null
}

// ── 表单 ──
const defaultForm = (): MemberFormData => ({
  name: '', username: '', email: '', phone: '',
  roleId: null, dept: '', status: '启用', password: '',
})

const form = reactive<MemberFormData>(defaultForm())
const deptId = ref<number | null>(null)

// ── 校验规则 ──
const rules = computed(() => {
  const r: Record<string, Array<Record<string, unknown>>> = {
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
  if (!isEditing.value) {
    r.password = [{ required: true, message: '请输入初始密码', trigger: 'blur' }]
  }
  return r
})

// ── 初始化/重置表单 ──
function initForm() {
  const m = props.editingMember
  if (m) {
    form.name = m.name
    form.username = m.username
    form.email = m.email
    form.phone = m.phone
    form.roleId = m.roleIds?.[0] ?? null
    form.dept = m.dept || ''
    form.status = m.status
    form.password = ''
    deptId.value = m.dept ? findDeptIdByName(props.deptTree, m.dept) : null
  } else {
    Object.assign(form, defaultForm())
    deptId.value = null
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    initForm()
    // 重置校验状态
    setTimeout(() => formRef.value?.clearValidate?.(), 0)
  }
})

// ── 部门变更 ──
function onDeptChange(val: number | null) {
  if (!val) {
    form.dept = ''
  } else {
    const node = findDeptById(props.deptTree, val)
    form.dept = node ? node.name : ''
  }
}

// ── 提交 ──
async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  const payload: Record<string, unknown> = {
    name: form.name,
    username: form.username,
    email: form.email,
    phone: form.phone,
    roleIds: form.roleId != null ? [form.roleId] : [],
    dept: form.dept,
    status: form.status,
  }
  if (!isEditing.value) {
    payload.password = form.password
  }
  emit('submit', payload)
}
</script>

<style scoped lang="scss">
@use '../styles/dialog-common' as *;

.org-dialog { @extend %form-dialog; }
.org-form .form-section { @extend %form-section; }
.org-form .form-section-title { @extend %form-section-title; }
.field-hint { @extend %field-hint; }
</style>
