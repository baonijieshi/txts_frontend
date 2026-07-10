<template>
  <div class="modern-select-root">
    <el-select
      :model-value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :clearable="clearable"
      :filterable="filterable"
      :multiple="multiple"
      :style="{ width: width }"
      popper-class="modern-select-popper"
      @update:model-value="handleChange"
      @change="handleChange"
    >
      <el-option
        v-for="opt in options"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      />
    </el-select>
  </div>
</template>

<script setup lang="ts">
interface Option {
  label: string;
  value: string | number;
}

withDefaults(defineProps<{
  modelValue: string | number | null;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  filterable?: boolean;
  multiple?: boolean;
  width?: string;
}>(), {
  placeholder: '请选择',
  disabled: false,
  clearable: false,
  filterable: false,
  multiple: false,
  width: '100%',
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null];
  change: [value: string | number | null];
}>();

const handleChange = (val: string | number | null) => {
  emit('update:modelValue', val);
  emit('change', val);
};
</script>

<style scoped lang="scss">
.modern-select-root {
  display: inline-block;
  width: 100%;
}

/* ── 下拉面板：毛玻璃 + 圆角 ── */
.modern-select-popper {
  border-radius: 12px !important;
  overflow: hidden;

  .el-select-dropdown {
    border-radius: 12px;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-dropdown);
    background: var(--bg-card);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .el-select-dropdown__item {
    margin: 2px 6px;
    border-radius: 8px;
    padding: 0 12px;
    font-size: 13px;
    color: var(--text-regular);
    transition: background 0.12s;

    &:hover {
      background: var(--bg-hover);
    }
  }

  .el-select-dropdown__item.is-selected {
    color: var(--color-primary);
    font-weight: 500;
  }

  .el-select-dropdown__empty {
    padding: 12px;
    color: var(--text-placeholder);
  }
}
</style>
