<template>
  <el-cascader
    :model-value="innerValue"
    :options="options"
    :props="cascaderProps"
    :placeholder="placeholder"
    :clearable="clearable"
    :filterable="filterable"
    :style="{ width }"
    @change="handleChange"
  >
    <template #default="{ data }">
      <div v-if="data.avatar !== undefined" class="user-node">
        <el-avatar :size="20" :src="data.avatar || ''">{{ data.label?.charAt(0) }}</el-avatar>
        <span>{{ data.label }}</span>
      </div>
      <span v-else>{{ data.label }}</span>
    </template>
  </el-cascader>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: [Number, String, null], default: null },
  /** 用户列表，每项需包含 id, label, dept, 可选 avatar */
  userList: { type: Array, default: () => [] },
  /** 选中后绑定的字段，'id' 或 'label' */
  valueKey: { type: String, default: 'id' },
  placeholder: { type: String, default: '请选择' },
  clearable: { type: Boolean, default: true },
  filterable: { type: Boolean, default: true },
  width: { type: String, default: '100%' },
});

const emit = defineEmits(['update:modelValue', 'change']);

const cascaderProps = { expandTrigger: 'hover', emitPath: false };

const options = computed(() => {
  const deptMap = {};
  props.userList.forEach((u) => {
    const dept = u.dept || '未分配部门';
    if (!deptMap[dept]) deptMap[dept] = [];
    deptMap[dept].push({
      value: props.valueKey === 'label' ? u.label : u.id,
      label: u.label,
      avatar: u.avatar || '',
    });
  });
  return Object.keys(deptMap).sort().map((dept) => ({
    value: `__dept__${dept}`,
    label: dept,
    children: deptMap[dept],
  }));
});

const innerValue = computed(() => props.modelValue ?? undefined);

function handleChange(val) {
  const v = val ?? null;
  emit('update:modelValue', v);
  emit('change', v);
}
</script>

<style scoped>
.user-node {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.user-node .el-avatar {
  flex-shrink: 0;
  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: #fff;
  font-size: 11px;
}
</style>
