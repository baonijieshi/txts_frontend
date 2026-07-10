<template>
  <div class="reply-item">
    <div class="comment-body">
      <div class="comment-author-info">
        <img
          v-if="reply.author_avatar"
          :src="reply.author_avatar"
          class="comment-avatar reply-avatar"
          alt="avatar"
        >
        <div v-else class="comment-avatar reply-avatar comment-avatar-default">
          {{ (reply.author_name || '匿')[0] }}
        </div>
        <span class="comment-author">
          {{ reply.author_name || '匿名' }}
          <span v-if="reply.reply_to_name" class="reply-to-label">
            回复 {{ reply.reply_to_name }}
          </span>
        </span>
      </div>
      <el-tooltip :content="formatTime(reply.created_at)" placement="top">
        <span class="comment-time">{{ timeAgo(reply.created_at) }}</span>
      </el-tooltip>
    </div>

    <!-- 编辑模式 -->
    <div v-if="editingId === reply.id" class="edit-input" @click.stop>
      <el-input
        :model-value="editContent"
        type="textarea"
        :rows="2"
        resize="none"
        size="small"
        @input="$emit('update:editContent', $event)"
      />
      <div class="edit-input-actions">
        <el-button size="small" @click.stop="$emit('cancelEdit')">取消</el-button>
        <el-button
          size="small"
          type="primary"
          :disabled="!editContent.trim()"
          @click.stop="$emit('saveEdit', reply.id)"
        >保存</el-button>
      </div>
    </div>
    <div v-else class="comment-content reply-content">{{ reply.content }}</div>

    <div class="reply-item-actions">
      <template v-if="reply.author === currentUserId">
        <el-button size="small" link type="primary" @click.stop="$emit('edit', reply)">编辑</el-button>
        <el-button size="small" link type="danger" @click.stop="$emit('delete', reply.id)">删除</el-button>
      </template>
      <el-button v-else size="small" link type="primary" @click.stop="$emit('reply', reply, rootId)">回复</el-button>
    </div>

    <!-- 递归渲染更深层回复：前 3 级缩进，第 4 级起封顶扁平 -->
    <div
      v-if="reply.replies && reply.replies.length"
      :class="depth < 3 ? 'reply-list' : 'reply-list-flat'"
    >
      <CommentReplyItem
        v-for="sr in reply.replies"
        :key="sr.id"
        :reply="sr"
        :root-id="rootId"
        :depth="depth + 1"
        :editing-id="editingId"
        :edit-content="editContent"
        :current-user-id="currentUserId"
        @edit="(r) => $emit('edit', r)"
        @delete="(id) => $emit('delete', id)"
        @reply="(r, rid) => $emit('reply', r, rid)"
        @save-edit="(id) => $emit('saveEdit', id)"
        @cancel-edit="$emit('cancelEdit')"
        @update:edit-content="(v) => $emit('update:editContent', v)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  reply: { type: Object, required: true },
  rootId: { type: Number, required: true },
  depth: { type: Number, default: 1 },
  editingId: { type: Number, default: null },
  editContent: { type: String, default: '' },
  currentUserId: { type: Number, default: null },
});

defineEmits([
  'reply', 'edit', 'delete',
  'saveEdit', 'cancelEdit', 'update:editContent',
]);

const formatTime = (t: string) => {
  if (!t) return '';
  return t.slice(0, 16).replace('T', ' ');
};

const timeAgo = (dateStr: string) => {
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
};
</script>

<style scoped lang="scss">
.reply-list {
  margin-top: 8px;
  padding-left: 12px;
  border-left: 2px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

// 深度 >= 3 时封顶缩进，不再叠加左边框
.reply-list-flat {
  margin-top: 6px;
  padding-left: 0;
  border-left: none;
  display: flex;
  flex-direction: column;
  gap: 6px;

  // 扁平项之间用细线分隔
  > .reply-item + .reply-item {
    padding-top: 8px;
    border-top: 1px solid var(--border-light);
  }
}

.reply-item {
  position: relative;
  padding: 6px 8px;
  background: var(--bg-elevated);
  border-radius: 4px;
  transition: background 0.2s;

  &:hover {
    background: var(--bg-hover);
  }
}

.reply-avatar {
  width: 20px !important;
  height: 20px !important;
  font-size: 11px !important;
}

.reply-content {
  font-size: 12px;
  padding-left: 26px;
}

.reply-to-label {
  font-weight: 400;
  color: var(--text-secondary);
  font-size: 11px;
  margin-left: 2px;
}

.reply-item-actions {
  display: flex;
  gap: 2px;
  margin-top: 2px;
  padding-left: 26px;
  opacity: 0;
  transition: opacity 0.2s;

  .reply-item:hover & {
    opacity: 1;
  }
}

.edit-input {
  margin: 4px 0;
}

.edit-input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
}

.comment-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.comment-author-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.comment-author {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.comment-time {
  font-size: 11px;
  color: var(--text-secondary);
}

.comment-content {
  font-size: 13px;
  color: var(--text-regular);
  line-height: 1.5;
  word-break: break-all;
}

.comment-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.comment-avatar-default {
  background: var(--el-color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
</style>
