<template>
  <div class="notification-bell" @click="handleClick">
    <el-badge
      :value="badgeValue"
      :hidden="unreadCount === 0"
      :max="99"
    >
      <el-icon :size="20"><Bell /></el-icon>
    </el-badge>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed } from 'vue';
import { useStore } from 'vuex';
import { Bell } from '@element-plus/icons-vue';

const emit = defineEmits(['toggle']);
const store = useStore();

const unreadCount = computed(() => store.getters.unreadCount);

const badgeValue = computed(() => {
  if (unreadCount.value > 99) return '99+';
  return unreadCount.value;
});

const handleClick = () => {
  emit('toggle');
};
</script>

<style lang="scss" scoped>
.notification-bell {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0 12px;
  height: 100%;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--bg-hover);
  }

  .el-icon {
    color: var(--text-regular);
  }
}
</style>
