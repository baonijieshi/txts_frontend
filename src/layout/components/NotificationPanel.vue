<template>
  <div
    v-if="visible"
    ref="panelRef"
    tabindex="-1"
    class="notification-panel"
    @keydown.escape="emit('update:visible', false)"
  >
    <div class="panel-header">
      <span class="panel-title">通知</span>
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
          <el-icon><Delete /></el-icon>清空全部
        </el-button>
      </div>
    </div>

    <div class="panel-body">
      <div v-if="loading && page === 1" class="panel-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
      </div>

      <el-empty
        v-else-if="notifications.length === 0 && !loading"
        description="暂无通知"
        :image-size="60"
      />

      <template v-else>
        <div
          v-for="item in notifications"
          :key="item.id"
          class="notification-card"
          :class="{ unread: !item.is_read }"
          @click="handleCardClick(item)"
        >
          <div class="card-icon">
            <el-icon :size="18">
              <component :is="getTypeIcon(item.notification_type)" />
            </el-icon>
          </div>
          <div class="card-content">
            <div class="card-header">
              <el-avatar :size="24" :src="item.sender_avatar || ''">
                {{ item.sender_name ? item.sender_name.charAt(0) : '' }}
              </el-avatar>
              <span class="sender-name">{{ item.sender_name || '系统' }}</span>
              <span class="card-time">{{ timeAgo(item.created_at) }}</span>
            </div>
            <div class="card-title">{{ item.title }}</div>
            <div class="card-summary">{{ truncateContent(item.content) }}</div>
          </div>
          <button
            class="card-delete-btn"
            title="删除此通知"
            @click.stop="handleDeleteOne(item)"
          >
            <el-icon :size="14"><Close /></el-icon>
          </button>
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

const hasUnread = computed(() => notifications.value.some((n) => !n.is_read));

// Icon mapping
const iconMap = {
  comment_reply: markRaw(ChatDotRound),
  bug_assigned: markRaw(Warning),
  bug_resolved: markRaw(Warning),
  bug_activated: markRaw(Warning),
  ticket_assigned: markRaw(Tickets),
  story_review: markRaw(Stamp),
};

function getTypeIcon(type) {
  return iconMap[type] || markRaw(ChatDotRound);
}

// Content truncation (Property 8)
function truncateContent(content) {
  if (!content) return '';
  if (content.length > 80) return content.slice(0, 80) + '...';
  return content;
}

// Relative time helper
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

// Route mapping (Property 10)
const routeMap = {
  story: (id) => ({ path: '/story', query: { openId: id } }),
  bug: (id) => ({ path: '/test/bug', query: { openId: id } }),
  ticket: (id) => ({ path: '/delivery/ticket', query: { openId: id } }),
  okr: () => ({ path: '/okr' }),
};

// Load notifications when panel becomes visible
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

// Load more (pagination)
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
  } catch {
    // 静默忽略
  } finally {
    loadingMore.value = false;
  }
}

// Card click: mark read + navigate
async function handleCardClick(item) {
  try {
    if (!item.is_read) {
      await store.dispatch('notification/markRead', item.id);
      item.is_read = true;
    }
  } catch {
    // markRead 失败不阻塞导航
  }

  const routeFn = routeMap[item.source_type];
  if (routeFn) {
    router.push(routeFn(item.source_id)).catch(() => {
      // 路由跳转失败，静默忽略
    });
  }

  emit('update:visible', false);
}

// Mark all as read
async function handleMarkAllRead() {
  try {
    await store.dispatch('notification/markAllRead');
    notifications.value.forEach((n) => { n.is_read = true; });
  } catch {
    // 错误消息由全局拦截器统一处理
  }
}

// Clear all notifications
async function handleClearAll() {
  try {
    await ElMessageBox.confirm(
      '清空后所有通知将从列表中移除，确定继续吗？',
      '清空全部通知',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
    await store.dispatch('notification/clearAll');
    notifications.value = [];
    hasMore.value = false;
    total.value = 0;
  } catch {
    // 用户取消或请求失败
  }
}

// Delete single notification
async function handleDeleteOne(item) {
  try {
    await store.dispatch('notification/deleteOne', item.id);
    const idx = notifications.value.findIndex((n) => n.id === item.id);
    if (idx !== -1) {
      notifications.value.splice(idx, 1);
    }
    total.value = Math.max(0, total.value - 1);
    hasMore.value = notifications.value.length < total.value;
  } catch {
    // 错误由全局拦截器处理
  }
}

// Click outside detection
function onDocumentClick(e) {
  if (panelRef.value && !panelRef.value.contains(e.target)) {
    // Check if click is on the bell (parent handles toggle)
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
      nextTick(() => {
        panelRef.value?.focus();
      });
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
  width: 380px;
  max-height: 480px;
  background: var(--bg-card);
  border-radius: 8px;
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
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;

  .panel-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.panel-body {
  max-height: 400px;
  overflow-y: auto;
  flex: 1;
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

.notification-card {
  display: flex;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid var(--border-light);
  position: relative;

  &:hover {
    background-color: var(--bg-hover);
  }

  &:last-child {
    border-bottom: none;
  }

  &.unread {
    background-color: var(--color-primary-light, #ecf5ff);

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background-color: var(--color-primary);
      border-radius: 0 2px 2px 0;
      transition: opacity 0.3s ease;
    }
  }

  &:not(.unread)::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: transparent;
    border-radius: 0 2px 2px 0;
    transition: opacity 0.3s ease;
    opacity: 0;
  }

  .card-icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: var(--bg-elevated);
    margin-right: 10px;
    margin-top: 2px;
    color: var(--text-regular);
  }

  .card-content {
    flex: 1;
    min-width: 0;

    .card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;

      .sender-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary);
      }

      .card-time {
        margin-left: auto;
        font-size: 12px;
        color: var(--text-secondary);
        white-space: nowrap;
      }
    }

    .card-title {
      font-size: 13px;
      color: var(--text-primary);
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-summary {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.4;
      word-break: break-all;
    }
  }

  .card-delete-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: var(--bg-hover);
    border-radius: 50%;
    cursor: pointer;
    color: var(--text-secondary);
    opacity: 0;
    transition: opacity 0.2s, background-color 0.2s;

    &:hover {
      background: var(--el-color-danger-light-9);
      color: var(--el-color-danger);
    }
  }

  &:hover .card-delete-btn {
    opacity: 1;
  }
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}
</style>
