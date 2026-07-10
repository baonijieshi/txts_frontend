<template>
  <div class="review-preso" @keydown="handleKeydown" tabindex="0" ref="presoRef">
    <!-- 顶栏 -->
    <div class="preso-topbar">
      <button class="topbar-back" @click="handleBack">
        <el-icon :size="20"><ArrowLeft /></el-icon>
        <span>返回</span>
      </button>
      <div class="topbar-center">
        <span class="topbar-title">{{ review.title }}</span>
      </div>
      <div class="topbar-progress">
        <div class="topbar-bar-wrap">
          <div class="topbar-bar" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="topbar-count">{{ reviewedCount }} / {{ results.length }}</span>
      </div>
    </div>

    <!-- 进度小圆点 -->
    <div
      :class="['dot-map', { collapsed: dotCollapsed }]"
      @mouseenter="dotCollapsed = false"
      @mouseleave="startDotCollapse"
    >
      <span
        v-for="(r, i) in results"
        :key="r.id"
        :class="['dot', dotClass(r), { active: i === currentIndex }]"
        :title="r.testcase_title"
        @click="currentIndex = i"
      ></span>
    </div>

    <!-- 主体内容 -->
    <div class="preso-body" v-if="currentResult">
      <!-- 结果状态指示 -->
      <div :class="['result-flash', resultFlashClass]" v-if="flashClass"></div>

      <!-- 优先级 -->
      <div class="priority-row">
        <span :class="['priority-badge', 'priority-' + (currentResult.testcase_priority || 'p2').toLowerCase()]">
          {{ currentResult.testcase_priority }}
        </span>
        <span class="case-type-tag">{{ currentResult.testcase_type }}</span>
        <span class="case-module-tag">{{ currentResult.testcase_module }}</span>
      </div>

      <!-- 用例标题 -->
      <h1 class="case-title">{{ currentResult.testcase_title }}</h1>

      <!-- 前置条件 -->
      <div v-if="currentResult.testcase_precondition" class="precondition-card">
        <div class="precondition-label">前置条件</div>
        <div class="precondition-text">{{ currentResult.testcase_precondition }}</div>
      </div>

      <!-- 测试步骤 -->
      <div class="steps-section" v-if="currentResult.testcase_steps?.length">
        <div
          v-for="(step, idx) in currentResult.testcase_steps"
          :key="idx"
          class="step-card"
        >
          <div class="step-num">{{ idx + 1 }}</div>
          <div class="step-body">
            <div class="step-desc">{{ step.desc }}</div>
            <div class="step-expect">
              <span class="expect-prefix">预期</span>
              {{ step.expect }}
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-steps">暂无测试步骤</div>

      <!-- 评审意见 -->
      <div class="comment-card" :class="{ focused: commentFocused }">
        <div class="comment-label">评审意见</div>
        <textarea
          ref="commentRef"
          v-model="currentComment"
          class="comment-input"
          placeholder="输入评审意见（可选）..."
          rows="2"
          @focus="commentFocused = true"
          @blur="commentFocused = false"
          @input="autoSaveComment"
        ></textarea>
      </div>
    </div>

    <!-- 底栏 -->
    <div class="preso-bottombar">
      <button class="action-btn nav-btn" @click="prevCase" :disabled="currentIndex <= 0">
        <el-icon :size="22"><ArrowLeft /></el-icon>
        <span>上一条</span>
      </button>

      <div class="action-group">
        <button
          class="action-btn reject-btn"
          :class="{ active: currentResult?.result === '驳回' }"
          @click="markResult('驳回')"
        >
          <el-icon :size="22"><CircleCloseFilled /></el-icon>
          <span>驳回</span>
        </button>
        <button
          class="action-btn pass-btn"
          :class="{ active: currentResult?.result === '通过' }"
          @click="markResult('通过')"
        >
          <el-icon :size="22"><CircleCheckFilled /></el-icon>
          <span>通过</span>
        </button>
        <button class="action-btn comment-btn" @click="focusComment">
          <el-icon :size="22"><ChatLineSquare /></el-icon>
          <span>评论</span>
        </button>
      </div>

      <button class="action-btn nav-btn" @click="nextCase" :disabled="currentIndex >= results.length - 1">
        <span>下一条</span>
        <el-icon :size="22"><ArrowRight /></el-icon>
      </button>
    </div>

    <!-- 评审完成弹窗 -->
    <Teleport to="body">
      <Transition name="summary-fade">
        <div v-if="showSummary" class="summary-overlay" @click.self="showSummary = false">
          <div class="summary-card">
            <div class="summary-icon">&#10003;</div>
            <h2 class="summary-title">评审完成</h2>
            <div class="summary-stats">
              <div class="summary-stat pass">
                <span class="summary-num">{{ passCount }}</span>
                <span class="summary-label">通过</span>
              </div>
              <div class="summary-stat reject">
                <span class="summary-num">{{ rejectCount }}</span>
                <span class="summary-label">驳回</span>
              </div>
              <div class="summary-stat pending">
                <span class="summary-num">{{ pendingCount }}</span>
                <span class="summary-label">待评审</span>
              </div>
            </div>
            <div v-if="rejectedList.length > 0" class="rejected-list">
              <div class="rejected-header">驳回用例</div>
              <div v-for="r in rejectedList" :key="r.id" class="rejected-item">
                <span :class="['mini-prio', 'priority-' + (r.testcase_priority || 'p2').toLowerCase()]">{{ r.testcase_priority }}</span>
                <span class="rejected-title">{{ r.testcase_title }}</span>
                <span v-if="r.comment" class="rejected-comment">{{ r.comment }}</span>
              </div>
            </div>
            <div class="summary-actions">
              <el-button @click="showSummary = false">继续评审</el-button>
              <el-button type="primary" @click="handleBackFromSummary">返回计划</el-button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowLeft, ArrowRight, CircleCheckFilled, CircleCloseFilled, ChatLineSquare,
} from '@element-plus/icons-vue';
import { getReviewDetail, updateReviewResult, completeReview } from '@/api/testcase';
import { setPageTitle } from '@/composables/usePageTitle';

const route = useRoute();
const router = useRouter();
const reviewId = computed(() => route.params.id);

// ── 状态 ──────────────────────────────────────────────────────
const review = ref({
  id: null,
  title: '',
  plan: null,
  plan_name: '',
  status: '',
  total_count: 0,
  pass_count: 0,
  reject_count: 0,
  pending_count: 0,
});
const results = ref<any[]>([]);
const currentIndex = ref(0);
const currentComment = ref('');
const commentFocused = ref(false);
const flashClass = ref('');
const presoRef = ref<HTMLElement | null>(null);
const commentRef = ref<HTMLTextAreaElement | null>(null);
const showSummary = ref(false);
const dotCollapsed = ref(false);
let commentTimer: any = null;
let dotTimer: any = null;

const startDotCollapse = () => {
  clearTimeout(dotTimer);
  dotTimer = setTimeout(() => { dotCollapsed.value = true; }, 3000);
};

// ── 计算 ──────────────────────────────────────────────────────
const currentResult = computed(() => results.value[currentIndex.value] || null);

const reviewedCount = computed(() =>
  results.value.filter((r) => r.result !== '待评审').length
);

const progressPercent = computed(() => {
  if (!results.value.length) return 0;
  return Math.round((reviewedCount.value / results.value.length) * 100);
});

const passCount = computed(() => results.value.filter((r) => r.result === '通过').length);
const rejectCount = computed(() => results.value.filter((r) => r.result === '驳回').length);
const pendingCount = computed(() => results.value.filter((r) => r.result === '待评审').length);

const rejectedList = computed(() =>
  results.value.filter((r) => r.result === '驳回')
);

const resultFlashClass = computed(() => flashClass.value);

// ── 数据加载 ──────────────────────────────────────────────────
const fetchDetail = async () => {
  try {
    const res = await getReviewDetail(Number(reviewId.value));
    const data = res.data;
    review.value = {
      id: data.id,
      title: data.title,
      plan: data.plan,
      plan_name: data.plan_name || '',
      status: data.status,
      total_count: data.total_count || 0,
      pass_count: data.pass_count || 0,
      reject_count: data.reject_count || 0,
      pending_count: data.pending_count || 0,
    };
    // 更新便签栏动态标题
    setPageTitle(route.path, `用例评审 - ${data.title || ''}`);
    results.value = (data.results || []).map((r: any) => ({
      ...r,
      testcase_steps: r.testcase_steps || [],
      testcase_precondition: r.testcase_precondition || '',
    }));
  } catch {
    ElMessage.error('加载评审数据失败');
  }
};

// ── 导航 ──────────────────────────────────────────────────────
const prevCase = () => {
  if (currentIndex.value > 0) {
    saveCurrentComment();
    currentIndex.value--;
    flashClass.value = '';
  }
};

const nextCase = () => {
  if (currentIndex.value < results.value.length - 1) {
    saveCurrentComment();
    currentIndex.value++;
    flashClass.value = '';
  }
};

// 统一监听切题：点圆点、上/下一条、markResult 自动跳转 都会触发
watch(currentIndex, () => {
  loadCurrentComment();
});

// ── 评审操作 ──────────────────────────────────────────────────
const markResult = async (result: string) => {
  const item = currentResult.value;
  if (!item) return;

  const prevResult = item.result;
  item.result = result;

  // 视觉反馈
  flashClass.value = result === '通过' ? 'flash-pass' : 'flash-reject';
  setTimeout(() => { flashClass.value = ''; }, 600);

  try {
    await updateReviewResult(Number(reviewId.value), item.id, {
      result,
      comment: currentComment.value,
    });
    // 更新统计
    if (prevResult === '通过') review.value.pass_count = Math.max(0, review.value.pass_count - 1);
    if (prevResult === '驳回') review.value.reject_count = Math.max(0, review.value.reject_count - 1);
    if (prevResult === '待评审') review.value.pending_count = Math.max(0, review.value.pending_count - 1);
    if (result === '通过') review.value.pass_count++;
    if (result === '驳回') review.value.reject_count++;
  } catch {
    item.result = prevResult;
    ElMessage.error('提交评审结果失败');
  }

  // 通过时自动跳下一条
  if (result === '通过' && currentIndex.value < results.value.length - 1) {
    setTimeout(() => {
      nextCase();
    }, 400);
  }

  // 驳回时自动聚焦评论
  if (result === '驳回') {
    nextTick(() => {
      commentRef.value?.focus();
    });
  }
};

const saveCurrentComment = () => {
  const item = currentResult.value;
  if (item && currentComment.value) {
    item._comment = currentComment.value;
    // 立即持久化到后端，防止切题时评论丢失
    updateReviewResult(Number(reviewId.value), item.id, {
      comment: currentComment.value,
    }).catch(() => {});
  }
};

const loadCurrentComment = () => {
  const item = currentResult.value;
  const local = item?._comment;
  // _comment 空字符串时回退到后端数据，避免空白 _comment 挡住真实评论
  currentComment.value = (local && local !== '') ? local : (item?.comment ?? '');
};

const autoSaveComment = () => {
  clearTimeout(commentTimer);
  // 立即捕获当前 item 和 comment，防止计时器触发时指向已切换的用例
  const item = currentResult.value;
  const comment = currentComment.value;
  if (!item) return;
  commentTimer = setTimeout(async () => {
    try {
      await updateReviewResult(Number(reviewId.value), item.id, {
        comment,
      });
    } catch { /* ignore */ }
  }, 1500);
};

const focusComment = () => {
  commentRef.value?.focus();
};

// ── 键盘快捷键 ────────────────────────────────────────────────
const handleKeydown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
    if (e.key !== 'Escape') return;
  }

  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      prevCase();
      break;
    case 'ArrowRight':
      e.preventDefault();
      nextCase();
      break;
    case 'Enter':
      e.preventDefault();
      markResult('通过');
      break;
    case 'Backspace':
      e.preventDefault();
      markResult('驳回');
      break;
    case 'c':
    case 'C':
      if (!e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        focusComment();
      }
      break;
    case 'Escape':
      e.preventDefault();
      handleBack();
      break;
  }
};

// ── 返回 ──────────────────────────────────────────────────────
const handleBack = async () => {
  // 检查是否有进行中的评审结果未提交
  saveCurrentComment();

  if (review.value.status === '进行中') {
    try {
      await ElMessageBox.confirm(
        '是否完成本次评审？',
        '退出评审',
        {
          confirmButtonText: '完成评审',
          cancelButtonText: '暂不完成',
          distinguishCancelAndClose: true,
          type: 'info',
        }
      );
      // 完成评审
      const res = await completeReview(Number(reviewId.value));
      showSummary.value = true;
      review.value.status = '已完成';
      // 更新统计
      const data = res.data;
      review.value.pass_count = data.passed;
      review.value.reject_count = data.rejected;
      review.value.pending_count = data.pending;
    } catch (action: any) {
      if (action === 'cancel') {
        // 暂不完成，直接返回
        router.push(`/test/testplan/${review.value.plan}`);
        return;
      }
      // 点了关闭(X)，留在当前页
      return;
    }
  } else {
    showSummary.value = true;
  }
};

const handleBackFromSummary = () => {
  showSummary.value = false;
  router.push(`/test/testplan/${review.value.plan}`);
};

// ── 工具函数 ──────────────────────────────────────────────────
const dotClass = (r: any) => {
  if (r.result === '通过') return 'dot-pass';
  if (r.result === '驳回') return 'dot-reject';
  return 'dot-pending';
};

// ── 生命周期 ──────────────────────────────────────────────────
onMounted(async () => {
  await fetchDetail();
  loadCurrentComment();
  startDotCollapse();
  nextTick(() => {
    presoRef.value?.focus();
  });
});

// 监听路由参数变化（同路由切换不同评审时重新加载）
watch(reviewId, async () => {
  currentIndex.value = 0;
  currentComment.value = '';
  showSummary.value = false;
  await fetchDetail();
  loadCurrentComment();
  nextTick(() => {
    presoRef.value?.focus();
  });
});

onUnmounted(() => {
  saveCurrentComment();
  clearTimeout(commentTimer);
  clearTimeout(dotTimer);
});
</script>

<style scoped lang="scss">
// ── 整体布局 ──────────────────────────────────────────────────
.review-preso {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  outline: none;
  overflow: hidden;
}

// ── 顶栏 ──────────────────────────────────────────────────────
.preso-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  border-bottom: 1px solid #e8eaed;
  flex-shrink: 0;
  background: #fafbfc;
}

.topbar-back {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #5f6368;
  font-size: 15px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all 0.2s;
  &:hover { background: #e8eaed; color: #1a1a2e; }
}

.topbar-center {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.topbar-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-progress {
  display: flex;
  align-items: center;
  gap: 14px;
}

.topbar-bar-wrap {
  width: 160px;
  height: 6px;
  background: #e8eaed;
  border-radius: 3px;
  overflow: hidden;
}

.topbar-bar {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.topbar-count {
  font-size: 16px;
  font-weight: 600;
  color: #5f6368;
  white-space: nowrap;
  min-width: 80px;
  text-align: right;
}

// ── 小圆点进度 ────────────────────────────────────────────────
.dot-map {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 10px 24px;
  flex-shrink: 0;
  flex-wrap: wrap;
  background: #fafbfc;
  border-bottom: 1px solid #f0f0f0;
  max-height: 200px;
  overflow: hidden;
  transition: max-height 0.4s ease, padding 0.4s ease, opacity 0.3s;

  &.collapsed {
    max-height: 4px;
    padding: 0 24px;
    gap: 0;
    opacity: 0.5;
    cursor: pointer;
    
    .dot {
      width: 100%;
      height: 4px;
      border-radius: 2px;
      flex: 1;
      min-width: 0;
    }
  }
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.25s;
  flex-shrink: 0;

  &.dot-pass    { background: #16a34a; }
  &.dot-reject  { background: #dc2626; }
  &.dot-pending { background: #d1d5db; }

  &.active {
    transform: scale(1.6);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
  }

  &:hover { transform: scale(1.3); }
  &.active:hover { transform: scale(1.6); }
}

// ── 主体 ──────────────────────────────────────────────────────
.preso-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px 48px;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  position: relative;
}

// ── 结果闪光动画 ──────────────────────────────────────────────
.result-flash {
  position: fixed;
  inset: 0;
  z-index: 2001;
  pointer-events: none;
  transition: opacity 0.6s;
  opacity: 0;

  &.flash-pass {
    opacity: 1;
    box-shadow: inset 0 0 120px rgba(22, 163, 74, 0.15);
    animation: flashGreen 0.6s ease-out;
  }

  &.flash-reject {
    opacity: 1;
    box-shadow: inset 0 0 120px rgba(220, 38, 38, 0.12);
    animation: flashRed 0.6s ease-out;
  }
}

@keyframes flashGreen {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes flashRed {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

// ── 优先级 ────────────────────────────────────────────────────
.priority-row {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin-bottom: 12px;
}

.priority-badge {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 5px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;

  &.priority-p0 { background: #fef2f2; color: #dc2626; }
  &.priority-p1 { background: #fffbeb; color: #d97706; }
  &.priority-p2 { background: #eff6ff; color: #2563eb; }
  &.priority-p3 { background: #f0fdf4; color: #16a34a; }
}

.case-type-tag,
.case-module-tag {
  font-size: 14px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 3px 10px;
  border-radius: 5px;
}

// ── 用例标题 ──────────────────────────────────────────────────
.case-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  text-align: center;
  margin: 0 0 24px;
  line-height: 1.35;
  letter-spacing: -0.3px;
}

// ── 前置条件卡片 ──────────────────────────────────────────────
.precondition-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #94a3b8;
  border-radius: 10px;
  padding: 18px 22px;
  margin-bottom: 20px;
}

.precondition-label {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.precondition-text {
  font-size: 18px;
  color: #334155;
  line-height: 1.6;
}

// ── 步骤 ──────────────────────────────────────────────────────
.steps-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
}

.step-card {
  display: flex;
  gap: 16px;
  padding: 18px 22px;
  background: #fafbfc;
  border: 1px solid #e8eaed;
  border-left: 4px solid #667eea;
  border-radius: 10px;
  transition: all 0.25s;

  &:hover {
    border-left-width: 8px;
    background: #f0f4ff;
  }
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #667eea;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.step-body {
  flex: 1;
  min-width: 0;
}

.step-desc {
  font-size: 18px;
  color: #1e293b;
  line-height: 1.6;
  margin-bottom: 6px;
  font-weight: 500;
}

.step-expect {
  font-size: 16px;
  color: #64748b;
  line-height: 1.5;
}

.expect-prefix {
  display: inline-block;
  background: #dbeafe;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 3px;
  margin-right: 6px;
  vertical-align: 2px;
}

.no-steps {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
  font-size: 18px;
}

// ── 评审意见 ──────────────────────────────────────────────────
.comment-card {
  background: #fafbfc;
  border: 2px solid #e8eaed;
  border-radius: 12px;
  padding: 18px 22px;
  transition: border-color 0.25s;

  &.focused {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.12);
  }
}

.comment-label {
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.comment-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 17px;
  color: #334155;
  line-height: 1.6;
  resize: none;
  font-family: inherit;

  &::placeholder { color: #c0c4cc; }
}

// ── 底栏 ──────────────────────────────────────────────────────
.preso-bottombar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  border-top: 1px solid #e8eaed;
  flex-shrink: 0;
  background: #fafbfc;
}

.action-group {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 48px;
  padding: 0 24px;
  border: 2px solid #e8eaed;
  border-radius: 12px;
  background: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: #334155;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    border-color: #c4c9d1;
    background: #f5f6f8;
  }
}

.nav-btn {
  min-width: 110px;
  justify-content: center;
}

.pass-btn {
  border-color: #bbf7d0;
  color: #16a34a;

  &:not(:disabled):hover {
    border-color: #16a34a;
    background: #f0fdf4;
  }

  &.active {
    background: #16a34a;
    border-color: #16a34a;
    color: #fff;
  }
}

.reject-btn {
  border-color: #fecaca;
  color: #dc2626;

  &:not(:disabled):hover {
    border-color: #dc2626;
    background: #fef2f2;
  }

  &.active {
    background: #dc2626;
    border-color: #dc2626;
    color: #fff;
  }
}

.comment-btn {
  &:not(:disabled):hover {
    border-color: #667eea;
    color: #667eea;
    background: #f0f4ff;
  }
}

// ── 完成摘要弹窗 ──────────────────────────────────────────────
.summary-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.summary-card {
  background: var(--bg-card);
  border-radius: 20px;
  padding: 40px 48px;
  max-width: 500px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  text-align: center;
  box-shadow: var(--shadow-dropdown);
}

.summary-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.summary-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 24px;
}

.summary-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 24px;
}

.summary-stat {
  text-align: center;

  &.pass .summary-num   { color: var(--el-color-success); }
  &.reject .summary-num { color: var(--el-color-danger); }
  &.pending .summary-num { color: var(--text-secondary); }
}

.summary-num {
  display: block;
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.summary-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.rejected-list {
  text-align: left;
  margin-bottom: 24px;
  max-height: 200px;
  overflow-y: auto;
}

.rejected-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-danger);
  margin-bottom: 8px;
}

.rejected-item {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light);
  font-size: 14px;
  color: var(--text-regular);

  &:last-child {
    border-bottom: none;
  }
}

.mini-prio {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;

  &.priority-p0 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.priority-p1 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.priority-p2 { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.priority-p3 { background: var(--el-color-success-light-9); color: var(--el-color-success); }
}

.rejected-title {
  flex: 1;
  min-width: 0;
}

.rejected-comment {
  flex-basis: 100%;
  font-size: 12px;
  color: var(--text-placeholder);
  padding-left: 2px;
}

.summary-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

// ── 过渡动画 ──────────────────────────────────────────────────
.summary-fade-enter-active {
  transition: opacity 0.25s ease;

  .summary-card {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
  }
}
.summary-fade-leave-active {
  transition: opacity 0.2s ease;

  .summary-card {
    transition: transform 0.2s ease, opacity 0.2s ease;
  }
}

.summary-fade-enter-from {
  opacity: 0;

  .summary-card {
    transform: scale(0.92);
    opacity: 0;
  }
}

.summary-fade-leave-to {
  opacity: 0;

  .summary-card {
    transform: scale(0.95);
    opacity: 0;
  }
}</style>
