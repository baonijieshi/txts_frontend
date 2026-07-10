<template>
  <el-dialog
    :model-value="visible"
    :title="isEditing ? '编辑模块' : '新建模块'"
    width="520px"
    destroy-on-close
    :close-on-click-modal="false"
    class="module-dialog"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" class="module-form">
      <div class="form-section">
        <div class="form-section-title">基本信息</div>
        <el-form-item label="父模块">
          <el-cascader
            v-model="form.parentPath"
            :options="moduleTreeOptions"
            :props="{ checkStrictly: true, value: 'id', label: 'name', children: 'children', emitPath: true }"
            placeholder="无（顶级模块）"
            clearable
            filterable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="模块名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模块名称" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="请输入模块描述"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
      </div>
      <div class="form-section">
        <div class="form-section-title">配置信息</div>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="启用" value="启用" />
            <el-option label="禁用" value="禁用" />
          </el-select>
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

interface CascaderOption {
  id: number
  name: string
  children?: CascaderOption[]
}

const props = defineProps<{
  visible: boolean
  isEditing: boolean
  initialForm: { parentPath: number[]; name: string; description: string; status: string }
  moduleTreeOptions: CascaderOption[]
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: { name: string; description: string; parentPath: number[]; status: string }]
}>()

const formRef = ref<any>(null)
const form = reactive({ parentPath: [] as number[], name: '', description: '', status: '启用' })

const rules = {
  name: [
    { required: true, message: '请输入模块名称', trigger: 'blur' },
    { max: 20, message: '模块名称不超过 20 个字符', trigger: 'blur' },
  ],
}

function initForm() {
  form.parentPath = [...props.initialForm.parentPath]
  form.name = props.initialForm.name
  form.description = props.initialForm.description
  form.status = props.initialForm.status
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
  emit('submit', {
    name: form.name,
    description: form.description,
    parentPath: form.parentPath,
    status: form.status,
  })
}
</script>

<style scoped lang="scss">
@use '../styles/dialog-common' as *;

.module-dialog { @extend %form-dialog; }
.module-form .form-section { @extend %form-section; }
.module-form .form-section-title { @extend %form-section-title; }
</style>
