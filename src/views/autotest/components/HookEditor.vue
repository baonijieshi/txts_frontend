<template>
  <div class="hook-editor">
    <div v-if="rows.length === 0" class="hook-empty">暂无操作</div>
    <div v-for="(row, idx) in rows" :key="idx" class="hook-row">
      <div class="hook-row-header">
        <el-select v-model="row.type" size="small" style="width:110px" @change="onTypeChange(row)">
          <el-option label="设置变量" value="set_var" />
          <el-option label="HTTP 请求" value="http" />
        </el-select>
        <el-input
          v-model="row.name"
          placeholder="操作描述（选填）"
          size="small"
          style="flex:1"
          @input="emit"
        />
        <el-button size="small" link type="danger" :icon="Delete" @click="remove(idx)" />
      </div>

      <!-- set_var -->
      <div v-if="row.type === 'set_var'" class="hook-body">
        <el-input
          v-model="row.var_name"
          placeholder="变量名"
          size="small"
          style="width:140px"
          @input="emit"
        />
        <span class="hook-eq">=</span>
        <div class="hook-value-row">
          <el-input
            :ref="(el) => setValueRef(idx, el)"
            v-model="row.value"
            placeholder="值，支持手动输入或点击右侧选择 Faker 方法"
            size="small"
            @input="emit"
          />
          <el-button size="small" link type="primary" @click="openPicker(idx)">
            <el-icon><MagicStick /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- http -->
      <div v-else-if="row.type === 'http'" class="hook-body hook-http">
        <div class="hook-http-row">
          <el-select v-model="row.method" size="small" style="width:100px" @change="emit">
            <el-option v-for="m in HTTP_METHODS" :key="m" :label="m" :value="m" />
          </el-select>
          <el-input
            v-model="row.url"
            placeholder="请求 URL，支持 ${变量名}"
            size="small"
            style="flex:1"
            @input="emit"
          />
        </div>
        <el-input
          v-model="row.body"
          placeholder="请求 Body（JSON 字符串，选填）"
          size="small"
          type="textarea"
          :rows="2"
          style="margin-top:6px"
          @input="emit"
        />
        <div class="hook-extract">
          <span class="hook-extract-label">提取变量：</span>
          <el-input
            v-model="row.extract.var_name"
            placeholder="变量名"
            size="small"
            style="width:120px"
            @input="emit"
          />
          <span class="hook-eq">←</span>
          <el-input
            v-model="row.extract.path"
            placeholder="响应路径，如 data.token"
            size="small"
            style="flex:1"
            @input="emit"
          />
        </div>
      </div>
    </div>

    <el-button size="small" link :icon="Plus" @click="add">添加操作</el-button>

    <FakerPickerDialog
      v-model:visible="pickerVisible"
      @insert="onFakerInsert"
    />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch } from 'vue';
import { Plus, Delete, MagicStick } from '@element-plus/icons-vue';
import FakerPickerDialog from './FakerPickerDialog.vue';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const props = defineProps({ modelValue: { type: Array, default: () => [] } });
const emits = defineEmits(['update:modelValue']);
const rows = ref([]);

// ── Faker 选择器 ──────────────────────────────────────────
const pickerVisible = ref(false);
const editingIdx = ref(-1);
const valueInputRefs = {};

function setValueRef(idx, el) {
  if (el) valueInputRefs[idx] = el;
}

function openPicker(idx) {
  editingIdx.value = idx;
  pickerVisible.value = true;
}

function onFakerInsert(template) {
  const idx = editingIdx.value;
  if (idx < 0 || !rows.value[idx]) return;
  const elRef = valueInputRefs[idx];
  if (elRef && elRef.input) {
    // el-input 的底层 input 元素在 el.input 或 el.$el?.querySelector('input')
    const input = elRef.input || elRef.$el?.querySelector?.('input');
    if (input) {
      const start = input.selectionStart ?? rows.value[idx].value.length;
      const end = input.selectionEnd ?? start;
      const old = rows.value[idx].value || '';
      rows.value[idx].value = old.substring(0, start) + template + old.substring(end);
      emit();
      return;
    }
  }
  // fallback: 追加到末尾
  rows.value[idx].value = (rows.value[idx].value || '') + template;
  emit();
}

watch(
  () => props.modelValue,
  (val) => { rows.value = (val || []).map((r) => normalizeRow(r)); },
  { immediate: true, deep: true },
);

function normalizeRow(r) {
  return {
    type: r.type || 'set_var',
    name: r.name || '',
    var_name: r.var_name || '',
    value: r.value || '',
    method: r.method || 'GET',
    url: r.url || '',
    body: r.body || '',
    extract: { var_name: r.extract?.var_name || '', path: r.extract?.path || '' },
  };
}

function onTypeChange(row) {
  // 切换类型时重置相关字段
  row.var_name = '';
  row.value = '';
  row.method = 'GET';
  row.url = '';
  row.body = '';
  row.extract = { var_name: '', path: '' };
  emit();
}

function add() {
  rows.value.push(normalizeRow({ type: 'set_var' }));
  emit();
}

function remove(idx) {
  rows.value.splice(idx, 1);
  emit();
}

function emit() {
  emits('update:modelValue', rows.value.map((r) => ({ ...r, extract: { ...r.extract } })));
}
</script>

<style scoped lang="scss">
.hook-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.hook-empty {
  font-size: 12px;
  color: var(--text-placeholder);
  padding: 4px 0;
}
.hook-row {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 8px 10px;
  background: var(--el-fill-color-extra-light);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hook-row-header {
  display: flex;
  gap: 6px;
  align-items: center;
}
.hook-body {
  display: flex;
  gap: 6px;
  align-items: center;
  padding-left: 4px;
}
.hook-http {
  flex-direction: column;
  align-items: stretch;
}
.hook-http-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.hook-extract {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
}
.hook-extract-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.hook-eq {
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.hook-value-row {
  display: flex;
  gap: 4px;
  flex: 1;
  align-items: center;
  .el-input { flex: 1; }
}
</style>
