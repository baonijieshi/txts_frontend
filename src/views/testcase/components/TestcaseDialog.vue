<template>
  <el-dialog
    :model-value="visible"
    width="780px"
    destroy-on-close
    class="testcase-dialog"
    @update:model-value="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="dialog-header">
        <span class="dialog-title">{{ title }}</span>
      </div>
    </template>

    <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px" class="testcase-form">
      <!-- 基本信息 -->
      <div class="form-group">
        <div class="form-group__title">基本信息</div>
        <el-row :gutter="20">
          <el-col v-if="!isBaseline" :span="12">
            <el-form-item label="关联版本">
              <ModernSelect
                v-model="form.versionId"
                :options="versionSelectOptions"
                placeholder="请选择版本（可选）"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="isBaseline ? 24 : 12">
            <el-form-item label="所属模块">
              <el-cascader
                v-model="form.moduleId"
                :options="moduleOptions"
                placeholder="请选择模块（可选）"
                clearable
                filterable
                style="width: 100%"
                :props="{ checkStrictly: true, emitPath: false }"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用例类型" prop="type">
              <ModernSelect v-model="form.type" :options="typeOptions" placeholder="请选择类型" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <ModernSelect v-model="form.priority" :options="priorityOptions" placeholder="请选择" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="用例标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入用例标题" />
        </el-form-item>
        <el-form-item label="关联需求">
          <ModernSelect
            v-model="form.storyId"
            :options="storySelectOptions"
            placeholder="请选择关联需求"
            clearable
          />
        </el-form-item>
        <el-form-item label="前置条件">
          <el-input v-model="form.precondition" type="textarea" :rows="2" placeholder="请输入前置条件" />
        </el-form-item>
      </div>

      <!-- 测试步骤 -->
      <div class="form-group">
        <div class="form-group__title">测试步骤</div>
        <el-form-item label="">
          <div class="steps-wrapper">
            <el-table :data="form.steps" size="small">
              <el-table-column label="#" width="50" align="center">
                <template #default="{ $index }">{{ $index + 1 }}</template>
              </el-table-column>
              <el-table-column label="步骤描述" min-width="220">
                <template #default="{ row }">
                  <el-input v-model="row.desc" placeholder="输入步骤描述" />
                </template>
              </el-table-column>
              <el-table-column label="预期结果" min-width="220">
                <template #default="{ row }">
                  <el-input v-model="row.expect" placeholder="输入预期结果" />
                </template>
              </el-table-column>
              <el-table-column label="" width="50" align="center">
                <template #default="{ $index }">
                  <el-button
                    size="small"
                    link
                    type="danger"
                    :disabled="form.steps.length <= 1"
                    @click="removeStep($index)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-button class="add-step-btn" size="small" @click="addStep">
              <el-icon><Plus /></el-icon>添加步骤
            </el-button>
          </div>
        </el-form-item>
      </div>

      <!-- 备注 -->
      <div class="form-group">
        <div class="form-group__title">备注</div>
        <el-form-item label="">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </div>
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
import { createTestcase, updateTestcase } from '@/api/testcase';
import ModernSelect from '@/components/ModernSelect.vue';

const props = defineProps({
  visible: Boolean,
  editingId: { type: Number, default: null },
  initialForm: { type: Object, default: null },
  versionOptions: { type: Array, default: () => [] },
  storyOptions: { type: Array, default: () => [] },
  moduleOptions: { type: Array, default: () => [] },
  isBaseline: { type: Boolean, default: false },
});

const emit = defineEmits(['update:visible', 'saved']);

const formRef = ref(null);
const title = ref('新建用例');

// ModernSelect 选项
const versionSelectOptions = computed(() =>
  props.versionOptions.map((v: any) => ({ label: v.name, value: v.id }))
);
const typeOptions = [
  { label: '功能测试', value: '功能测试' },
  { label: '性能测试', value: '性能测试' },
  { label: '接口测试', value: '接口测试' },
  { label: '安全测试', value: '安全测试' },
  { label: '兼容性测试', value: '兼容性测试' },
];
const priorityOptions = [
  { label: 'P0 - 最高', value: 'P0' },
  { label: 'P1 - 高', value: 'P1' },
  { label: 'P2 - 中', value: 'P2' },
  { label: 'P3 - 低', value: 'P3' },
];
const storySelectOptions = computed(() =>
  props.storyOptions.map((s: any) => ({ label: s.title, value: s.id }))
);

const defaultForm = () => ({
  versionId: null,
  moduleId: null,
  module: '',
  type: '功能测试',
  title: '',
  priority: 'P1',
  storyId: null,
  precondition: '',
  steps: [{ desc: '', expect: '' }],
  remark: '',
});

// 通过 ID 在 cascader 树中查找完整路径字符串，如 "前端 / 登录模块"
function findModulePath(options, id, ancestors = []) {
  return options.reduce((result, node) => {
    if (result) return result;
    const path = [...ancestors, node.label];
    if (node.value === id) return path.join(' / ');
    return node.children ? findModulePath(node.children, id, path) : null;
  }, null) || '';
}

// 通过路径字符串在 cascader 树中反查 ID
function findModuleIdByPath(options, pathStr, ancestors = []) {
  return options.reduce((result, node) => {
    if (result) return result;
    const path = [...ancestors, node.label];
    if (path.join(' / ') === pathStr) return node.value;
    return node.children ? findModuleIdByPath(node.children, pathStr, path) : null;
  }, null);
}

const form = ref(defaultForm());

const formRules = {
  title: [{ required: true, message: '请输入用例标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择用例类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
};

watch(() => props.visible, (val) => {
  if (val) {
    if (props.editingId) {
      title.value = '编辑用例';
    } else {
      title.value = props.isBaseline ? '新建基线用例' : '新建用例';
    }
    form.value = props.initialForm
      ? {
        ...props.initialForm,
        moduleId: findModuleIdByPath(props.moduleOptions, props.initialForm.module || ''),
        steps: props.initialForm.steps.map((s) => ({ ...s })),
      }
      : defaultForm();
  }
});

const addStep = () => { form.value.steps.push({ desc: '', expect: '' }); };
const removeStep = (i) => { form.value.steps.splice(i, 1); };

const handleSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    const payload = {
      ...form.value,
      module: form.value.moduleId ? findModulePath(props.moduleOptions, form.value.moduleId) : '',
      version: form.value.versionId || null,
      story: form.value.storyId || null,
      is_baseline: props.isBaseline,
    };
    delete payload.versionId;
    delete payload.storyId;
    delete payload.moduleId;
    if (props.editingId) {
      await updateTestcase(props.editingId, payload);
      ElMessage.success('用例已更新');
    } else {
      await createTestcase(payload);
      ElMessage.success('用例已创建');
    }
    emit('update:visible', false);
    emit('saved');
  } catch {
    // 校验失败或请求失败
  }
};
</script>

<style scoped lang="scss">
/* ── 弹窗头部 ── */
.testcase-dialog {
  :deep(.el-dialog__header) {
    padding: 20px 24px 12px;
    margin-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  :deep(.el-dialog__body) {
    padding: 16px 24px;
  }
}

.dialog-header {
  display: flex;
  align-items: center;

  .dialog-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

/* ── 表单分组 ── */
.testcase-form {
  .form-group {
    margin-bottom: 20px;
    padding: 16px 16px 4px;
    background: var(--bg-elevated);
    border-radius: 10px;

    &:last-child {
      margin-bottom: 0;
    }

    &__title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-regular);
      margin-bottom: 14px;
    }
  }
}

/* ── 步骤表格 ── */
.steps-wrapper {
  width: 100%;

  .add-step-btn {
    margin-top: 8px;
  }
}
</style>
