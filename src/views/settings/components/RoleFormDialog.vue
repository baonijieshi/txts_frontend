<template>
  <el-dialog
    :model-value="visible"
    :title="isEditing ? '编辑角色' : '新建角色'"
    width="480px"
    destroy-on-close
    :close-on-click-modal="false"
    class="role-dialog"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" class="role-form">
      <div class="form-section">
        <div class="form-section-title">基本信息</div>
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入角色名称" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="角色描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
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
import type { RoleDetail, RoleFormData } from '@/types/organization'

const props = defineProps<{
  visible: boolean
  editingRole: RoleDetail | null
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: Record<string, unknown>]
}>()

const formRef = ref<any>(null)
const isEditing = computed(() => !!props.editingRole)

const defaultForm = (): RoleFormData => ({ name: '', description: '' })
const form = reactive<RoleFormData>(defaultForm())

const rules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { max: 20, message: '角色名称不超过 20 个字符', trigger: 'blur' },
  ],
}

function initForm() {
  const r = props.editingRole
  if (r) {
    form.name = r.name
    form.description = r.description || ''
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

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  emit('submit', { name: form.name, description: form.description })
}
</script>

<style scoped lang="scss">
@use '../styles/dialog-common' as *;

.role-dialog { @extend %form-dialog; }
.role-form .form-section { @extend %form-section; }
.role-form .form-section-title { @extend %form-section-title; }
</style>
