<template>
  <div class="kv-editor">
    <div v-for="(row, idx) in rows" :key="idx" class="kv-row">
      <el-input v-model="row.key" :placeholder="placeholderKey" size="small" style="width:160px" @input="emit" />
      <el-input v-model="row.value" :placeholder="placeholderVal" size="small" style="flex:1" @input="emit" />
      <el-input v-if="showDesc" v-model="row.description" placeholder="描述" size="small" style="width:120px" @input="emit" />
      <el-button size="small" link type="danger" :icon="Delete" @click="remove(idx)" />
    </div>
    <el-button size="small" link :icon="Plus" @click="add">添加</el-button>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  placeholderKey: { type: String, default: 'Key' },
  placeholderVal: { type: String, default: 'Value' },
  showDesc: { type: Boolean, default: false },
});
const emits = defineEmits(['update:modelValue']);

const rows = ref([]);

watch(() => props.modelValue, (val) => {
  rows.value = (val || []).map((r) => ({ ...r }));
}, { immediate: true, deep: true });

function add() { rows.value.push({ key: '', value: '', description: '' }); emit(); }
function remove(idx) { rows.value.splice(idx, 1); emit(); }
function emit() { emits('update:modelValue', rows.value.map((r) => ({ ...r }))); }
</script>

<style scoped lang="scss">
.kv-editor { display: flex; flex-direction: column; gap: 6px; }
.kv-row { display: flex; gap: 6px; align-items: center; }
</style>
