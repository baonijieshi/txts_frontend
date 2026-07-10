<template>
  <el-dialog
    :model-value="visible"
    title="执行用例"
    width="640px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="run-header">
      <div v-if="runCase" class="run-case-name">{{ runCase.title }}</div>
      <div v-if="runCase?.precondition" class="run-precondition">
        <el-icon><InfoFilled /></el-icon>前置条件：{{ runCase.precondition }}
      </div>
    </div>

    <!-- 进度条（批量执行时） -->
    <div v-if="batchQueue.length > 1" class="batch-progress">
      <el-progress
        :percentage="Math.round((batchIndex / batchQueue.length) * 100)"
        :stroke-width="4"
        :show-text="false"
      />
    </div>

    <!-- 步骤列表 -->
    <div v-if="runSteps.length" class="run-section-label">测试步骤</div>
    <div class="steps-run-list">
      <div
        v-for="(step, idx) in runSteps"
        :key="idx"
        class="step-run-item"
        :class="{ 'is-pass': step.result === '通过', 'is-fail': step.result === '失败', 'is-block': step.result === '阻塞' }"
      >
        <div class="step-run-header">
          <div class="step-run-num">{{ idx + 1 }}</div>
          <div class="step-run-info">
            <div class="step-run-desc">{{ step.desc }}</div>
            <div class="step-run-expect">预期：{{ step.expect }}</div>
          </div>
          <!-- 快捷结果按钮 -->
          <div class="step-run-actions">
            <el-button
              size="small"
              :type="step.result === '通过' ? 'success' : 'default'"
              :plain="step.result !== '通过'"
              @click="step.result = '通过'"
            >通过</el-button>
            <el-button
              size="small"
              :type="step.result === '失败' ? 'danger' : 'default'"
              :plain="step.result !== '失败'"
              @click="step.result = '失败'"
            >失败</el-button>
            <el-button
              size="small"
              :type="step.result === '阻塞' ? 'warning' : 'default'"
              :plain="step.result !== '阻塞'"
              @click="step.result = '阻塞'"
            >阻塞</el-button>
          </div>
        </div>

        <!-- 失败时展开实际结果 + 提Bug -->
        <div v-if="step.result === '失败' || step.result === '阻塞'" class="step-run-actual">
          <el-input
            v-model="step.actual"
            :placeholder="`实际结果（选填）`"
            size="small"
            style="flex:1"
          />
          <el-button
            v-if="step.result === '失败'"
            size="small"
            type="danger"
            plain
            @click="$emit('submit-bug-from-step', idx)"
          >
            <el-icon><Warning /></el-icon>提 Bug
          </el-button>
        </div>
      </div>
    </div>

    <!-- 汇总 -->
    <div v-if="runSteps.length > 0" class="run-summary">
      <span class="summary-item pass">通过 {{ passCount }}</span>
      <span class="summary-item fail">失败 {{ failCount }}</span>
      <span class="summary-item block">阻塞 {{ blockCount }}</span>
      <span class="summary-item pending">未填 {{ pendingCount }}</span>
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button v-if="hasFailedStep" type="danger" plain @click="$emit('submit-bug-from-run')">
        <el-icon><Warning /></el-icon>提交整体 Bug
      </el-button>
      <el-button type="primary" :disabled="pendingCount > 0" @click="handleSubmit">
        {{ batchQueue.length > 1 && batchIndex < batchQueue.length - 1 ? '提交并执行下一条' : '提交结果' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { InfoFilled, Warning } from '@element-plus/icons-vue';
import { updateTestPlanCase } from '@/api/testcase';

const props = defineProps({
  visible: Boolean,
  runCase: { type: Object, default: null },
  runSteps: { type: Array, default: () => [] },
  batchQueue: { type: Array, default: () => [] },
  batchIndex: { type: Number, default: 0 },
  planId: { type: Number, default: null },
  planCaseId: { type: Number, default: null },
});

const emit = defineEmits(['update:visible', 'next', 'done', 'submit-bug-from-step', 'submit-bug-from-run']);

const passCount = computed(() => props.runSteps.filter((s) => s.result === '通过').length);
const failCount = computed(() => props.runSteps.filter((s) => s.result === '失败').length);
const blockCount = computed(() => props.runSteps.filter((s) => s.result === '阻塞').length);
const pendingCount = computed(() => props.runSteps.filter((s) => !s.result).length);
const hasFailedStep = computed(() => failCount.value > 0);

function getFinalResult() {
  if (failCount.value > 0) return '失败';
  if (blockCount.value > 0) return '阻塞';
  return '通过';
}

const handleSubmit = async () => {
  if (pendingCount.value > 0) { ElMessage.warning('请为每个步骤选择执行结果'); return; }
  const finalResult = getFinalResult();
  try {
    await updateTestPlanCase(props.planId, props.planCaseId, { result: finalResult });
    ElMessage.success(`执行完成，结果：${finalResult}`);
    const nextIndex = props.batchIndex + 1;
    if (props.batchQueue.length > 0 && nextIndex < props.batchQueue.length) {
      emit('next', nextIndex);
    } else {
      emit('done');
      emit('update:visible', false);
    }
  } catch { ElMessage.error('提交执行结果失败'); }
};
</script>

<style scoped lang="scss">
.run-header {
  margin-bottom: 16px;
}

.run-case-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1.4;
}

.run-precondition {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: var(--text-regular);
  background: var(--el-color-warning-light-9);
  padding: 10px 12px;
  border-radius: 8px;
  line-height: 1.5;

  .el-icon {
    flex-shrink: 0;
    color: var(--el-color-warning);
    margin-top: 2px;
  }
}

.batch-progress { margin-bottom: 16px; }

// ── 步骤区 ──────────────────────────────────────────────────
.run-section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-regular);
  margin-bottom: 10px;
}

.steps-run-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-run-item {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-elevated);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: border-color 0.2s, background 0.2s;
  flex-direction: column;

  &.is-pass  { border-color: var(--el-color-success-light-5); background: var(--el-color-success-light-9); }
  &.is-fail  { border-color: var(--el-color-danger-light-5); background: var(--el-color-danger-light-9); }
  &.is-block { border-color: var(--el-color-warning-light-5); background: var(--el-color-warning-light-9); }
}

.step-run-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.step-run-num {
  width: 24px;
  height: 24px;
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

.step-run-info {
  flex: 1;
  min-width: 0;
}

.step-run-desc {
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 4px;
  line-height: 1.5;
}

.step-run-expect {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: '预期：';
    color: var(--text-placeholder);
  }
}

// ── 执行按钮（胶囊风格） ──
.step-run-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;

  .el-button {
    height: 28px;
    padding: 0 10px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 500;
    border: 1.5px solid var(--border-color);
    background: transparent;
    color: var(--text-secondary);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

    &:hover {
      border-color: var(--border-heavy);
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    &.el-button--success {
      border-color: var(--el-color-success);
      background: var(--el-color-success-light-9);
      color: var(--el-color-success);
    }
    &.el-button--danger {
      border-color: var(--el-color-danger);
      background: var(--el-color-danger-light-9);
      color: var(--el-color-danger);
    }
    &.el-button--warning {
      border-color: var(--el-color-warning);
      background: var(--el-color-warning-light-9);
      color: var(--el-color-warning);
    }
  }
}

// ── 失败展开区 ──
.step-run-actual {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--border-color);
}

// ── 汇总 ──
.run-summary {
  display: flex;
  gap: 18px;
  padding: 12px 0;
  margin-top: 16px;
  border-top: 1px solid var(--border-color);
  font-size: 13px;

  .summary-item {
    font-weight: 500;
    &.pass  { color: var(--el-color-success); }
    &.fail  { color: var(--el-color-danger); }
    &.block { color: var(--el-color-warning); }
    &.pending { color: var(--text-secondary); }
  }
}
</style>
