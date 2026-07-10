<template>
  <el-dialog :model-value="visible" :title="title" :width="isEditing ? '520px' : '500px'" destroy-on-close @update:model-value="$emit('update:visible', $event)">
    <template v-if="!isEditing">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0">
        <el-form-item prop="title">
          <el-input v-model="form.title" placeholder="关键结果，如：日活用户数达到 10,000" size="large" />
        </el-form-item>
        <el-form-item class="segmented-wrapper">
          <el-segmented v-model="form.kr_type" :options="typeOptions" size="default" block />
        </el-form-item>
        <el-form-item label-width="0" class="mention-select-item">
          <el-select v-model="form.mentions" multiple filterable placeholder="@ 提及成员（可选）" style="width:100%">
            <el-option-group v-for="group in mentionOptions" :key="group.label" :label="group.label">
              <el-option v-for="opt in group.options" :key="opt.value" :label="opt.label" :value="opt.value">
                <div class="mention-option">
                  <el-avatar :size="18" :src="opt.avatar || ''">{{ opt.label?.charAt(0) }}</el-avatar>
                  <span>{{ opt.label }}</span>
                </div>
              </el-option>
            </el-option-group>
          </el-select>
        </el-form-item>
      </el-form>
    </template>

    <!-- 编辑模式：完整 -->
    <template v-else>
      <div class="form-section">
        <div class="section-title">关键结果</div>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="0">
          <el-form-item prop="title">
            <el-input v-model="form.title" placeholder="关键结果标题" size="large" />
          </el-form-item>
        </el-form>
      </div>
      <div class="form-section">
        <div class="section-title">衡量方式</div>
        <el-segmented v-model="form.kr_type" :options="typeOptions" size="small" style="margin-bottom:12px" />
        <el-row :gutter="16">
          <el-col :span="8">
            <div class="value-card">
              <div class="value-label">起始值</div>
              <el-input-number v-model="form.start_value" :min="0" :controls="false" class="value-input" />
            </div>
          </el-col>
          <el-col :span="8">
            <div class="value-card">
              <div class="value-label">当前值</div>
              <el-input-number v-model="form.current_value" :min="0" :controls="false" class="value-input" />
            </div>
          </el-col>
          <el-col :span="8">
            <div class="value-card">
              <div class="value-label">目标值</div>
              <el-input-number v-model="form.target_value" :min="0" :controls="false" class="value-input" />
            </div>
          </el-col>
        </el-row>
      </div>
      <div class="form-section" v-if="!isLast">
        <div class="section-title">权重（总和为 100%，修改后最后一项自动补齐）</div>
        <div class="weight-slider">
          <el-slider v-model="form.weight" :min="0.05" :max="1" :step="0.05" :format-tooltip="(v) => Math.round(v * 100) + '%'" show-input />
        </div>
      </div>
      <div class="form-section" v-else>
        <div class="section-title">权重（自动计算，不可编辑）</div>
        <div class="weight-readonly">{{ Math.round(form.weight * 100) }}%</div>
      </div>

      <!-- @ 提及成员 -->
      <div class="form-section">
        <div class="section-title">@ 提及成员</div>
        <el-select v-model="form.mentions" multiple filterable placeholder="搜索成员..." style="width:100%">
          <el-option-group v-for="group in mentionOptions" :key="group.label" :label="group.label">
            <el-option v-for="opt in group.options" :key="opt.value" :label="opt.label" :value="opt.value">
              <div class="mention-option">
                <el-avatar :size="18" :src="opt.avatar || ''">{{ opt.label?.charAt(0) }}</el-avatar>
                <span>{{ opt.label }}</span>
              </div>
            </el-option>
          </el-option-group>
        </el-select>
        <div class="field-hint">被 @ 的成员可关注该 KR 的进展</div>
      </div>
    </template>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">
        {{ isEditing ? '保存修改' : '添加' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch, computed } from 'vue';

const props = defineProps({
  visible: Boolean,
  editing: { type: Object, default: null },
  isLast: { type: Boolean, default: false },
  userList: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:visible', 'saved']);

const isEditing = computed(() => !!props.editing);
const title = computed(() => props.editing ? '编辑关键结果' : '添加关键结果');
const loading = ref(false);
const formRef = ref(null);

const typeOptions = [
  { label: '百分比', value: 'percentage' },
  { label: '数值', value: 'number' },
];

const mentionOptions = computed(() => {
  const deptMap = {};
  (props.userList || []).forEach((u) => {
    const dept = u.dept || '未分配部门';
    if (!deptMap[dept]) deptMap[dept] = [];
    deptMap[dept].push({ value: u.id, label: u.label, avatar: u.avatar || '' });
  });
  return Object.keys(deptMap).sort().map((dept) => ({ label: dept, options: deptMap[dept] }));
});

const defaultForm = () => ({
  title: '', start_value: 0, current_value: 0, target_value: 100,
  kr_type: 'percentage', unit: '%', weight: 1.0, mentions: [],
});

const form = ref(defaultForm());
const rules = { title: [{ required: true, message: '请输入 KR 标题', trigger: 'blur' }] };

watch(() => props.visible, (val) => {
  if (val) {
    form.value = props.editing
      ? {
          title: props.editing.title, start_value: props.editing.start_value,
          current_value: props.editing.current_value, target_value: props.editing.target_value,
          kr_type: props.editing.kr_type, unit: props.editing.unit, weight: props.editing.weight || 1.0,
          mentions: props.editing.mentions || [],
        }
      : defaultForm();
  }
});

watch(() => form.value.kr_type, (val) => {
  if (!props.editing) {
    form.value.unit = val === 'percentage' ? '%' : '';
    form.value.start_value = 0;
    form.value.target_value = val === 'percentage' ? 100 : 100;
  }
});

const handleSubmit = async () => {
  if (!formRef.value) return;
  try { await formRef.value.validate(); } catch { return; }
  loading.value = true;
  try {
    const payload: any = { title: form.value.title, kr_type: form.value.kr_type, unit: form.value.unit, mentions: form.value.mentions };
    if (props.editing) {
      Object.assign(payload, {
        start_value: form.value.start_value,
        current_value: form.value.current_value,
        target_value: form.value.target_value,
        weight: form.value.weight,
      });
    } else {
      payload.start_value = 0;
      payload.current_value = 0;
      payload.target_value = form.value.kr_type === 'percentage' ? 100 : 100;
    }
    emit('saved', payload);
    emit('update:visible', false);
  } finally { loading.value = false; }
};
</script>

<style scoped lang="scss">
.form-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-regular);
  margin-bottom: 10px;
}

.value-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 10px 6px;

  .value-label {
    font-size: 11px;
    color: var(--text-secondary);
    margin-bottom: 2px;
  }

  .value-input {
    width: 100%;
    :deep(.el-input__wrapper) { background: var(--bg-card); box-shadow: none; padding: 0 6px; }
    :deep(.el-input__inner) { text-align: left; font-size: 15px; font-weight: 600; color: var(--text-primary); height: 32px; }
  }
}

.weight-slider {
  margin-top: 4px;
}

.weight-readonly {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-color-primary);
  padding: 8px 0;
}

.mention-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.mention-select-item {
  margin-top: 12px;
}

.field-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.segmented-wrapper {
  :deep(.el-segmented) {
    --el-segmented-item-selected-bg-color: var(--el-color-primary);

    .el-segmented__item {
      overflow: visible;
      white-space: nowrap;
      justify-content: center;
      text-align: center;
    }

    .el-segmented__item-label {
      overflow: visible;
      text-overflow: unset;
      text-align: center;
    }
  }
}
</style>
