<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="520px"
    destroy-on-close
    :close-on-click-modal="false"
    class="org-dialog"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" class="org-form">
      <div class="form-section">
        <div class="form-section-title">基本信息</div>
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入部门名称" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="上级部门">
          <el-tree-select
            v-model="form.parent"
            :data="deptTree"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="无（顶级部门）"
            clearable
            check-strictly
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="部门描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="请输入部门描述" maxlength="100" show-word-limit />
        </el-form-item>
      </div>
      <div class="form-section">
        <div class="form-section-title">配置信息</div>
        <el-form-item label="负责人">
          <UserCascader v-model="form.leader" :user-list="userOptions" placeholder="请选择负责人" />
        </el-form-item>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="form.sort_order" :min="0" :max="999" style="width: 100%" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="启用" value="启用" />
                <el-option label="禁用" value="禁用" />
              </el-select>
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
import { ElMessage } from 'element-plus'
import UserCascader from '@/components/UserCascader.vue'
import type { Department, DeptFormData, UserOption } from '@/types/organization'

const props = defineProps<{
  visible: boolean
  editingDept: Department | null
  deptTree: Department[]
  userOptions: UserOption[]
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: Record<string, unknown>]
}>()

const formRef = ref<any>(null)
const isEditing = computed(() => !!props.editingDept)
const dialogTitle = computed(() => isEditing.value ? '编辑部门' : '新建部门')

// ── 表单 ──
const defaultForm = (): DeptFormData => ({
  name: '', description: '', parent: null, leader: null, sort_order: 0, status: '启用',
})

const form = reactive<DeptFormData>(defaultForm())

const rules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
}

// ── 初始化 ──
function initForm() {
  const d = props.editingDept
  if (d) {
    form.name = d.name
    form.description = d.description || ''
    form.parent = d.parent ?? null
    form.leader = d.leader ?? null
    form.sort_order = d.sort_order ?? 0
    form.status = d.status
  } else {
    Object.assign(form, defaultForm())
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    initForm()
    setTimeout(() => formRef.value?.clearValidate?.(), 0)
  }
})

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
    description: form.description,
    parent: form.parent ?? null,
    leader: form.leader,
    sort_order: form.sort_order,
    status: form.status,
  }
  // 编辑时校验不能将部门设为自身子部门
  if (isEditing.value && payload.parent === props.editingDept?.id) {
    ElMessage.warning('不能将部门设为自身的子部门')
    return
  }
  emit('submit', payload)
}
</script>

<style scoped lang="scss">
@use '../styles/dialog-common' as *;

.org-dialog { @extend %form-dialog; }
.org-form .form-section { @extend %form-section; }
.org-form .form-section-title { @extend %form-section-title; }
</style>
