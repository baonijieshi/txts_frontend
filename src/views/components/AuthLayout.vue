<template>
  <div class="auth-root">
    <!-- 左侧：全屏品牌插画区 -->
    <div class="auth-left">
      <img src="@/assets/think.svg" alt="" class="auth-illustration" />
      <div class="auth-left-overlay" />
      <div class="auth-left-content">
        <div class="brand-logo">
          <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
            <rect width="28" height="28" rx="6" fill="#41B093" />
            <path d="M6 10l8-4 8 4v8l-8 4-8-4z" stroke="#fff" stroke-width="1.4" fill="none" />
            <path d="M6 10l8 4 8-4M14 14v8" stroke="#fff" stroke-width="1.4" />
          </svg>
          <span class="brand-name">旭辉平台</span>
          <span class="brand-sub">Cherish</span>
        </div>
        <h2 class="brand-slogan">高效研发，从协作开始</h2>
        <p class="brand-desc">项目管理 · 需求追踪 · 缺陷管理 · 测试用例 · 线上问题处理</p>
        <div class="brand-tags">
          <span class="tag">敏捷迭代</span>
          <span class="tag">全流程追踪</span>
          <span class="tag">团队协作</span>
        </div>
      </div>
    </div>

    <!-- 右侧：表单区 -->
    <div class="auth-right">
      <div class="auth-form-wrap">
        <slot />
      </div>
      <p class="auth-copyright">© 2026 谌旭辉 版权所有 | 旭辉工作室</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
</script>

<style lang="scss" scoped>
/* ── 根容器：左右各占一半，撑满视口 ── */
.auth-root {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* ── 左侧：55% 宽，插画全覆盖 ── */
.auth-left {
  position: relative;
  flex: 0 0 55%;
  overflow: hidden;
  background: #0c252e;

  .auth-illustration {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
}

/* 渐变遮罩：底部加深，让文字可读 */
.auth-left-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(12, 37, 46, 0.15) 0%,
    rgba(12, 37, 46, 0.25) 50%,
    rgba(12, 37, 46, 0.82) 100%
  );
}

/* 品牌文字：固定在左侧底部 */
.auth-left-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40px 48px;
  z-index: 1;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;

  .brand-name {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 2px;
  }

  .brand-sub {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 1px;
    margin-top: 1px;
  }
}

.brand-slogan {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 10px;
  letter-spacing: 1px;
  line-height: 1.3;
}

.brand-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
  margin: 0 0 20px;
  letter-spacing: 0.5px;
}

.brand-tags {
  display: flex;
  gap: 10px;

  .tag {
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(65, 176, 147, 0.25);
    border: 1px solid rgba(65, 176, 147, 0.35);
    backdrop-filter: blur(4px);
  }
}

/* ── 右侧：45% 宽，纯白，表单垂直居中 ── */
.auth-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  padding: 48px 40px;
  overflow-y: auto;
}

.auth-form-wrap {
  width: 100%;
  max-width: 380px;
}

.auth-copyright {
  position: absolute;
  bottom: 24px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* ── 响应式 ── */
@media (max-width: 900px) {
  .auth-root {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }

  .auth-left {
    flex: none;
    height: 220px;
  }

  .auth-left-content {
    padding: 20px 24px;
  }

  .brand-slogan {
    font-size: 20px;
  }

  .auth-right {
    flex: 1;
    padding: 32px 24px 60px;
  }

  .auth-copyright {
    position: static;
    margin-top: 24px;
  }
}
</style>
