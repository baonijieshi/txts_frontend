<template>
  <el-dialog
    :model-value="visible"
    width="85%"
    align-center
    :show-close="true"
    destroy-on-close
    class="story-detail-dialog"
    @update:model-value="$emit('update:visible', $event)"
    @open="onOpen"
  >
    <template #header>
      <div class="dialog-header" v-if="row">
        <div class="header-row">
          <div class="header-left">
            <span class="dialog-title">{{ row.title }}</span>
            <el-tag :type="statusType(row.status)" size="small" effect="dark" round>{{ row.status }}</el-tag>
          </div>
          <div class="header-right">
            <el-button type="primary" @click="handleCreateVersion">
              <el-icon><FolderAdd /></el-icon>创建关联版本
            </el-button>
            <template v-if="canReview">
              <el-button
                v-for="btn in reviewButtons"
                :key="btn.action"
                :type="btn.type"
                @click="openReviewDialog(btn.action)"
              >
                {{ btn.label }}
              </el-button>
            </template>
          </div>
        </div>
      </div>
    </template>

    <template v-if="row">
      <div class="detail-layout">
        <!-- 左侧：元数据 -->
        <div class="detail-meta">
          <div class="meta-section">
            <div class="meta-section__title">基本信息</div>
            <div class="meta-row">
              <span class="meta-label">产品</span>
              <span class="meta-value">{{ row.product_name || '-' }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">优先级</span>
              <span class="tag-chip" :class="'tag-priority-' + row.priority">{{ row.priority }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">状态</span>
              <span class="tag-chip" :class="'tag-status-' + row.status">{{ row.status }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">预估工时</span>
              <span class="meta-value">{{ row.estimate || '未填写' }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">创建时间</span>
              <span class="meta-value meta-value--time">{{ row.created_at }}</span>
            </div>
          </div>

          <div class="meta-section">
            <div class="meta-section__title">人员信息</div>
            <div class="member-chip" v-if="row.creator_name">
              <img v-if="row.creator_avatar" :src="row.creator_avatar" class="member-chip__avatar" alt="" />
              <span v-else class="member-chip__avatar member-chip__avatar--text">{{ row.creator_name[0] }}</span>
              <div class="member-chip__text">
                <span class="member-chip__role">创建人</span>
                <span class="member-chip__name">{{ row.creator_name }}</span>
              </div>
            </div>
            <div class="member-chip" v-if="row.assignee_name">
              <img v-if="row.assignee_avatar" :src="row.assignee_avatar" class="member-chip__avatar" alt="" />
              <span v-else class="member-chip__avatar member-chip__avatar--text">{{ row.assignee_name[0] }}</span>
              <div class="member-chip__text">
                <span class="member-chip__role">指派给</span>
                <span class="member-chip__name">{{ row.assignee_name }}</span>
              </div>
            </div>
          </div>

          <div class="meta-section">
            <div class="meta-section__title">审核信息</div>
            <div class="meta-row">
              <span class="meta-label">审核状态</span>
              <span class="tag-chip" :class="'tag-review-' + (row.review_status || '未提交')">{{ row.review_status || '未提交' }}</span>
            </div>
            <div class="member-chip" v-if="row.product_reviewer_name">
              <img v-if="row.product_reviewer_avatar" :src="row.product_reviewer_avatar" class="member-chip__avatar" alt="" />
              <span v-else class="member-chip__avatar member-chip__avatar--text">{{ row.product_reviewer_name[0] }}</span>
              <div class="member-chip__text">
                <span class="member-chip__role">产品审核人</span>
                <span class="member-chip__name">{{ row.product_reviewer_name }}</span>
              </div>
            </div>
            <div class="member-chip" v-if="row.tech_reviewer_name">
              <img v-if="row.tech_reviewer_avatar" :src="row.tech_reviewer_avatar" class="member-chip__avatar" alt="" />
              <span v-else class="member-chip__avatar member-chip__avatar--text">{{ row.tech_reviewer_name[0] }}</span>
              <div class="member-chip__text">
                <span class="member-chip__role">技术审核人</span>
                <span class="member-chip__name">{{ row.tech_reviewer_name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 中间：描述内容 -->
        <div class="detail-desc" @mouseup="onTextSelect">
          <div class="desc-title">需求描述</div>
          <div
            v-if="row.description"
            ref="descRef"
            class="desc-content"
            v-html="highlightedDesc"
          />
          <div v-else class="desc-empty">暂无描述</div>

          <!-- 划线气泡 -->
          <div
            v-if="selectionPopup.visible"
            class="selection-popup"
            :style="{ top: selectionPopup.y + 'px', left: selectionPopup.x + 'px' }"
          >
            <el-button size="small" type="warning" @click="openCommentInput">
              <el-icon><EditPen /></el-icon>划线评论
            </el-button>
          </div>
        </div>

        <!-- 可拖拽分隔条 -->
        <div
          class="resize-handle"
          :class="{ 'is-active': resizeActive }"
          @mousedown="onResizeStart"
        />

        <!-- 右侧：评论面板 -->
        <div
          ref="commentPanelRef"
          class="comment-panel"
          :style="{ flex: `0 0 ${commentPanelWidth}px` }"
        >
          <div class="comment-panel-title">
            评论
            <el-badge :value="comments.length" :max="99" type="primary" />
          </div>

          <!-- 审核历史 -->
          <el-collapse v-if="reviews.length" class="review-collapse">
            <el-collapse-item title="审核记录" name="review">
              <el-timeline>
                <el-timeline-item
                  v-for="r in reviews"
                  :key="r.id"
                  :timestamp="formatTime(r.created_at)"
                  :type="reviewActionType(r.action)"
                  :hollow="true"
                  size="small"
                >
                  <div class="review-item">
                    <span class="review-action-label" :class="'action-' + r.action">
                      {{ r.action }}
                    </span>
                    <div class="review-reviewer">
                      <img v-if="r.reviewer_avatar" :src="r.reviewer_avatar" class="review-avatar" alt="avatar" />
                      <span v-else class="review-avatar review-avatar--text">{{ (r.reviewer_name || '系')[0] }}</span>
                      <span>{{ r.reviewer_name || '系统' }}</span>
                    </div>
                  </div>
                  <div v-if="r.comment" class="review-comment">{{ r.comment }}</div>
                </el-timeline-item>
              </el-timeline>
            </el-collapse-item>
          </el-collapse>

          <div class="comment-input-area">
            <el-input
              v-model="newComment"
              type="textarea"
              :rows="2"
              placeholder="发表评论..."
              resize="none"
            />
            <div class="comment-input-footer">
              <el-button
                type="primary"
                size="small"
                :disabled="!newComment.trim()"
                @click="submitComment(null)"
              >发表</el-button>
            </div>
          </div>

          <div class="comment-list">
            <div
              v-for="c in comments"
              :key="c.id"
              class="comment-item"
              :class="{ 'is-quote': c.quote_text, 'is-active': activeQuoteId === c.quote_id, 'is-clickable': !!c.quote_id }"
              @click="c.quote_id && scrollToQuote(c)"
            >
              <div v-if="c.quote_text" class="comment-quote">
                <el-icon><ChatLineSquare /></el-icon>
                <span>{{ c.quote_text }}</span>
              </div>
              <div class="comment-body">
                <div class="comment-author-info">
                  <img
                    v-if="c.author_avatar"
                    :src="c.author_avatar"
                    class="comment-avatar"
                    alt="avatar"
                  >
                  <div v-else class="comment-avatar comment-avatar-default">
                    {{ (c.author_name || '匿')[0] }}
                  </div>
                  <span class="comment-author">{{ c.author_name || '匿名' }}</span>
                </div>
                <el-tooltip :content="formatTime(c.created_at)" placement="top">
                  <span class="comment-time">{{ timeAgo(c.created_at) }}</span>
                </el-tooltip>
              </div>

              <!-- 编辑模式 -->
              <div v-if="editingId === c.id" class="edit-input" @click.stop>
                <el-input
                  v-model="editContent"
                  type="textarea"
                  :rows="2"
                  resize="none"
                  size="small"
                />
                <div class="edit-input-actions">
                  <el-button size="small" @click.stop="cancelEdit">取消</el-button>
                  <el-button size="small" type="primary" :disabled="!editContent.trim()" @click.stop="saveEdit(c.id)">保存</el-button>
                </div>
              </div>
              <div v-else class="comment-content">{{ c.content }}</div>

              <div class="comment-actions">
                <template v-if="c.author === currentUserId">
                  <el-button size="small" link type="primary" @click.stop="toggleEdit(c)">编辑</el-button>
                  <el-button size="small" link type="danger" @click.stop="deleteComment(c.id)">删除</el-button>
                </template>
                <el-button v-else size="small" link type="primary" @click.stop="toggleReply(c, null)">回复</el-button>
              </div>

              <!-- 回复列表（递归组件支持任意深度嵌套） -->
              <CommentReplyItem
                v-for="r in c.replies"
                :key="r.id"
                :reply="r"
                :root-id="c.id"
                :depth="1"
                :editing-id="editingId"
                :edit-content="editContent"
                :current-user-id="currentUserId"
                @reply="(reply, rootId) => toggleReply(reply, rootId)"
                @edit="toggleEdit"
                @delete="deleteComment"
                @save-edit="saveEdit"
                @cancel-edit="cancelEdit"
                @update:edit-content="editContent = $event"
              />

              <!-- 回复输入框 -->
              <div v-if="replyingTo === c.id || replyingRoot === c.id" class="reply-input" @click.stop>
                <div v-if="replyingToName" class="replying-hint">
                  回复 {{ replyingToName }}
                  <el-button size="small" link @click.stop="cancelReply">取消</el-button>
                </div>
                <el-input
                  v-model="replyContent"
                  type="textarea"
                  :rows="2"
                  :placeholder="replyingToName ? `回复 ${replyingToName}...` : '回复评论...'"
                  resize="none"
                  size="small"
                />
                <div class="reply-input-actions">
                  <el-button size="small" @click.stop="cancelReply">取消</el-button>
                  <el-button
                    size="small"
                    type="primary"
                    :disabled="!replyContent.trim()"
                    @click.stop="submitReply(replyingTo)"
                  >回复</el-button>
                </div>
              </div>
            </div>
            <div v-if="!comments.length" class="comment-empty">
              <el-icon :size="32"><ChatDotRound /></el-icon>
              <p>还没有评论，快来参与讨论吧</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 划线评论输入弹窗 -->
    <el-dialog
      v-model="quoteDialogVisible"
      title="划线评论"
      width="420px"
      append-to-body
      destroy-on-close
    >
      <div class="quote-preview">
        <el-icon><ChatLineSquare /></el-icon>
        <span>{{ pendingQuote.text }}</span>
      </div>
      <el-input
        v-model="pendingQuote.comment"
        type="textarea"
        :rows="3"
        placeholder="请输入评论内容..."
        style="margin-top: 12px"
      />
      <template #footer>
        <el-button @click="quoteDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!pendingQuote.comment.trim()"
          @click="submitComment(pendingQuote)"
        >提交</el-button>
      </template>
    </el-dialog>

    <el-image-viewer
      v-if="previewVisible"
      :url-list="previewList"
      :initial-index="previewIndex"
      @close="previewVisible = false"
    />

    <!-- 审核意见弹窗 -->
    <el-dialog
      v-model="reviewDialogVisible"
      :title="reviewAction"
      width="420px"
      append-to-body
      destroy-on-close
    >
      <el-input
        v-model="reviewComment"
        type="textarea"
        :rows="3"
        :placeholder="reviewAction === '重新提交' ? '重新提交说明（可选）' : '审核意见（可选）'"
      />
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button :type="reviewAction.includes('驳回') ? 'danger' : 'primary'" :loading="reviewLoading" @click="submitReview">
          确定
        </el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, watch, nextTick, computed,
} from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getStoryComments, createStoryComment, deleteStoryComment, updateStoryComment,
  reviewStory, getStoryReviews,
} from '@/api/story';
import CommentReplyItem from './CommentReplyItem.vue';

const props = defineProps({
  visible: Boolean,
  row: { type: Object, default: null },
});

const emit = defineEmits(['update:visible', 'reviewed']);

const router = useRouter();
const store = useStore();
const currentUserId = computed(() => store.getters.userId);
const descRef = ref(null);
const previewVisible = ref(false);
const previewList = ref([]);
const previewIndex = ref(0);

// ---- 评论 ----
const comments = ref([]);
const newComment = ref('');
const activeQuoteId = ref(null);
const editingId = ref(null);
const editContent = ref('');

const fetchComments = async () => {
  if (!props.row || !props.row.id) return;
  try {
    const res = await getStoryComments(props.row.id);
    comments.value = res.data || [];
  } catch (e) {
    // 获取评论失败
  }
};

const onOpen = () => {
  fetchComments();
  fetchReviews();
};

const submitComment = async (quoteData) => {
  const content = quoteData ? quoteData.comment : newComment.value;
  if (!content.trim()) return;
  const payload = {
    content: content.trim(),
    quote_text: quoteData ? quoteData.text : '',
    quote_id: quoteData ? quoteData.id : '',
  };
  newComment.value = '';
  quoteDialogVisible.value = false;
  try {
    const res = await createStoryComment(props.row.id, payload);
    // 乐观更新：本地插入新评论
    if (res.data) {
      comments.value.unshift(res.data);
    }
    await fetchComments();
  } catch (e) {
    ElMessage.error('评论失败');
  }
};

// ---- 回复 ----
const replyingTo = ref(null);
const replyingRoot = ref(null);
const replyingToName = ref('');
const replyContent = ref('');

const toggleReply = (comment, rootId) => {
  // comment 可以是顶级评论或回复，rootId 是所属顶级评论的 id
  const targetId = comment.id;
  const root = rootId || targetId;
  if (replyingTo.value === targetId) {
    replyingTo.value = null;
    replyingRoot.value = null;
    replyingToName.value = '';
    replyContent.value = '';
    return;
  }
  replyingTo.value = targetId;
  replyingRoot.value = root;
  replyingToName.value = comment.author_name || '';
  replyContent.value = '';
  // 自动聚焦回复输入框
  nextTick(() => {
    const textarea = document.querySelector('.reply-input textarea');
    if (textarea) textarea.focus();
  });
};

const cancelReply = () => {
  replyingTo.value = null;
  replyingRoot.value = null;
  replyingToName.value = '';
  replyContent.value = '';
};

const submitReply = async (parentId) => {
  if (!replyContent.value.trim()) return;
  const payload = {
    content: replyContent.value.trim(),
    parent_id: parentId,
  };
  const rootId = replyingRoot.value;
  cancelReply();
  try {
    const res = await createStoryComment(props.row.id, payload);
    // 乐观更新：本地插入回复
    if (res.data) {
      const rootComment = comments.value.find((c) => c.id === rootId || c.replies?.some((r) => r.id === parentId));
      if (rootComment) {
        if (!rootComment.replies) rootComment.replies = [];
        rootComment.replies.push(res.data);
      }
    }
    await fetchComments();
  } catch (e) {
    ElMessage.error('回复失败');
  }
};

const deleteComment = (id) => {
  ElMessageBox.confirm('确定删除该评论？', '提示', { type: 'warning' })
    .then(async () => {
      await deleteStoryComment(id);
      await fetchComments();
    })
    .catch(() => {});
};

const formatTime = (t) => {
  if (!t) return '';
  return t.slice(0, 16).replace('T', ' ');
};

const timeAgo = (dateStr) => {
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

// ---- 编辑评论 ----
const toggleEdit = (comment) => {
  if (editingId.value === comment.id) {
    editingId.value = null;
    editContent.value = '';
    return;
  }
  editingId.value = comment.id;
  editContent.value = comment.content;
};

const saveEdit = async (commentId) => {
  if (!editContent.value.trim()) return;
  try {
    await updateStoryComment(commentId, { content: editContent.value.trim() });
    editingId.value = null;
    editContent.value = '';
    await fetchComments();
  } catch (e) {
    ElMessage.error('编辑失败');
  }
};

const cancelEdit = () => {
  editingId.value = null;
  editContent.value = '';
};

// ---- 评论面板拖拽调整宽度 ----
const commentPanelRef = ref(null);
const resizeActive = ref(false);
const commentPanelWidth = ref(340);

const onResizeStart = (e: MouseEvent) => {
  resizeActive.value = true;
  const startX = e.clientX;
  const startWidth = commentPanelWidth.value;

  const onMove = (ev: MouseEvent) => {
    const delta = startX - ev.clientX;
    const newWidth = Math.max(260, Math.min(500, startWidth + delta));
    commentPanelWidth.value = newWidth;
  };

  const onUp = () => {
    resizeActive.value = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};

// ---- 划线 ----
const selectionPopup = ref({
  visible: false, x: 0, y: 0,
});
const pendingQuote = ref({
  text: '', id: '', comment: '',
});
const quoteDialogVisible = ref(false);

const onTextSelect = () => {
  const sel = window.getSelection();
  const text = sel ? sel.toString().trim() : '';
  if (!text || !descRef.value || !descRef.value.contains(sel.anchorNode)) {
    selectionPopup.value.visible = false;
    return;
  }
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const containerRect = descRef.value.getBoundingClientRect();
  selectionPopup.value = {
    visible: true,
    x: rect.left - containerRect.left + rect.width / 2 - 50,
    y: rect.top - containerRect.top - 40,
  };
  pendingQuote.value = {
    text,
    id: 'q_'.concat(String(Date.now())),
    comment: '',
  };
};

const openCommentInput = () => {
  selectionPopup.value.visible = false;
  const sel = window.getSelection();
  if (sel) sel.removeAllRanges();
  quoteDialogVisible.value = true;
};

// ---- 高亮渲染 ----
const autoLink = (html) => html.replace(
  /(?<!['"=])(https?:\/\/[^\s<>"']+)/g,
  '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
);

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildHighlightedHtml = (html, commentList) => {
  let result = html;
  commentList.forEach((c) => {
    if (!c.quote_text) return;
    const re = new RegExp('('.concat(escapeRegex(c.quote_text), ')'), 'g');
    result = result.replace(
      re,
      '<mark class="story-highlight" data-quote-id="'.concat(c.quote_id, '" title="', c.content, '">$1</mark>'),
    );
  });
  return result;
};

const highlightedDesc = computed(() => {
  const desc = props.row ? props.row.description : '';
  if (!desc) return '';
  return buildHighlightedHtml(autoLink(desc), comments.value);
});

const renderHighlights = async () => {
  await nextTick();
  if (!descRef.value) return;
  const imgs = descRef.value.querySelectorAll('img');
  const urls = Array.from(imgs).map((img) => img.src);
  imgs.forEach((img, i) => {
    img.style.cursor = 'zoom-in';
    img.onclick = () => {
      previewList.value = urls;
      previewIndex.value = i;
      previewVisible.value = true;
    };
  });
  descRef.value.querySelectorAll('.story-highlight').forEach((el) => {
    el.onclick = () => {
      activeQuoteId.value = el.dataset.quoteId;
    };
  });
};

const scrollToQuote = (c) => {
  if (!c.quote_id) return;
  activeQuoteId.value = c.quote_id;
  const el = descRef.value
    ? descRef.value.querySelector('[data-quote-id="'.concat(c.quote_id, '"]'))
    : null;
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

watch(highlightedDesc, () => {
  renderHighlights();
});

watch(() => props.visible, (val) => {
  if (!val) {
    selectionPopup.value.visible = false;
    activeQuoteId.value = null;
    comments.value = [];
    replyingTo.value = null;
    replyingRoot.value = null;
    replyingToName.value = '';
    replyContent.value = '';
    editingId.value = null;
    editContent.value = '';
  }
});

const priorityType = (p) => ({ 高: 'danger', 中: 'warning', 低: 'info' }[p] || 'info');
const statusType = (s) => ({
  激活: 'primary', 开发中: 'warning', 已完成: 'success', 已关闭: 'info',
}[s] || 'info');

// ---- 审核 ----
const reviews = ref([]);
const reviewDialogVisible = ref(false);
const reviewAction = ref('');
const reviewComment = ref('');
const reviewLoading = ref(false);

const reviewStatusType = (s) => {
  const map = {
    待评审: 'warning',
    产品审核中: 'primary',
    技术审核中: 'primary',
    已通过: 'success',
    已驳回: 'danger',
  };
  return map[s] || 'info';
};

const fetchReviews = async () => {
  if (!props.row || !props.row.id) return;
  try {
    const res = await getStoryReviews(props.row.id);
    reviews.value = res.data || [];
  } catch { /* ignore */ }
};

const canReview = computed(() => {
  if (!props.row) return false;
  const rs = props.row.review_status;
  const uid = currentUserId.value;
  // 待评审：产品审核人操作；若未设置审核人，创建人可代为操作
  if (rs === '待评审') return uid && (uid === props.row.product_reviewer || (!props.row.product_reviewer && uid === props.row.creator));
  // 未提交：无审核人，不可审核（需先编辑添加审核人）
  // 产品审核中：仅技术审核人可操作
  if (rs === '产品审核中') return uid && uid === props.row.tech_reviewer;
  // 已驳回：仅创建人可重新提交
  if (rs === '已驳回') return uid && uid === props.row.creator;
  return false;
});

const reviewButtons = computed(() => {
  const rs = props.row ? props.row.review_status : '';
  if (rs === '待评审') return [{ action: '产品通过', label: '产品通过', type: 'success' }, { action: '产品驳回', label: '产品驳回', type: 'danger' }];
  // 未提交：不显示审核按钮（需先编辑添加审核人）
  if (rs === '产品审核中') return [{ action: '技术通过', label: '技术通过', type: 'success' }, { action: '技术驳回', label: '技术驳回', type: 'danger' }];
  if (rs === '已驳回') return [{ action: '重新提交', label: '重新提交', type: 'primary' }];
  return [];
});

const openReviewDialog = (action) => {
  reviewAction.value = action;
  reviewComment.value = '';
  reviewDialogVisible.value = true;
};

const submitReview = async () => {
  reviewLoading.value = true;
  try {
    const res = await reviewStory(props.row.id, {
      action: reviewAction.value,
      comment: reviewComment.value,
    });
    ElMessage.success('操作成功');
    reviewDialogVisible.value = false;
    // 用后端返回的最新数据更新当前行，审核按钮即时消失
    if (res.data) {
      Object.assign(props.row, res.data);
    }
    fetchReviews();
    // 通知父组件刷新列表
    emit('reviewed');
  } catch (e) {
    ElMessage.error('操作失败');
  } finally { reviewLoading.value = false; }
};

const reviewActionType = (action) => {
  if (action.includes('通过') || action === '重新提交') return 'success';
  if (action.includes('驳回')) return 'danger';
  return 'primary';
};

const handleCreateVersion = () => {
  emit('update:visible', false);
  router.push({
    path: '/project/versions',
    query: {
      storyId: props.row.id, storyTitle: props.row.title,
    },
  });
};
</script>

<style>
.story-detail-dialog .el-dialog__body {
  padding: 0 24px 20px;
  height: calc(78vh - 55px);
  max-height: calc(78vh - 55px);
  overflow: hidden;
  box-sizing: border-box;
}

.story-detail-dialog {
  :deep(.el-dialog__header) {
    padding: 18px 24px 12px;
    margin-right: 0;
    border-bottom: 1px solid var(--border-color);
  }
}
</style>

<style scoped lang="scss">
/* ── 弹窗头部 ── */
.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;

  .dialog-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-chip {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  padding: 2px 10px;
  border-radius: 12px;
}

/* ── 三栏布局 ── */
.detail-layout {
  display: flex;
  gap: 0;
  height: calc(78vh - 145px);
}

/* ── 左侧元数据 ── */
.detail-meta {
  flex: 0 0 200px;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
  padding-right: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.meta-section {
  &__title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border-light);
  }
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 13px;

  .meta-label {
    color: var(--text-secondary);
    font-size: 12px;
    flex-shrink: 0;
  }

  .meta-value {
    color: var(--text-primary);
    font-weight: 500;
    font-size: 13px;
    text-align: right;

    &--time {
      font-size: 11px;
      color: var(--text-secondary);
      font-weight: 400;
    }
  }
}

/* ── 人员芯片 ── */
.member-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;

  &__avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;

    &--text {
      background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-5));
      color: var(--text-inverse);
      font-size: 11px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }

  &__text {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
  }

  &__role {
    font-size: 10px;
    color: var(--text-secondary);
  }

  &__name {
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 500;
  }
}

/* ── 自定义标签（与列表页统一）── */
.tag-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

/* 优先级 */
.tag-priority-高 { background: var(--el-color-danger-light-9); color: var(--el-color-danger-dark-2); border: 1px solid var(--el-color-danger-light-5); }
.tag-priority-中 { background: var(--el-color-warning-light-9); color: var(--el-color-warning-dark-2); border: 1px solid var(--el-color-warning-light-5); }
.tag-priority-低 { background: var(--el-color-primary-light-9); color: var(--el-color-primary-dark-2); border: 1px solid var(--el-color-primary-light-5); }

/* 状态 */
.tag-status-新建   { background: var(--el-color-primary-light-9); color: var(--el-color-primary); border-radius: 10px; }
.tag-status-开发中 { background: var(--el-color-warning-light-9); color: var(--el-color-warning-dark-2); border-radius: 10px; }
.tag-status-已完成 { background: var(--el-color-success-light-9); color: var(--el-color-success-dark-2); border-radius: 10px; }
.tag-status-已关闭 { background: var(--bg-elevated); color: var(--text-secondary); border-radius: 10px; }

/* 审核状态 */
.tag-review-待评审     { background: var(--el-color-warning-light-9); color: var(--el-color-warning-dark-2); border: 1px solid var(--el-color-warning-light-5); }
.tag-review-未提交     { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border-color); }
.tag-review-产品审核中 { background: var(--el-color-primary-light-9); color: var(--el-color-primary-dark-2); border: 1px solid var(--el-color-primary-light-5); }
.tag-review-技术审核中 { background: var(--el-color-primary-light-9); color: var(--el-color-primary-dark-2); border: 1px solid var(--el-color-primary-light-5); }
.tag-review-已通过     { background: var(--el-color-success-light-9); color: var(--el-color-success-dark-2); border: 1px solid var(--el-color-success-light-5); }
.tag-review-已驳回     { background: var(--el-color-danger-light-9); color: var(--el-color-danger-dark-2); border: 1px solid var(--el-color-danger-light-5); }

.detail-desc {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  padding: 0 20px;
  position: relative;
  user-select: text;
}

.desc-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.desc-content {
  padding: 4px 0;
  line-height: 1.8;
  font-size: 14px;
  color: var(--text-primary);

  :deep(.story-highlight) {
    background: var(--el-color-primary-light-7);
    border-bottom: 2px solid var(--el-color-primary);
    cursor: pointer;
    border-radius: 2px;
    transition: background 0.2s;

    &:hover {
      background: var(--el-color-primary-light-5);
    }
  }

  :deep(img) {
    max-width: 400px;
    max-height: 300px;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 4px;
    cursor: zoom-in;
    vertical-align: top;
    border: 1px solid var(--border-color);

    &:hover {
      opacity: 0.85;
      border-color: var(--el-color-primary);
    }
  }

  :deep(p) { margin: 6px 0; }
  :deep(h1) { font-size: 1.8em; margin: 16px 0 8px; font-weight: 700; }
  :deep(h2) { font-size: 1.5em; margin: 14px 0 7px; font-weight: 700; }
  :deep(h3) { font-size: 1.25em; margin: 12px 0 6px; font-weight: 600; }
  :deep(ul) { padding-left: 20px; margin: 6px 0; list-style-type: disc; }
  :deep(ol) { padding-left: 20px; margin: 6px 0; list-style-type: decimal; }
  :deep(li) { margin: 3px 0; }
  :deep(strong) { font-weight: 700; }
  :deep(em) { font-style: italic; }

  :deep(blockquote) {
    border-left: 4px solid var(--border-color);
    padding: 4px 12px;
    color: var(--text-secondary);
    margin: 8px 0;
    background: var(--bg-elevated);
  }

  :deep(pre) {
    background: var(--bg-elevated);
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 8px 0;

    code {
      background: none;
      padding: 0;
      font-size: 13px;
    }
  }

  :deep(a) {
    color: var(--el-color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;

    th,
    td {
      border: 1px solid var(--border-color);
      padding: 6px 12px;
    }

    th {
      background: var(--bg-elevated);
      font-weight: 600;
    }
  }

  :deep(code) {
    background: var(--bg-elevated);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 13px;
    color: var(--el-color-danger);
  }
}

.desc-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-placeholder);
  font-size: 13px;
}

.selection-popup {
  position: absolute;
  z-index: 100;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 6px;
  box-shadow: var(--shadow-dropdown);
  white-space: nowrap;
}

// 可拖拽分隔条（描述 ⇄ 评论之间）
.resize-handle {
  flex: 0 0 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s;
  user-select: none;
  position: relative;

  &:hover,
  &.is-active {
    background: var(--el-color-primary-light-5);
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -3px;
    right: -3px;
    bottom: 0;
  }
}

.comment-panel {
  flex: 0 0 340px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-color);
  padding-left: 16px;
}

.comment-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.comment-input-area {
  flex-shrink: 0;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.comment-input-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

.comment-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-item {
  position: relative;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: var(--border-heavy);
    box-shadow: var(--shadow-card);
  }

  &.is-active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.is-quote {
    border-left: 3px solid var(--el-color-primary);
  }

  &.is-clickable {
    cursor: pointer;
  }
}

.comment-quote {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border-radius: 3px;
  padding: 4px 6px;
  margin-bottom: 6px;
  line-height: 1.5;

  span {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
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

.comment-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.comment-avatar-default {
  background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-5));
  color: var(--text-inverse);
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
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

.comment-actions {
  display: flex;
  gap: 2px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.2s;

  .comment-item:hover &,
  .reply-item:hover & {
    opacity: 1;
  }
}

.edit-input {
  margin: 4px 0;

  .edit-input-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 6px;
  }
}

.reply-list {
  margin-top: 8px;
  padding-left: 12px;
  border-left: 2px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  gap: 4px;
  margin-top: 2px;
  padding-left: 26px;
}

.replying-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.reply-input {
  margin-top: 8px;
  padding: 8px;
  background: var(--bg-elevated);
  border-radius: 4px;
}

.reply-input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
}

.comment-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 0 16px;
  color: var(--text-placeholder);
  font-size: 13px;
  p { margin: 0; }
}

.quote-preview {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: var(--el-color-primary-light-9);
  border-left: 3px solid var(--el-color-primary);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-regular);
  line-height: 1.6;
}

/* ── 审核相关 ── */
.review-collapse {
  border-top: none;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 12px;

  :deep(.el-collapse-item__header) {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    border-bottom: none;
    padding: 4px 0;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 8px;
  }
}

.review-timeline-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.review-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.review-action-label {
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.action-产品通过, .action-技术通过 { background: var(--el-color-success-light-9); color: var(--el-color-success); }
.action-产品驳回, .action-技术驳回 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
.action-提交评审, .action-重新提交 { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }

.review-reviewer {
  color: var(--text-regular);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.review-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;

  &--text {
    background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-5));
    color: var(--text-inverse);
    font-size: 10px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}

.review-comment {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}
</style>
