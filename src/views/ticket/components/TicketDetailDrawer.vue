<template>
  <div>
    <el-drawer
      :model-value="visible"
      title="问题详情"
      size="720px"
      destroy-on-close
      @update:model-value="$emit('update:visible', $event)"
    >
      <div v-if="row" class="drawer-body">

        <!-- 标题行 -->
        <div class="ticket-header">
          <span :class="['type-dot', `type-${row.ticket_type}`]" :title="row.ticket_type" />
          <span class="ticket-title">{{ row.title }}</span>
          <span :class="['step-badge', stepBadgeClass(row.status)]">{{ row.status }}</span>
        </div>

        <div class="ticket-id-row">
          <span class="ticket-id">{{ row.ticket_id }}</span>
          <span class="ticket-time">创建于 {{ row.created_at }}</span>
          <span v-if="row.resolved_at" class="ticket-resolved">解决于 {{ row.resolved_at }}</span>
        </div>

        <!-- 基本信息 -->
        <div class="section">
          <div class="section-title">基本信息</div>
          <div class="desc-list">
            <div class="desc-row">
              <span class="desc-label">类型</span>
              <span class="desc-value">
                <span :class="['type-tag', `type-tag-${row.ticket_type}`]">{{ row.ticket_type }}</span>
              </span>
              <span class="desc-label">优先级</span>
              <span class="desc-value">
                <span :class="['pri-tag', `pri-${row.priority?.toLowerCase()}`]">{{ row.priority }}</span>
              </span>
            </div>
            <div class="desc-row">
              <span class="desc-label">问题模块</span>
              <span class="desc-value">{{ row.module_name || '-' }}</span>
              <span class="desc-label">提交人</span>
              <span class="desc-value">
                <span v-if="row.reporter_name" class="user-cell">
                  <el-avatar :size="18" :src="row.reporter_avatar || ''">
                    <span>{{ String(row.reporter_name).charAt(0) }}</span>
                  </el-avatar>
                  {{ row.reporter_name }}
                </span>
                <span v-else>-</span>
              </span>
            </div>
            <div class="desc-row">
              <span class="desc-label">当前处理人</span>
              <span class="desc-value">
                <span v-if="row.assignee_name" class="user-cell">
                  <el-avatar :size="18" :src="row.assignee_avatar || ''">
                    <span>{{ String(row.assignee_name).charAt(0) }}</span>
                  </el-avatar>
                  {{ row.assignee_name }}
                </span>
                <span v-else>-</span>
              </span>
              <span class="desc-label">测试处理人</span>
              <span class="desc-value">
                <span v-if="row.test_assignee_name" class="user-cell">
                  <el-avatar :size="18" :src="row.test_assignee_avatar || ''">
                    <span>{{ String(row.test_assignee_name).charAt(0) }}</span>
                  </el-avatar>
                  {{ row.test_assignee_name }}
                </span>
                <span v-else>-</span>
              </span>
            </div>
            <div class="desc-row">
              <span class="desc-label">研发处理人</span>
              <span class="desc-value">
                <span v-if="row.dev_assignee_name" class="user-cell">
                  <el-avatar :size="18" :src="row.dev_assignee_avatar || ''">
                    <span>{{ String(row.dev_assignee_name).charAt(0) }}</span>
                  </el-avatar>
                  {{ row.dev_assignee_name }}
                </span>
                <span v-else>-</span>
              </span>
            </div>
          </div>
        </div>

        <!-- 流程进度 -->
        <div class="section">
          <div class="section-title">处理进度</div>
          <div class="steps-track">
            <div
              v-for="(s, i) in STEPS"
              :key="s"
              :class="['step-node', {
                done: i < currentStepIndex,
                active: i === currentStepIndex,
              }]"
            >
              <div class="step-circle">{{ i + 1 }}</div>
              <div class="step-label">{{ s }}</div>
            </div>
          </div>
        </div>

        <!-- 问题描述 -->
        <div class="section">
          <div class="section-title">问题描述</div>
          <div
            v-if="row.description"
            class="rich-block"
            v-html="row.description"
          />
          <div v-else class="empty-block">暂无描述</div>
        </div>

        <!-- 解决方案 -->
        <div class="section">
          <div class="section-title">
            <span>解决方案</span>
            <el-button
              v-if="!solutionEditing && row"
              size="small"
              link
              type="primary"
              @click="startEditSolution"
            >
              {{ row.solution ? '编辑方案' : '填写方案' }}
            </el-button>
          </div>
          <template v-if="solutionEditing">
            <el-input
              v-model="solutionDraft"
              type="textarea"
              :rows="4"
              placeholder="请描述解决方案..."
            />
            <div class="solution-actions">
              <el-button size="small" @click="cancelEditSolution">取消</el-button>
              <el-button size="small" type="primary" :loading="solutionSaving" @click="saveSolution">保存方案</el-button>
            </div>
          </template>
          <div v-else-if="row.solution" class="text-block">{{ row.solution }}</div>
          <div v-else class="empty-block">尚未填写解决方案</div>
        </div>

        <!-- 备注 -->
        <div v-if="row.remark" class="section">
          <div class="section-title">备注</div>
          <div class="text-block">{{ row.remark }}</div>
        </div>

      </div>

      <template #footer>
        <div class="drawer-footer">
          <div class="footer-left">
            <el-button
              v-if="row && currentStepIndex > 0"
              size="small"
              @click="$emit('advance', row, -1)"
            >上一步</el-button>
            <el-button
              v-if="row && currentStepIndex < STEPS.length - 1"
              size="small"
              type="primary"
              @click="$emit('advance', row, 1)"
            >推进到下一步</el-button>
          </div>
          <div class="footer-right">
            <el-button @click="$emit('update:visible', false)">关闭</el-button>
            <el-button type="primary" plain @click="$emit('edit', row)">编辑</el-button>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { updateTicket } from '@/api/ticket';
import { STEPS, stepIndex } from '../ticketConstants';

const props = defineProps({
  visible: { type: Boolean, default: false },
  row: { type: Object, default: null },
});

const emit = defineEmits(['update:visible', 'edit', 'advance', 'updated']);

const currentStepIndex = computed(() => stepIndex(props.row?.status));

// 解决方案内联编辑
const solutionEditing = ref(false);
const solutionDraft = ref('');
const solutionSaving = ref(false);

watch(() => props.visible, (val) => {
  if (!val) solutionEditing.value = false;
});

function startEditSolution() {
  solutionDraft.value = props.row?.solution || '';
  solutionEditing.value = true;
}

function cancelEditSolution() {
  solutionEditing.value = false;
  solutionDraft.value = '';
}

async function saveSolution() {
  if (!props.row?.id) return;
  solutionSaving.value = true;
  try {
    await updateTicket(props.row.id, { solution: solutionDraft.value });
    props.row.solution = solutionDraft.value;
    solutionEditing.value = false;
    ElMessage.success('方案已保存');
    emit('updated');
  } catch {
    // ignore
  } finally {
    solutionSaving.value = false;
  }
}

const stepBadgeClass = (status) => {
  if (status === '处理完成') return 'done';
  if (['研发解决中', '测试验收中'].includes(status)) return 'progress';
  if (['测试完成待发布', '交付验收中'].includes(status)) return 'review';
  return 'pending';
};
</script>

<style scoped lang="scss">
.drawer-body {
  padding: 4px 0 24px;
}

/* 标题 */
.ticket-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}

.type-dot {
  display: inline-block;
  width: 4px;
  min-height: 20px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-top: 3px;

  &.type-问题 { background: var(--el-color-danger); }
  &.type-需求 { background: var(--el-color-primary); }
  &.type-咨询 { background: var(--el-color-warning); }
  &.type-其他 { background: var(--text-secondary); }
}

.ticket-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.5;
  word-break: break-all;
}

.step-badge {
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;

  &.done    { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.progress { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.review  { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.pending { background: var(--bg-elevated); color: var(--text-secondary); }
}

.ticket-id-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.ticket-id {
  font-size: 12px;
  color: var(--el-color-primary);
  font-family: monospace;
  background: var(--el-color-primary-light-9);
  padding: 1px 6px;
  border-radius: 3px;
}

.ticket-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.ticket-resolved {
  font-size: 12px;
  color: var(--el-color-success);
  &::before { content: '·'; margin: 0 6px; color: var(--text-secondary); }
}

/* 分区 */
.section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}

.solution-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

/* 描述列表 */
.desc-list {
  display: flex;
  flex-direction: column;
}

.desc-row {
  display: grid;
  grid-template-columns: 80px 1fr 80px 1fr;
  align-items: center;
  min-height: 36px;
  border-bottom: 1px solid var(--border-color);

  &:last-child { border-bottom: none; }
}

.desc-label {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 8px 12px 8px 0;
  white-space: nowrap;
}

.desc-value {
  font-size: 13px;
  color: var(--text-primary);
  padding: 8px 16px 8px 0;
}

/* tags */
.type-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;

  &.type-tag-问题 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.type-tag-需求 { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.type-tag-咨询 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.type-tag-其他 { background: var(--bg-elevated); color: var(--text-secondary); }
}

.pri-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;

  &.pri-p0 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.pri-p1 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.pri-p2 { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.pri-p3 { background: var(--bg-elevated); color: var(--text-secondary); }
}

.user-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-primary);
}

/* 进度轨道 */
.steps-track {
  display: flex;
  align-items: flex-start;
  gap: 0;
  overflow-x: auto;
  padding-bottom: 4px;
}

.step-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 60px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 12px;
    left: calc(-50% + 12px);
    right: calc(50% + 12px);
    height: 2px;
    background: var(--border-color);
  }

  &:first-child::before { display: none; }

  &.done::before { background: var(--el-color-success); }
  &.active::before { background: var(--el-color-primary); }

  .step-circle {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--border-color);
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 1;
    transition: all 0.2s;
  }

  &.done .step-circle {
    background: var(--el-color-success);
    color: #fff;
  }

  &.active .step-circle {
    background: var(--el-color-primary);
    color: #fff;
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  .step-label {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 4px;
    text-align: center;
    line-height: 1.3;
    word-break: keep-all;
  }

  &.done .step-label { color: var(--el-color-success); }
  &.active .step-label { color: var(--el-color-primary); font-weight: 600; }
}

/* 内容块 */
.rich-block {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-primary);
  background: var(--bg-elevated);
  border-radius: 6px;
  padding: 12px 16px;

  :deep(img) {
    max-width: 100%;
    border-radius: 4px;
    cursor: zoom-in;
  }
  :deep(p) { margin: 4px 0; }
  :deep(pre) {
    background: var(--bg-card);
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
  }
}

.text-block {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-primary);
  background: var(--bg-elevated);
  border-radius: 6px;
  padding: 12px 16px;
  white-space: pre-wrap;
}

.empty-block {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 12px 0;
}

/* footer */
.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.footer-left {
  display: flex;
  gap: 8px;
}

.footer-right {
  display: flex;
  gap: 8px;
}
</style>
