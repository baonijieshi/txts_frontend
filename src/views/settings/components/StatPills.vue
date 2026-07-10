<template>
  <div class="page-stats">
    <div class="stat-pill">
      <span class="stat-icon" style="background:var(--el-color-primary-light-9);color:var(--el-color-primary)">
        <el-icon :size="18"><UserFilled /></el-icon>
      </span>
      <div class="stat-body">
        <span class="stat-value">{{ total }}</span>
        <span class="stat-label">成员总数</span>
      </div>
    </div>
    <div class="stat-pill">
      <span class="stat-icon" style="background:var(--el-color-success-light-9);color:var(--el-color-success)">
        <el-icon :size="18"><Check /></el-icon>
      </span>
      <div class="stat-body">
        <span class="stat-value">{{ activeCount }}</span>
        <span class="stat-label">启用中</span>
      </div>
    </div>
    <div class="stat-pill">
      <span class="stat-icon" style="background:var(--el-color-danger-light-9);color:var(--el-color-danger)">
        <el-icon :size="18"><Remove /></el-icon>
      </span>
      <div class="stat-body">
        <span class="stat-value">{{ inactiveCount }}</span>
        <span class="stat-label">已禁用</span>
      </div>
    </div>
    <div class="stat-pill">
      <span class="stat-icon" style="background:var(--el-color-warning-light-9);color:var(--el-color-warning)">
        <el-icon :size="18"><OfficeBuilding /></el-icon>
      </span>
      <div class="stat-body">
        <span class="stat-value">{{ deptCount }}</span>
        <span class="stat-label">部门数</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UserFilled, Check, Remove, OfficeBuilding } from '@element-plus/icons-vue'

defineProps<{
  total: number
  activeCount: number
  inactiveCount: number
  deptCount: number
}>()
</script>

<style scoped>
.page-stats {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
}
.stat-pill {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-dropdown);
  transition: box-shadow .25s, transform .25s;
  position: relative;
  overflow: hidden;
}
.stat-pill::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: currentColor;
  opacity: .06;
  border-radius: 0 0 12px 12px;
  transition: height .25s, opacity .25s;
}
.stat-pill:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}
.stat-pill:hover::after {
  height: 4px;
  opacity: .12;
}
.stat-icon {
  width: 38px; height: 38px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-body {
  display: flex; flex-direction: column;
}
.stat-body .stat-value {
  font-size: 20px; font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}
.stat-body .stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}
</style>
