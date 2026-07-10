<template>
  <div class="assertion-editor">
    <div v-for="(row, idx) in rows" :key="idx" class="assertion-row">
      <el-input v-model="row.field" placeholder="字段(如 status_code / data.id)" size="small" style="width:180px" @input="emit" />
      <el-select v-model="row.operator" size="small" style="width:110px" @change="emit">
        <el-option label="等于(eq)" value="eq" />
        <el-option label="不等于(ne)" value="ne" />
        <el-option label="包含" value="contains" />
        <el-option label="不包含" value="not_contains" />
        <el-option label="大于(gt)" value="gt" />
        <el-option label="小于(lt)" value="lt" />
      </el-select>
      <el-input v-model="row.expected" placeholder="期望值" size="small" style="flex:1" @input="emit" />
      <el-button size="small" link type="danger" :icon="Delete" @click="remove(idx)" />
    </div>
    <el-button size="small" link :icon="Plus" @click="add">添加断言</el-button>
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

function add() { rows.value.push({ field: 'status_code', operator: 'eq', expected: '200' }); emit(); }
function remove(idx) { rows.value.splice(idx, 1); emit(); }
function emit() { emits('update:modelValue', rows.value.map((r) => ({ ...r }))); }
</script>

<style scoped lang="scss">
.assertion-editor { display: flex; flex-direction: column; gap: 6px; }
.assertion-row { display: flex; gap: 6px; align-items: center; }
</style>
