<template>
  <el-dialog :model-value="visible" :title="kr?.title || '更新进度'" width="440px" destroy-on-close class="pdlg-dialog" @update:model-value="$emit('update:visible', $event)">
    <div v-if="kr" class="pdlg">
      <!-- 当前进度条 -->
      <div class="pdlg__status">
        <div class="pdlg__track">
          <div class="pdlg__fill" :style="{ width: Math.round(kr.progress || 0) + '%', background: progressColor(kr.progress) }"></div>
        </div>
        <div class="pdlg__track-meta">
          <span>{{ kr.start_value }}{{ kr.unit }}</span>
          <span class="pdlg__track-pct" :class="'c-' + pctClass(kr.progress)">{{ Math.round(kr.progress || 0) }}%</span>
          <span>{{ kr.target_value }}{{ kr.unit }}</span>
        </div>
      </div>

      <!-- 新值输入 -->
      <div class="pdlg__input-area">
        <div class="pdlg__presets">
          <button
            v-for="p in quickPresets" :key="p.value"
            class="pdlg__preset" :class="{ 'is-active': newValue === p.value }"
            @click="newValue = p.value"
          >{{ p.label }}{{ kr.kr_type === 'percentage' ? '%' : '' }}</button>
        </div>
        <el-input-number
          v-model="newValue"
          :min="kr.start_value ?? 0"
          :max="kr.target_value ? kr.target_value * 2 : undefined"
          :step="kr.kr_type === 'percentage' ? 5 : 1"
          size="large"
          style="width:100%"
        />
        <div v-if="newValue !== kr.current_value" class="pdlg__result">
          <span class="pdlg__result-val">{{ Math.round(newProgress) }}%</span>
          <span class="pdlg__result-delta">{{ newValue > kr.current_value ? '↗' : '↘' }} {{ formatDelta(Math.abs(newValue - kr.current_value)) }}{{ kr.unit }}</span>
        </div>
      </div>

      <!-- 信心 -->
      <div class="pdlg__conf">
        <span class="pdlg__conf-label">信心指数</span>
        <span class="pdlg__conf-badge" :class="'c-' + confLevel">{{ confidence }}/5</span>
        <el-slider v-model="confidence" :min="1" :max="5" :step="1" size="small" style="margin-top:8px" />
      </div>

      <!-- 备注 -->
      <el-input v-model="note" type="textarea" :rows="2" placeholder="备注（可选）" class="pdlg__note" />
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确认更新</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch, computed } from 'vue';

const props = defineProps({
  visible: Boolean,
  kr: { type: Object, default: null },
});
const emit = defineEmits(['update:visible', 'saved']);

const loading = ref(false);
const newValue = ref(0);
const note = ref('');
const confidence = ref(5);

const quickPresets = computed(() => {
  if (!props.kr) return [];
  const t = props.kr.target_value || 100;
  const c = props.kr.current_value || 0;
  return [
    { label: `${Math.round((c + (t - c) * 0.25) * 10) / 10}`, value: Math.round((c + (t - c) * 0.25) * 10) / 10 },
    { label: `${Math.round((c + (t - c) * 0.5) * 10) / 10}`, value: Math.round((c + (t - c) * 0.5) * 10) / 10 },
    { label: `${Math.round((c + (t - c) * 0.75) * 10) / 10}`, value: Math.round((c + (t - c) * 0.75) * 10) / 10 },
    { label: `${t}`, value: t },
  ].filter((p, i, arr) => i === 0 || p.value !== arr[i - 1].value);
});

const newProgress = computed(() => {
  if (!props.kr) return 0;
  const { start_value, target_value } = props.kr;
  if (target_value === start_value) return newValue.value >= target_value ? 100 : 0;
  return Math.max(0, Math.min(100, (newValue.value - start_value) / (target_value - start_value) * 100));
});

const confLevel = computed(() => {
  const v = confidence.value || 5;
  return v >= 5 ? 'high' : v >= 3 ? 'mid' : 'low';
});

function formatDelta(v: number) { return Number.isInteger(v) ? v : Math.round(v * 10) / 10; }

watch(() => props.visible, (val) => {
  if (val && props.kr) {
    newValue.value = props.kr.current_value || 0;
    confidence.value = props.kr.confidence || 5;
    note.value = '';
  }
});

function progressColor(p: number) {
  if (p >= 70) return 'var(--el-color-success)';
  if (p >= 30) return 'var(--el-color-warning)';
  return 'var(--el-color-danger)';
}
function pctClass(p: number) {
  if (p >= 70) return 'high';
  if (p >= 30) return 'mid';
  return 'low';
}

const handleSubmit = async () => {
  loading.value = true;
  try {
    emit('saved', { krId: props.kr.id, value: newValue.value, confidence: confidence.value, note: note.value });
    emit('update:visible', false);
  } finally { loading.value = false; }
};
</script>

<style scoped lang="scss">
.pdlg-dialog :deep(.el-dialog__body) { padding-top: 4px; }

.pdlg {
  display: flex;
  flex-direction: column;
  gap: 24px;

  /* 当前进度条 */
  &__status {
    padding: 12px 16px;
    background: var(--bg-elevated);
    border-radius: 10px;
  }
  &__track {
    height: 6px;
    background: var(--border-color);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 6px;
  }
  &__fill {
    height: 100%;
    border-radius: 3px;
    transition: width .4s ease;
  }
  &__track-meta {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-secondary);
  }
  &__track-pct {
    font-weight: 600;
    &.c-high { color: var(--el-color-success); }
    &.c-mid  { color: var(--el-color-warning); }
    &.c-low  { color: var(--el-color-danger); }
  }

  /* 输入区 */
  &__input-area {
    display: flex;
    flex-direction: column;
  }
  &__presets {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  &__preset {
    flex: 1;
    padding: 9px 0;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    cursor: pointer;
    transition: all .15s;
    &:hover { border-color: var(--el-color-primary); color: var(--el-color-primary); }
    &.is-active { background: var(--el-color-primary); border-color: var(--el-color-primary); color: #fff; }
  }

  &__result {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-top: 14px;
    padding: 12px 16px;
    background: var(--el-color-primary-light-9);
    border-radius: 10px;
  }
  &__result-val {
    font-size: 22px;
    font-weight: 700;
    color: var(--el-color-primary);
    line-height: 1;
  }
  &__result-delta {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-regular);
  }

  /* 信心 */
  &__conf {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }
  &__conf-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-regular);
    margin-right: auto;
  }
  &__conf-badge {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 6px;
    &.c-high { background: var(--el-color-success-light-9); color: var(--el-color-success); }
    &.c-mid  { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
    &.c-low  { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  }

  /* 备注 */
  &__note {
    :deep(.el-textarea__inner) {
      resize: none;
      font-size: 13px;
    }
  }
}
</style>
