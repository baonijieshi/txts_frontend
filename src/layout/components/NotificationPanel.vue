<template>
  <div
    v-if="visible"
    ref="panelRef"
    tabindex="-1"
    class="notification-panel"
    @keydown.escape="emit('update:visible', false)"
  >
    <div class="panel-header">
      <div class="panel-header-left">
        <span class="panel-title">通知</span>
        <span v-if="unreadCount" class="panel-badge">{{ unreadCount }}</span>
      </div>
      <div class="panel-actions">
        <el-button
          type="primary"
          link
          :disabled="!hasUnread"
          @click="handleMarkAllRead"
        >
          <el-icon><Check /></el-icon>全部已读
        </el-button>
        <el-button
          type="danger"
          link
          :disabled="notifications.length === 0"
          @click="handleClearAll"
        >
          <el-icon><Delete /></el-icon>清空
        </el-button>
      </div>
    </div>

    <div class="panel-body">
      <div v-if="loading && page === 1" class="panel-loading">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      </div>

      <el-empty
        v-else-if="notifications.length === 0 && !loading"
        description="暂无通知"
        :image-size="60"
      />

      <template v-else>
        <!-- 按类型分组 -->
        <div
          v-for="group in groupedNotifications"
          :key="group.type"
          class="notif-group"
        >
          <div class="group-header">
            <div class="group-header-left">
              <el-icon :size="15" class="group-icon"><component :is="getTypeIcon(group.type)" /></el-icon>
              <span class="group-label">{{ groupLabel(group.type) }}</span>
              <span class="group-count">{{ group.items.length }}</span>
            </div>
            <el-button v-if="group.unreadCount > 0" text size="small" class="group-mark-read" @click="markGroupRead(group)">
              已读
            </el-button>
          </div>

          <div
            v-for="item in group.items"
            :key="item.id"
            class="notification-card"
            :class="{ unread: !item.is_read }"
            :style="{ '--type-color': typeColor(group.type) }"
          >
            <div class="card-indicator" :class="{ active: !item.is_read }" />

            <div class="card-body" @click="handleCardClick(item)">
              <div class="card-top">
                <span class="card-sender">{{ item.sender_name || '系统' }}</span>
                <span class="card-time">{{ timeAgo(item.created_at) }}</span>
              </div>
              <div class="card-title">{{ item.title }}</div>
              <div class="card-summary">{{ truncateContent(item.content) }}</div>
            </div>

            <div class="card-actions">
              <el-button
                size="small"
                type="primary"
                plain
                @click.stop="handleActionClick(item)"
              >
                {{ actionLabel(item) }}
              </el-button>
              <el-button
                v-if="!item.is_read"
                size="small"
                text
                @click.stop="handleMarkOne(item)"
              >
                已读
              </el-button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="hasMore && !loading" class="panel-footer">
      <el-button link type="primary" :loading="loadingMore" @click="loadMore">
        加载更多
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, watch, onMounted, onBeforeUnmount, markRaw, computed, nextTick,
} from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import {
  ChatDotRound, Warning, Tickets, Loading, Delete, Stamp, Check, Close,
  Aim, FolderOpened,
} from '@element-plus/icons-vue';
import { getNotificationList } from '@/api/notification';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:visible']);

const store = useStore();
const router = useRouter();

const panelRef = ref(null);
const notifications = ref([]);
const loading = ref(false);
const loadingMore = ref(false);
const page = ref(1);
const pageSize = 10;
const total = ref(0);
const hasMore = ref(false);

const unreadCount = computed(() => store.getters.unreadCount || 0);
const hasUnread = computed(() => notifications.value.some((n) => !n.is_read));

// ── 通知类型映射 ──
const iconMap = {
  comment_reply: markRaw(ChatDotRound),
  bug_assigned: markRaw(Warning),
  bug_resolved: markRaw(Warning),
  bug_activated: markRaw(Warning),
  ticket_assigned: markRaw(Tickets),
  story_review: markRaw(Stamp),
  okr_review: markRaw(Aim),
  acceptance_submitted: markRaw(FolderOpened),
  acceptance_rejected: markRaw(FolderOpened),
  test_submitted: markRaw(FolderOpened),
  test_rejected: markRaw(FolderOpened),
};

function getTypeIcon(type) {
  return iconMap[type] || markRaw(ChatDotRound);
}

const typeLabels = {
  bug_assigned: 'Bug 指派',
  bug_resolved: 'Bug 解决',
  bug_activated: 'Bug 激活',
  ticket_assigned: '线上问题指派',
  story_review: '需求审核',
  okr_review: 'OKR 审核',
  comment_reply: '评论回复',
  acceptance_submitted: '验收提交',
  acceptance_rejected: '验收驳回',
  test_submitted: '提测通知',
  test_rejected: '测试驳回',
};

function groupLabel(type) {
  return typeLabels[type] || type;
}

const typeColors = {
  bug: 'var(--el-color-danger)',
  ticket: 'var(--el-color-warning)',
  story: 'var(--el-color-primary)',
  okr: 'var(--el-color-success)',
  version: 'var(--el-color-info)',
  test: 'var(--el-color-warning)',
};

function typeColor(type) {
  const prefix = type.split('_')[0];
  return typeColors[prefix] || 'var(--el-color-primary)';
}

// ── Action 配置 ──
const actionConfig = {
  bug_assigned: { label: '去处理', navigate: (item) => ({ path: '/test/bug', query: { openId: item.source_id } }) },
  bug_resolved: { label: '查看', navigate: (item) => ({ path: '/test/bug', query: { openId: item.source_id } }) },
  bug_activated: { label: '查看', navigate: (item) => ({ path: '/test/bug', query: { openId: item.source_id } }) },
  ticket_assigned: { label: '去处理', navigate: (item) => ({ path: '/delivery/ticket', query: { openId: item.source_id } }) },
  story_review: { label: '去评审', navigate: (item) => ({ path: '/story', query: { openId: item.source_id } }) },
  okr_review: { label: '查看', navigate: () => ({ path: '/okr' }) },
  comment_reply: { label: '查看', navigate: (item) => ({ path: '/story', query: { openId: item.source_id } }) },
  acceptance_submitted: { label: '去验收', navigate: (item) => ({ path: '/project/versions', query: { openId: item.source_id } }) },
  acceptance_rejected: { label: '查看', navigate: (item) => ({ path: '/project/versions', query: { openId: item.source_id } }) },
  test_submitted: { label: '查看', navigate: (item) => ({ path: '/project/versions', query: { openId: item.source_id } }) },
  test_rejected: { label: '查看', navigate: (item) => ({ path: '/project/versions', query: { openId: item.source_id } }) },
};

function actionLabel(item) {
  return actionConfig[item.notification_type]?.label || '查看';
}

// ── 按类型分组 ──
const groupedNotifications = computed(() => {
  const groups = {};
  notifications.value.forEach((item) => {
    const type = item.notification_type;
    if (!groups[type]) groups[type] = { type, items: [], unreadCount: 0 };
    groups[type].items.push(item);
    if (!item.is_read) groups[type].unreadCount++;
  });
  // 排序：未读多的组在前
  return Object.values(groups).sort((a, b) => b.unreadCount - a.unreadCount);
});

// ── 工具函数 ──
function truncateContent(content) {
  if (!content) return '';
  if (content.length > 80) return content.slice(0, 80) + '...';
  return content;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return dateStr.slice(0, 10);
}

// ── 导航 ──
const routeMap = {
  story: (id) => ({ path: '/story', query: { openId: id } }),
  bug: (id) => ({ path: '/test/bug', query: { openId: id } }),
  ticket: (id) => ({ path: '/delivery/ticket', query: { openId: id } }),
  okr: () => ({ path: '/okr' }),
  version: (id) => ({ path: '/project/versions', query: { openId: id } }),
};

function navigateTo(item) {
  const routeFn = routeMap[item.source_type];
  if (routeFn) {
    router.push(routeFn(item.source_id)).catch(() => {});
    emit('update:visible', false);
  }
}

// ── 交互事件 ──
async function handleCardClick(item) {
  try {
    if (!item.is_read) {
      await store.dispatch('notification/markRead', item.id);
      item.is_read = true;
    }
  } catch { /* ignore */ }
  navigateTo(item);
}

async function handleActionClick(item) {
  try {
    if (!item.is_read) {
      await store.dispatch('notification/markRead', item.id);
      item.is_read = true;
    }
  } catch { /* ignore */ }
  navigateTo(item);
}

async function handleMarkOne(item) {
  try {
    await store.dispatch('notification/markRead', item.id);
    item.is_read = true;
  } catch { /* ignore */ }
}

function markGroupRead(group) {
  group.items.forEach(async (item) => {
    if (!item.is_read) {
      try {
        await store.dispatch('notification/markRead', item.id);
        item.is_read = true;
      } catch { /* ignore */ }
    }
  });
}

// ── 数据获取 ──
async function fetchNotifications() {
  loading.value = true;
  page.value = 1;
  try {
    const res = await getNotificationList({ page: 1, pageSize });
    notifications.value = res.data.list || [];
    total.value = res.data.total || 0;
    hasMore.value = notifications.value.length < total.value;
  } catch {
    notifications.value = [];
    hasMore.value = false;
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value) return;
  loadingMore.value = true;
  try {
    const nextPage = page.value + 1;
    const res = await getNotificationList({ page: nextPage, pageSize });
    const newList = res.data.list || [];
    notifications.value.push(...newList);
    page.value = nextPage;
    hasMore.value = notifications.value.length < (res.data.total || 0);
  } catch { /* silent */ } finally {
    loadingMore.value = false;
  }
}

// ── 批量操作 ──
async function handleMarkAllRead() {
  try {
    await store.dispatch('notification/markAllRead');
    notifications.value.forEach((n) => { n.is_read = true; });
  } catch { /* silent */ }
}

async function handleClearAll() {
  try {
    await ElMessageBox.confirm(
      '清空后所有通知将从列表中移除，确定继续吗？',
      '清空全部通知',
      { confirmButtonText: '确定清空', cancelButtonText: '取消', type: 'warning' },
    );
    await store.dispatch('notification/clearAll');
    notifications.value = [];
    hasMore.value = false;
    total.value = 0;
  } catch { /* user cancelled */ }
}

async function handleDeleteOne(item) {
  try {
    await store.dispatch('notification/deleteOne', item.id);
    const idx = notifications.value.findIndex((n) => n.id === item.id);
    if (idx !== -1) notifications.value.splice(idx, 1);
    total.value = Math.max(0, total.value - 1);
    hasMore.value = notifications.value.length < total.value;
  } catch { /* silent */ }
}

// ── 点击外部关闭 ──
function onDocumentClick(e) {
  if (panelRef.value && !panelRef.value.contains(e.target)) {
    const bell = document.querySelector('.notification-bell');
    if (bell && bell.contains(e.target)) return;
    emit('update:visible', false);
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      fetchNotifications();
      nextTick(() => { panelRef.value?.focus(); });
    }
  },
);

onMounted(() => {
  document.addEventListener('click', onDocumentClick, false);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, false);
});
</script>

<style lang="scss" scoped>
.notification-panel {
  position: absolute;
  top: 50px;
  right: 0;
  width: 400px;
  max-height: 520px;
  background: var(--bg-card);
  border-radius: 14px;
  box-shadow: var(--shadow-dropdown);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  outline: none;
  border: 1px solid var(--border-color);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.panel-badge {
  min-width: 20px;
  height: 20px;
  line-height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  color: var(--text-inverse);
  background: var(--el-color-danger);
  border-radius: 10px;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-body {
  overflow-y: auto;
  flex: 1;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
}

.panel-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--text-secondary);
}

:deep(.el-empty) {
  padding: 40px 0;
}

/* ── 分组 ── */
.notif-group {
  &:not(:last-child) { border-bottom: 1px solid var(--border-light); }
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px 6px;
  position: sticky;
  top: 0;
  background: var(--bg-card);
  z-index: 1;
}

.group-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.group-icon {
  color: var(--text-secondary);
}

.group-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.group-count {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 0 6px;
  background: var(--bg-hover);
  border-radius: 6px;
  line-height: 18px;
}

.group-mark-read {
  font-size: 11px;
  color: var(--text-secondary);
  &:hover { color: var(--el-color-primary); }
}

/* ── 通知卡片 ── */
.notification-card {
  display: flex;
  align-items: flex-start;
  padding: 10px 18px 10px 16px;
  gap: 10px;
  position: relative;
  transition: background 0.15s;

  &:hover { background: var(--bg-hover); }
}

.card-indicator {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  background: transparent;
  transition: background 0.2s;

  &.active {
    background: var(--type-color, var(--el-color-primary));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--type-color, var(--el-color-primary)) 20%, transparent);
  }
}

.card-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}

.card-sender {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-time {
  font-size: 11px;
  color: var(--text-placeholder);
  flex-shrink: 0;
}

.card-title {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-summary {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── 操作区 ── */
.card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding-top: 2px;

  .el-button {
    font-size: 11px;
    padding: 3px 8px;
    height: auto;
    min-height: 0;
    border-radius: 6px;
  }
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border-top: 1px solid var(--border-light);
  flex-shrink: 0;
}
</style>
