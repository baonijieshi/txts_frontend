<template>
  <el-drawer
    :model-value="visible"
    size="640px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="drawer-header">
        <div class="drawer-title-row">
          <span :class="['priority-dot', `priority-${testcase?.priority?.toLowerCase()}`]">
            {{ testcase?.priority }}
          </span>
          <span class="drawer-title">{{ testcase?.title }}</span>
        </div>
        <div v-if="testcase" class="drawer-meta">
          <span class="meta-item">{{ testcase.type }}</span>
          <span v-if="testcase.module" class="meta-item">{{ testcase.module }}</span>
          <span v-if="testcase.versionName" class="meta-item">{{ testcase.versionName }}</span>
        </div>
      </div>
    </template>

    <template v-if="testcase">
      <!-- 基本信息 -->
      <div class="section">
        <div class="section-title">基本信息</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">创建人</span>
            <div class="creator-cell">
              <el-avatar :src="testcase.creatorAvatar" :size="18">{{ testcase.creator?.charAt(0) }}</el-avatar>
              <span>{{ testcase.creator }}</span>
            </div>
          </div>
          <div class="info-item">
            <span class="info-label">创建时间</span>
            <span class="time-text">{{ testcase.createTime }}</span>
          </div>
          <div v-if="testcase.precondition" class="info-item full">
            <span class="info-label">前置条件</span>
            <span class="pre-text">{{ testcase.precondition }}</span>
          </div>
          <div v-if="testcase.remark" class="info-item full">
            <span class="info-label">备注</span>
            <span class="pre-text">{{ testcase.remark }}</span>
          </div>
        </div>
      </div>

      <!-- 测试步骤 -->
      <div class="section">
        <div class="section-title">测试步骤 <span class="step-count">{{ testcase.steps?.length || 0 }} 步</span></div>
        <div v-if="!testcase.steps?.length" class="no-steps">暂无步骤</div>
        <div v-else class="steps-list">
          <div v-for="(step, idx) in testcase.steps" :key="idx" class="step-item">
            <div class="step-num">{{ idx + 1 }}</div>
            <div class="step-body">
              <div class="step-desc">{{ step.desc }}</div>
              <div class="step-expect">
                <span class="expect-label">预期：</span>{{ step.expect }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="drawer-footer">
        <div class="nav-group">
          <el-button :disabled="!hasPrev" @click="$emit('prev')">
            <el-icon><ArrowLeft /></el-icon>上一条
          </el-button>
          <span class="nav-counter">{{ currentIndex + 1 }} / {{ totalCount }}</span>
          <el-button :disabled="!hasNext" @click="$emit('next')">
            下一条<el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
        <div class="action-group">
          <el-button type="primary" @click="$emit('update:visible', false)">关闭</el-button>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { computed } from 'vue';

const props = defineProps({
  visible: Boolean,
  testcase: { type: Object, default: null },
  currentIndex: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
});

const hasPrev = computed(() => props.currentIndex > 0);
const hasNext = computed(() => props.currentIndex < props.totalCount - 1);

defineEmits(['update:visible', 'prev', 'next']);
</script>

<style scoped lang="scss">
.drawer-header {
  flex: 1;
  min-width: 0;
}

.drawer-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.drawer-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.drawer-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 1px 7px;
  border-radius: 3px;
}



.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-regular);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 6px;

  .step-count {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-secondary);
  }
}

.creator-cell {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
}

.time-text { font-size: 12px; color: var(--text-secondary); }
.pre-text  { font-size: 13px; color: var(--text-regular); white-space: pre-wrap; }

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);

  &:nth-child(even) { border-right: none; }
  &:last-child, &:nth-last-child(2):nth-child(odd) { border-bottom: none; }
  &.full {
    grid-column: 1 / -1;
    border-right: none;
    align-items: flex-start;
    &:last-child { border-bottom: none; }
  }
}

.info-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 52px;
}

.no-steps {
  color: var(--text-placeholder);
  font-size: 13px;
  padding: 12px 0;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-item {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-elevated);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.step-body {
  flex: 1;
  min-width: 0;
}

.step-desc {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.step-expect {
  font-size: 12px;
  color: var(--text-secondary);

  .expect-label { color: var(--text-placeholder); }
}

// 优先级色块
// 底部导航
.drawer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.nav-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-counter {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 48px;
  text-align: center;
}

.action-group {
  display: flex;
  gap: 8px;
}

// 优先级色块
.priority-dot {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;

  &.priority-p0 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.priority-p1 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.priority-p2 { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.priority-p3 { background: var(--el-color-success-light-9); color: var(--el-color-success); }
}
</style>
