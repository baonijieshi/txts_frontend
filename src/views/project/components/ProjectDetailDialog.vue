<template>
  <el-dialog
    :model-value="visible"
    width="960px"
    :show-close="true"
    destroy-on-close
    class="project-detail-dialog"
    @update:model-value="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="dialog-header">
        <div class="header-main">
          <span class="dialog-title">{{ project?.name }}</span>
          <el-tag
            v-if="project"
            :type="project.status === '启用' ? 'success' : 'info'"
            size="small"
            effect="plain"
            round
          >{{ project.status }}</el-tag>
        </div>
        <span v-if="project" class="header-date">创建于 {{ formatDate(project.created_at) }}</span>
      </div>
    </template>

    <template v-if="project">
      <div class="detail-body">
        <el-tabs v-model="activeTab" class="detail-tabs">
          <el-tab-pane name="desc" label="项目描述" />
          <el-tab-pane name="versions">
            <template #label>
              关联版本
              <el-badge
                v-if="versionList.length"
                :value="versionList.length"
                :max="99"
                class="tab-badge"
              />
            </template>
          </el-tab-pane>
        </el-tabs>

        <div class="tab-content">
          <!-- 描述 -->
          <div v-if="activeTab === 'desc'" class="desc-panel">
            <div v-if="project.description" class="rich-text" v-html="project.description" />
            <div v-else class="empty-panel">
              <el-empty :image-size="80" description="暂无项目描述" />
            </div>
          </div>

          <!-- 版本进度 -->
          <div v-if="activeTab === 'versions'" class="version-panel">
            <div v-if="versionLoading" v-loading="true" class="loading-area" />
            <template v-else-if="versionList.length">
              <div class="version-grid">
                <div
                  v-for="ver in versionList"
                  :key="ver.id"
                  class="ver-card"
                  :class="statusClass(ver.status)"
                  @click="goToVersion(ver)"
                >
                  <!-- 头部：名称 + 状态 -->
                  <div class="ver-card__header">
                    <span class="ver-card__name">{{ ver.name }}</span>
                    <el-tag :type="statusType(ver.status)" size="small" effect="plain" round>
                      {{ ver.status }}
                    </el-tag>
                  </div>

                  <!-- 统计 -->
                  <div class="ver-card__stats">
                    <div class="stat">
                      <span class="stat__value">{{ ver.task_done }}</span>
                      <span class="stat__sep">/</span>
                      <span class="stat__total">{{ ver.task_total }}</span>
                      <span class="stat__label">任务</span>
                    </div>
                    <div class="stat stat--bug">
                      <span class="stat__value">{{ ver.bug_count }}</span>
                      <span class="stat__label">Bug</span>
                    </div>
                  </div>

                  <!-- 进度条 -->
                  <div class="ver-card__progress">
                    <div class="ver-bar">
                      <span class="ver-bar__label">开发</span>
                      <div class="ver-bar__track">
                        <div class="ver-bar__fill" :style="{ width: (ver.dev_task_progress || 0) + '%', background: progressColor(ver.dev_task_progress || 0) }"></div>
                      </div>
                      <span class="ver-bar__pct">{{ ver.dev_task_progress || 0 }}%</span>
                    </div>
                    <div v-if="ver.plan_case_total > 0" class="ver-bar">
                      <span class="ver-bar__label">测试</span>
                      <div class="ver-bar__track">
                        <div class="ver-bar__fill" :style="{ width: (ver.progress || 0) + '%', background: progressColor(ver.progress || 0) }"></div>
                      </div>
                      <span class="ver-bar__pct">{{ ver.progress || 0 }}%</span>
                    </div>
                  </div>

                  <!-- 周期 + 负责人 -->
                  <div class="ver-card__meta">
                    <span v-if="ver.start_date || ver.end_date" class="meta-chip">
                      <el-icon><Calendar /></el-icon>
                      {{ ver.start_date || '?' }} ~ {{ ver.end_date || '?' }}
                    </span>
                    <span v-if="ver.manager_name" class="meta-chip">
                      <el-avatar :size="16" :src="ver.manager_avatar || ''">
                        {{ ver.manager_name.charAt(0) }}
                      </el-avatar>
                      {{ ver.manager_name }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="empty-panel">
              <el-empty :image-size="80" description="暂未关联版本" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Calendar } from '@element-plus/icons-vue';
import { getVersionList } from '@/api/version';

const props = defineProps({
  visible: Boolean,
  project: { type: Object, default: null },
});

const emit = defineEmits(['update:visible']);

const activeTab = ref('desc');
const versionList = ref([]);
const versionLoading = ref(false);

watch(() => props.visible, async (val) => {
  if (val && props.project) {
    activeTab.value = 'desc';
    versionList.value = [];
    if (props.project.version_ids?.length) {
      versionLoading.value = true;
      try {
        const res = await getVersionList({ page: 1, pageSize: 999 });
        const allVersions = res.data.list || [];
        const idSet = new Set(props.project.version_ids);
        versionList.value = allVersions.filter((v) => idSet.has(v.id));
      } catch { /* ignore */ } finally {
        versionLoading.value = false;
      }
    }
  }
});

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return dateStr.slice(0, 10);
};

const statusType = (s) => ({
  未开始: 'info', 进行中: 'primary', 已完成: 'success', 已暂停: 'warning',
}[s] || 'info');

const statusClass = (s) => ({
  进行中: 'is-active', 已完成: 'is-done', 已暂停: 'is-paused',
}[s] || '');

const router = useRouter();
const goToVersion = (ver) => {
  emit('update:visible', false);
  router.push({ path: '/project/versions', query: { openId: ver.id } });
};

const progressColor = (p) => {
  if (p <= 0) return 'var(--text-placeholder)';
  if (p < 30) return 'var(--text-secondary)';
  if (p < 70) return 'var(--el-color-primary)';
  return 'var(--el-color-success)';
};
</script>

<style scoped lang="scss">
.project-detail-dialog {
  :deep(.el-dialog__body) { padding: 0; overflow: hidden; }
  :deep(.el-dialog__header) {
    padding: 16px 24px;
    border-bottom: 1px solid var(--border-color);
    margin-right: 0;
  }
}
.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.header-main {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dialog-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}
.header-date {
  font-size: 12px;
  color: var(--text-secondary);
}

.detail-body {
  display: flex;
  flex-direction: column;
  height: 560px;
  overflow: hidden;
}
.detail-tabs {
  flex-shrink: 0;
  padding: 0 24px;
  :deep(.el-tabs__header) { margin-bottom: 0; }
  :deep(.el-tabs__nav-wrap::after) { height: 1px; }
}
.tab-badge {
  :deep(.el-badge__content) {
    position: static;
    transform: none;
    margin-left: 4px;
    vertical-align: middle;
  }
}
.tab-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── 描述面板 ── */
.desc-panel {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
}
.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.loading-area {
  height: 200px;
}

/* ── 版本面板 ── */
.version-panel {
  height: 100%;
  overflow-y: auto;
  padding: 20px 24px;
}
.version-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 14px;
}

/* ── 版本卡片 ── */
.ver-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: var(--shadow-card);
  border-left: 3px solid var(--border-color);
  cursor: pointer;

  &:hover {
    box-shadow: var(--shadow-hover);
    transform: translateY(-2px);
  }
  &.is-active { border-left-color: var(--el-color-primary); }
  &.is-done { border-left-color: var(--el-color-success); }
  &.is-paused { border-left-color: var(--el-color-warning); }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  &__stats {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  &__meta {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  background: var(--bg-elevated);
  color: var(--text-regular);

  &__value { font-weight: 600; }
  &__sep { color: var(--text-secondary); }
  &__total { color: var(--text-secondary); }
  &__label { color: var(--text-secondary); margin-left: 2px; }

  &--bug {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);
    .stat__value { color: var(--el-color-danger); }
    .stat__label { color: var(--el-color-danger-light-5); }
  }
}
.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  .el-icon { font-size: 13px; }
  .el-avatar {
    font-size: 9px;
    background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-5));
    color: #fff;
  }
}

/* ── 进度条 ── */
.ver-card__progress {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ver-bar {
  display: flex;
  align-items: center;
  gap: 6px;

  &__label {
    font-size: 10px;
    font-weight: 500;
    color: var(--text-placeholder);
    min-width: 24px;
    text-transform: uppercase;
  }

  &__track {
    flex: 1;
    height: 5px;
    background: var(--bg-hover);
    border-radius: 3px;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s cubic-bezier(.34, 1.56, .64, 1);
  }

  &__pct {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-regular);
    font-variant-numeric: tabular-nums;
    min-width: 30px;
    text-align: right;
  }
}

/* ── 富文本 ── */
.rich-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.8;
  word-break: break-word;

  :deep(p) { margin: 0 0 12px; }
  :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
    margin: 16px 0 8px;
    color: var(--text-primary);
    font-weight: 600;
  }
  :deep(h1) { font-size: 20px; }
  :deep(h2) { font-size: 18px; }
  :deep(h3) { font-size: 16px; }
  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    margin: 8px 0;
  }
  :deep(ul), :deep(ol) { padding-left: 24px; margin: 0 0 12px; }
  :deep(li) { margin-bottom: 4px; }
  :deep(a) {
    color: var(--el-color-primary);
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }
  :deep(table) { border-collapse: collapse; width: 100%; margin: 12px 0; }
  :deep(th), :deep(td) {
    border: 1px solid var(--border-color);
    padding: 8px 12px;
    font-size: 13px;
    text-align: left;
  }
  :deep(th) { background: var(--bg-elevated); font-weight: 600; }
  :deep(blockquote) {
    margin: 12px 0;
    padding: 12px 16px;
    border-left: 4px solid var(--el-color-primary);
    background: var(--bg-elevated);
    border-radius: 0 6px 6px 0;
    color: var(--text-regular);
  }
  :deep(pre) {
    background: var(--bg-elevated);
    padding: 14px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 13px;
    margin: 8px 0;
  }
  :deep(code) {
    background: var(--bg-elevated);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
  }
  :deep(pre code) { background: none; padding: 0; }
}
</style>
