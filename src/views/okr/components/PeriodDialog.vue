<template>
  <el-dialog :model-value="visible" :title="title" width="480px" destroy-on-close @update:model-value="$emit('update:visible', $event)">
    <div class="form-section">
      <div class="section-title">基本信息</div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0">
        <el-form-item prop="name">
          <el-input v-model="form.name" placeholder="周期名称，如：2026 Q3" size="large" />
        </el-form-item>
      </el-form>
    </div>

    <div class="form-section">
      <div class="section-title">
        时间范围
        <span class="section-extra">
          <el-button
            v-for="q in quickQuarters"
            :key="q.label"
            size="small"
            :type="form.name === q.label ? 'primary' : ''"
            :plain="form.name !== q.label"
            @click="applyQuarter(q)"
          >{{ q.label }}</el-button>
        </span>
      </div>
      <el-form ref="formRef2" :model="form" label-width="0">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item prop="start_date">
              <el-date-picker
                v-model="form.start_date"
                type="date"
                placeholder="开始日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item prop="end_date">
              <el-date-picker
                v-model="form.end_date"
                type="date"
                placeholder="结束日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">{{ props.editing ? '保存' : '创建周期' }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch, computed } from 'vue';

const props = defineProps({
  visible: Boolean,
  editing: { type: Object, default: null },
});
const emit = defineEmits(['update:visible', 'saved']);

const title = computed(() => props.editing ? '编辑周期' : '新建 OKR 周期');
const loading = ref(false);
const formRef = ref(null);
const formRef2 = ref(null);

const quickQuarters = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const curQ = Math.floor(month / 3) + 1; // 1-4

  return Array.from({ length: 4 }, (_, i) => {
    const offset = curQ + i - 1;
    const y = year + Math.floor(offset / 4);
    const qNum = (offset % 4) + 1;
    const startM = (qNum - 1) * 3 + 1; // 季度起始月
    const endM = qNum * 3;              // 季度结束月

    const pad = (n) => String(n).padStart(2, '0');
    const start = `${y}-${pad(startM)}-01`;
    // 季度最后一天 = 结束月下个月的第 0 天
    const endDay = new Date(y, endM, 0).getDate();
    const end = `${y}-${pad(endM)}-${pad(endDay)}`;

    return { label: `${y} Q${qNum}`, start, end };
  });
});

const defaultForm = () => ({ name: '', start_date: '', end_date: '' });
const form = ref(defaultForm());

const rules = {
  name: [{ required: true, message: '请输入周期名称', trigger: 'blur' }],
  start_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end_date: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
};

watch(() => props.visible, (val) => {
  if (val) {
    form.value = props.editing
      ? { name: props.editing.name, start_date: props.editing.start_date, end_date: props.editing.end_date }
      : defaultForm();
  }
});

function applyQuarter(q) {
  form.value.name = q.label;
  form.value.start_date = q.start;
  form.value.end_date = q.end;
}

const handleSubmit = async () => {
  try { await formRef.value.validate(); } catch { return; }
  try { await formRef2.value.validate(); } catch { return; }
  loading.value = true;
  try {
    emit('saved', { ...form.value });
    emit('update:visible', false);
  } finally { loading.value = false; }
};
</script>

<style scoped lang="scss">
.form-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-regular);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-extra {
  display: flex;
  gap: 4px;
}
</style>
