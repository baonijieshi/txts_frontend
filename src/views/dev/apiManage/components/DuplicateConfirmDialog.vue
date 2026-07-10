<template>
  <el-dialog
    :model-value="visible"
    title="检测到重复接口"
    width="560px"
    :close-on-click-modal="false"
    @update:model-value="handleVisibleChange"
    @closed="strategy = 'skip'"
  >
    <div class="duplicate-body">
      <!-- 统计摘要 -->
      <div class="summary">
        <el-icon class="warning-icon"><Warning /></el-icon>
        <span>
          本次共导入 <strong>{{ total }}</strong> 个接口，其中
          <strong class="dup-count">{{ duplicateCount }}</strong> 个与已有接口重复（路径 + 方法相同）
        </span>
      </div>

      <!-- 重复接口列表 -->
      <el-table :data="duplicates" size="small" max-height="220" class="dup-table">
        <el-table-column label="接口名称" prop="name" min-width="140" show-overflow-tooltip />
        <el-table-column label="路径" prop="path" min-width="160" show-overflow-tooltip />
        <el-table-column label="方法" prop="method" width="80">
          <template #default="{ row }">
            <el-tag :type="methodTagType(row.method)" size="small" effect="plain">{{ row.method }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 处理策略选择 -->
      <div class="strategy-section">
        <p class="strategy-label">请选择处理方式：</p>
        <div class="strategy-cards">
          <div
            class="strategy-card"
            :class="{ 'is-active': strategy === 'overwrite' }"
            @click="strategy = 'overwrite'"
          >
            <el-icon class="sc-icon"><Refresh /></el-icon>
            <div class="sc-content">
              <span class="sc-title">覆盖重复接口</span>
              <span class="sc-desc">用新数据覆盖已有记录</span>
            </div>
            <span class="sc-check" :class="{ 'is-checked': strategy === 'overwrite' }" />
          </div>
          <div
            class="strategy-card"
            :class="{ 'is-active': strategy === 'skip' }"
            @click="strategy = 'skip'"
          >
            <el-icon class="sc-icon"><CircleClose /></el-icon>
            <div class="sc-content">
              <span class="sc-title">跳过重复接口</span>
              <span class="sc-desc">保留已有记录，只导入新接口</span>
            </div>
            <span class="sc-check" :class="{ 'is-checked': strategy === 'skip' }" />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref } from 'vue';
import { Warning, Refresh, CircleClose } from '@element-plus/icons-vue';

defineProps({
  visible: { type: Boolean, default: false },
  duplicates: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  duplicateCount: { type: Number, default: 0 },
});
const emit = defineEmits(['update:visible', 'confirm', 'cancel']);

const strategy = ref('skip');

const METHOD_TAG_TYPE = {
  GET: 'success',
  POST: 'primary',
  PUT: 'warning',
  PATCH: 'info',
  DELETE: 'danger',
};
const methodTagType = (m) => METHOD_TAG_TYPE[(m || '').toUpperCase()] || '';

function handleVisibleChange(val) {
  if (!val) handleCancel();
}

function handleCancel() {
  emit('cancel');
  emit('update:visible', false);
}

function handleConfirm() {
  emit('confirm', strategy.value);
  emit('update:visible', false);
}
</script>

<style scoped lang="scss">
.duplicate-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  color: var(--text-regular);
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-7);
  border-radius: 6px;
  padding: 12px 14px;

  .warning-icon {
    font-size: 18px;
    color: var(--el-color-warning);
    flex-shrink: 0;
    margin-top: 1px;
  }

  .dup-count {
    color: var(--el-color-warning);
  }
}

.dup-table {
  border-radius: 4px;
}

.strategy-section {
  .strategy-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 10px;
  }

  .strategy-cards {
    display: flex;
    gap: 10px;
  }

  .strategy-card {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px;
    border-radius: 10px;
    border: 2px solid var(--border-color);
    cursor: pointer;
    transition: all 0.2s;
    background: var(--bg-card);

    &:hover {
      border-color: var(--el-color-primary-light-7);
      background: var(--bg-elevated);
    }

    &.is-active {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }

    .sc-icon {
      font-size: 22px;
      color: var(--text-secondary);
      flex-shrink: 0;
      transition: color 0.2s;
    }

    &.is-active .sc-icon {
      color: var(--el-color-primary);
    }

    .sc-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .sc-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .sc-desc {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .sc-check {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid var(--border-color);
      flex-shrink: 0;
      transition: all 0.2s;
      position: relative;

      &.is-checked {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary);
        &::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 5px;
          width: 5px;
          height: 8px;
          border: solid #fff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
      }
    }
  }
}
</style>
