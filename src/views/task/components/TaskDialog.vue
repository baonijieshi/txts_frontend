<template>
  <el-dialog :model-value="visible" :title="title" width="720px" destroy-on-close @update:model-value="$emit('update:visible', $event)">
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px" class="task-form">
      <div class="form-group">
        <div class="form-group__title">基本信息</div>
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属版本" prop="version">
              <ModernSelect v-model="form.version" :options="versionOptions" placeholder="请选择版本" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任务类型" prop="type">
              <ModernSelect v-model="form.type" :options="typeOptions" placeholder="请选择" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <div class="form-group">
        <div class="form-group__title">人员与状态</div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="指派给">
              <UserCascader v-model="form.assignee" :user-list="userList" placeholder="请选择" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <ModernSelect v-model="form.priority" :options="priorityOptions" placeholder="请选择" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态">
              <ModernSelect v-model="form.status" :options="statusSelectOptions" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="截止日期">
              <el-date-picker v-model="form.deadline" type="date" value-format="YYYY-MM-DD" placeholder="选择截止日期" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="完成进度">
              <!-- 开发/产品任务：可拖动滑块 -->
              <template v-if="form.type !== '测试'">
                <div class="progress-slider-wrap">
                  <el-slider
                    v-model="form.progress"
                    :min="0"
                    :max="100"
                    :format-tooltip="(v: number) => v + '%'"
                    :disabled="form.status === '已完成'"
                    style="flex:1"
                  />
                  <span class="progress-slider-value">{{ form.progress }}%</span>
                </div>
              </template>
              <!-- 测试任务：只读进度（联动测试计划） -->
              <template v-else>
                <div class="progress-readonly">
                  <el-icon :size="16" style="color: var(--el-color-primary)"><Connection /></el-icon>
                  <span class="progress-readonly__hint">进度自动联动同版本测试计划用例执行率</span>
                </div>
              </template>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <div class="form-group">
        <div class="form-group__title">描述</div>
        <el-form-item label="">
          <el-input v-model="form.description" type="textarea" :rows="5" placeholder="请输入任务描述" />
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
import { Connection } from '@element-plus/icons-vue';
import { createTask, updateTask } from '@/api/task';
import ModernSelect from '@/components/ModernSelect.vue';
import UserCascader from '@/components/UserCascader.vue';

const props = defineProps({
  visible: Boolean,
  editingId: { type: Number, default: null },
  initialForm: { type: Object, default: null },
  versionList: { type: Array, default: () => [] },
  userList: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:visible', 'saved']);

const formRef = ref(null);
const title = ref('新建任务');
const statusOptions = ['未开始', '进行中', '已完成'];

// ModernSelect 选项
const versionOptions = computed(() =>
  props.versionList.map((v: any) => ({ label: v.name, value: v.id }))
);
const typeOptions = [
  { label: '开发', value: '开发' },
  { label: '测试', value: '测试' },
  { label: '产品', value: '产品' },
];
const priorityOptions = [
  { label: '高', value: '高' },
  { label: '中', value: '中' },
  { label: '低', value: '低' },
];
const statusSelectOptions = [
  { label: '未开始', value: '未开始' },
  { label: '进行中', value: '进行中' },
  { label: '已完成', value: '已完成' },
];

const defaultForm = () => ({
  name: '',
  version: null,
  type: '开发',
  priority: '中',
  status: '未开始',
  assignee: null,
  deadline: '',
  progress: 0,
  description: '',
});

const form = ref(defaultForm());

const formRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  version: [{ required: true, message: '请选择所属版本', trigger: 'change' }],
  type: [{ required: true, message: '请选择任务类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
};

watch(() => props.visible, (val) => {
  if (val) {
    title.value = props.editingId ? '编辑任务' : '新建任务';
    form.value = props.initialForm ? { ...props.initialForm } : defaultForm();
  }
});

const handleSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    const payload = { ...form.value };
    if (!payload.deadline) payload.deadline = null;
    if (props.editingId) {
      await updateTask(props.editingId, payload);
      ElMessage.success('任务已更新');
    } else {
      await createTask(payload);
      ElMessage.success('任务已创建');
    }
    emit('update:visible', false);
    emit('saved');
  } catch {
    // ignore
  }
};
</script>

<style scoped lang="scss">
.task-form {
  .form-group {
    margin-bottom: 20px;
    padding: 16px 16px 4px;
    background: var(--bg-elevated);
    border-radius: 10px;

    &:last-child { margin-bottom: 0; }

    &__title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-regular);
      margin-bottom: 14px;
    }
  }
}

.user-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.progress-slider-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.progress-slider-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 36px;
  text-align: right;
}

.progress-readonly {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border-radius: 8px;
  border: 1px solid var(--border-color);

  &__bar {
    flex: 1;
    height: 8px;
    background: var(--bg-hover);
    border-radius: 4px;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: 4px;
    background: var(--el-color-primary);
    transition: width 0.4s cubic-bezier(.34, 1.56, .64, 1);
  }

  &__pct {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    min-width: 36px;
  }

  &__hint {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
  }
}
</style>
