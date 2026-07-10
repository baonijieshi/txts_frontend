<template>
  <el-dialog
    :model-value="visible"
    :title="editingSnowId ? '编辑 Mock' : '新建 Mock'"
    width="720px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" label-position="left">
      <div class="form-row-2col">
        <el-form-item label="应用名称" prop="app_name">
          <el-input v-model="form.app_name" placeholder="请输入应用名称" />
        </el-form-item>
        <el-form-item label="接口地址" prop="path">
          <el-input v-model="form.path" placeholder="如 /api/user/info" />
        </el-form-item>
      </div>
      <el-form-item label="返回值" prop="re_data" class="json-form-item">
        <div class="json-toolbar">
          <span class="json-label">JSON 数据</span>
          <el-button size="small" text type="primary" @click="formatJson">
            <el-icon><MagicStick /></el-icon>格式化
          </el-button>
        </div>
        <JsonEditor v-model="form.re_data" placeholder='{"code": 200, "data": {}}' />
        <div v-if="jsonError" class="json-error">
          <el-icon><WarningFilled /></el-icon>
          {{ jsonError }}
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { MagicStick, WarningFilled } from '@element-plus/icons-vue';
import { createMock } from '@/api/mock';
import JsonEditor from '@/views/autotest/components/JsonEditor.vue';

const props = defineProps({
  visible: Boolean,
  editingSnowId: { type: String, default: null },
  initialForm: { type: Object, default: null },
});

const emit = defineEmits(['update:visible', 'saved']);

const formRef = ref(null);

const defaultForm = () => ({
  app_name: '',
  path: '',
  re_data: '',
});

const form = ref(defaultForm());

const rules = {
  app_name: [{ required: true, message: '请输入应用名称', trigger: 'blur' }],
  path: [{ required: true, message: '请输入接口地址', trigger: 'blur' }],
  re_data: [{ required: true, message: '请输入返回值', trigger: 'blur' }],
};

const jsonError = computed(() => {
  if (!form.value.re_data) return '';
  try {
    JSON.parse(form.value.re_data);
    return '';
  } catch (e) {
    return 'JSON 格式不正确：' + e.message;
  }
});

watch(() => props.visible, (val) => {
  if (val) {
    form.value = props.initialForm
      ? { ...defaultForm(), ...props.initialForm }
      : defaultForm();
  }
});

function formatJson() {
  if (!form.value.re_data) return;
  try {
    form.value.re_data = JSON.stringify(JSON.parse(form.value.re_data), null, 2);
    ElMessage.success('已格式化');
  } catch {
    ElMessage.warning('JSON 格式不正确，无法格式化');
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    if (jsonError.value) {
      ElMessage.warning('请检查返回值的 JSON 格式');
      return;
    }
    const payload = {
      ...form.value,
      re_data: form.value.re_data,
    };
    if (props.editingSnowId) {
      payload.snow_id = props.editingSnowId;
    }
    await createMock(payload);
    ElMessage.success(props.editingSnowId ? 'Mock 已更新' : 'Mock 已创建');
    emit('update:visible', false);
    emit('saved');
  } catch {
    // 校验失败或请求失败
  }
};
</script>

<style scoped lang="scss">
.form-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}

.json-form-item {
  :deep(.el-form-item__content) {
    flex-direction: column;
    align-items: stretch;
  }
}

.json-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  width: 100%;
}

.json-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.json-error {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-color-danger);
  .el-icon { font-size: 13px; }
}
</style>
