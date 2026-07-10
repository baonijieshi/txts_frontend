<template>
  <div class="extraction-editor">
    <div v-for="(row, idx) in rows" :key="idx" class="extraction-row">
      <el-input v-model="row.var_name" placeholder="变量名" size="small" style="width:120px" @input="emit" />
      <el-select v-model="row.from" size="small" style="width:90px" @change="emit">
        <el-option label="响应体" value="body" />
        <el-option label="响应头" value="header" />
      </el-select>
      <el-input v-model="row.path" placeholder="取值路径，如 data.token" size="small" style="flex:1" @input="emit" />
      <el-button size="small" link type="danger" :icon="Delete" @click="remove(idx)" />
    </div>
    <el-button size="small" link :icon="Plus" @click="add">添加提取</el-button>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';

const props = defineProps({ modelValue: { type: Array, default: () => [] } });
const emits = defineEmits(['update:modelValue']);
const rows = ref([]);

watch(() => props.modelValue, (val) => { rows.value = (val || []).map((r) => ({ ...r })); }, { immediate: true, deep: true });

function add() { rows.value.push({ var_name: '', from: 'body', path: '' }); emit(); }
function remove(idx) { rows.value.splice(idx, 1); emit(); }
function emit() { emits('update:modelValue', rows.value.map((r) => ({ ...r }))); }
</script>

<style scoped lang="scss">
.extraction-editor { display: flex; flex-direction: column; gap: 6px; }
.extraction-row { display: flex; gap: 6px; align-items: center; }
</style>
