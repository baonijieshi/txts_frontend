<template>
  <div
    class="kanban-card"
    :class="{ 'is-dragging': dragging, 'is-not-draggable': !draggable }"
    :draggable="draggable"
    @click="$emit('click')"
    @dragstart="draggable && onDragStart($event)"
    @dragend="draggable && onDragEnd($event)"
  >
    <!-- 拖拽手柄 -->
    <div v-if="draggable" class="kanban-card__grip">
      <span class="grip-dot" />
      <span class="grip-dot" />
      <span class="grip-dot" />
    </div>

    <!-- 标题行 -->
    <div class="kanban-card__header">
      <span class="kanban-card__name">{{ version.name }}</span>
      <el-tag
        v-if="version.test_status && version.test_status !== '未提测'"
        :type="testStatusType"
        size="small"
        effect="plain"
        round
        class="test-badge"
      >{{ testStatusLabel }}</el-tag>
    </div>

    <!-- 日期 -->
    <div v-if="version.startDate || version.endDate" class="kanban-card__date">
      <el-icon><Calendar /></el-icon>
      <span>{{ version.startDate || '?' }} ~ {{ version.endDate || '?' }}</span>
    </div>

    <!-- 进度条 -->
    <div class="kanban-card__progress">
      <div class="progress-row">
        <span class="progress-label">开发</span>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: (version.devProgress || 0) + '%', background: progressColor(version.devProgress || 0) }"
          />
        </div>
        <span class="progress-pct">{{ version.devProgress || 0 }}%</span>
      </div>
      <div v-if="version.planCaseTotal > 0" class="progress-row">
        <span class="progress-label">测试</span>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: (version.progress || 0) + '%', background: progressColor(version.progress || 0) }"
          />
        </div>
        <span class="progress-pct">{{ version.progress || 0 }}%</span>
      </div>
    </div>

    <!-- 底部：团队 + 统计 -->
    <div class="kanban-card__footer">
      <div class="team-avatars">
        <el-tooltip v-if="version.manager" :content="`PM: ${version.manager}`" placement="top">
          <el-avatar :size="24" :src="version.managerAvatar || ''">{{ version.manager?.charAt(0) }}</el-avatar>
        </el-tooltip>
        <el-tooltip v-if="version.devLeader" :content="`开发: ${version.devLeader}`" placement="top">
          <el-avatar :size="24" :src="version.devLeaderAvatar || ''">{{ version.devLeader?.charAt(0) }}</el-avatar>
        </el-tooltip>
        <el-tooltip
          v-for="(tl, idx) in (version.testLeaderNames || []).slice(0, 2)"
          :key="'tl'+idx"
          :content="`测试: ${tl}`"
          placement="top"
        >
          <el-avatar :size="24" :src="(version.testLeaderAvatars || [])[idx] || ''">{{ tl?.charAt(0) }}</el-avatar>
        </el-tooltip>
      </div>
      <div class="stat-chips">
        <span class="stat-chip">
          <el-icon><Tickets /></el-icon>{{ version.taskDone }}/{{ version.taskTotal }}
        </span>
        <span class="stat-chip stat-chip--bug" @click.stop="$emit('goBug')">
          <el-icon><WarningFilled /></el-icon>{{ version.bugCount }}
        </span>
      </div>
    </div>

    <!-- Hover 操作栏 -->
    <div class="kanban-card__actions" @mousedown.stop @click.stop>
      <el-button v-if="canSubmitTest" size="small" link type="warning" @click.stop="$emit('submitTest')">提测</el-button>
      <el-button v-if="canPassTest" size="small" link type="success" @click.stop="$emit('passTest')">通过</el-button>
      <el-button v-if="canRejectTest" size="small" link type="danger" @click.stop="$emit('rejectTest')">驳回</el-button>
      <el-button v-if="canSubmitAcceptance" size="small" link type="primary" @click.stop="$emit('submitAcceptance')">提交验收</el-button>
      <el-button v-if="canPassAcceptance" size="small" link type="success" @click.stop="$emit('passAcceptance')">验收通过</el-button>
      <el-button v-if="canRejectAcceptance" size="small" link type="danger" @click.stop="$emit('rejectAcceptance')">验收驳回</el-button>
      <el-button size="small" link type="primary" @click.stop="$emit('edit')">编辑</el-button>
      <el-button v-if="version.isArchived" size="small" link type="warning" @click.stop="$emit('archive')">取消归档</el-button>
      <el-button size="small" link type="danger" @click.stop="$emit('delete')">删除</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import {
  Calendar, Tickets, WarningFilled,
} from '@element-plus/icons-vue';

const props = defineProps({
  version: { type: Object, required: true },
  draggable: { type: Boolean, default: true },
});

const emit = defineEmits(['click', 'edit', 'delete', 'goBug', 'archive', 'submitTest', 'passTest', 'rejectTest', 
  'submitAcceptance', 'passAcceptance', 'rejectAcceptance',
  'dragStart', 'dragEnd']);

const store = useStore();
const currentRoles = computed(() => store.getters.roles);

const dragging = ref(false);

const onDragStart = (e: DragEvent) => {
  dragging.value = true;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(props.version.id));
  }
  emit('dragStart', props.version);
};

const onDragEnd = () => {
  dragging.value = false;
  emit('dragEnd', props.version);
};

const testStatusType = computed(() => ({
  测试中: 'warning',
  测试通过: 'success',
  测试驳回: 'danger',
}[props.version.test_status] || 'info'));

const testStatusLabel = computed(() => ({
  测试中: '测试中',
  测试通过: '已通过',
  测试驳回: '已驳回',
}[props.version.test_status] || props.version.test_status));

const canSubmitTest = computed(() => {
  const ts = props.version.test_status;
  return (!ts || ts === '未提测' || ts === '测试驳回') && props.version.status === '进行中';
});
const canPassTest = computed(() => props.version.test_status === '测试中');
const canRejectTest = computed(() => props.version.test_status === '测试中');

const canSubmitAcceptance = computed(() => {
  const as = props.version.acceptance_status;
  return currentRoles.value.some(r => ['开发', '测试'].includes(r))
    && props.version.test_status === '测试通过'
    && (!as || as === '待验收' || as === '验收驳回');
});
// 验收通过/驳回：仅产品人员可见
const canPassAcceptance = computed(() =>
  currentRoles.value.some(r => r.includes('产品')) && props.version.acceptance_status === '验收中'
);
const canRejectAcceptance = computed(() =>
  currentRoles.value.some(r => r.includes('产品')) && props.version.acceptance_status === '验收中'
);

const progressColor = (p: number) => {
  if (p <= 0) return 'var(--text-placeholder)';
  if (p < 30) return 'var(--text-secondary)';
  if (p < 70) return 'var(--el-color-primary)';
  return 'var(--el-color-success)';
};
</script>

<style scoped lang="scss">
.kanban-card {
  padding: 14px 16px;
  background: var(--bg-card);
  border-radius: 10px;
  cursor: grab;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  &:active { cursor: grabbing; }

  &.is-dragging {
    opacity: 0.5;
    transform: rotate(2deg) scale(0.97);
  }

  &.is-not-draggable {
    cursor: pointer;
  }

  &__grip {
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s;

    .grip-dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: var(--text-placeholder);
    }
  }

  &:hover &__grip { opacity: 0.6; }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .test-badge {
    font-size: 10px;
    height: 18px;
    line-height: 18px;
    padding: 0 6px;
    flex-shrink: 0;
  }

  &__date {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-secondary);

    .el-icon { font-size: 13px; }
  }

  &__progress {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .progress-row {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .progress-label {
    font-size: 10px;
    color: var(--text-placeholder);
    font-weight: 500;
    min-width: 22px;
    text-transform: uppercase;
  }

  .progress-bar {
    flex: 1;
    height: 5px;
    background: var(--bg-hover);
    border-radius: 2.5px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 2.5px;
    transition: width 0.4s cubic-bezier(.34, 1.56, .64, 1);
  }

  .progress-pct {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-regular);
    font-variant-numeric: tabular-nums;
    min-width: 30px;
    text-align: right;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .team-avatars {
    display: flex;
    gap: 2px;

    .el-avatar {
      font-size: 10px;
      background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-5));
      color: #fff;
    }
  }

  .stat-chips {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: var(--text-regular);
  }

  .stat-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;

    .el-icon { font-size: 12px; }

    &--bug {
      color: var(--el-color-danger);
      cursor: pointer;
      &:hover { text-decoration: underline; }
    }
  }

  &__actions {
    display: flex;
    gap: 0;
    padding-top: 6px;
    border-top: 1px solid var(--border-light);
    opacity: 0;
    transition: opacity 0.15s;
    flex-wrap: wrap;
  }

  &:hover &__actions { opacity: 1; }
}</style>
