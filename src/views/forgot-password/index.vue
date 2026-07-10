<template>
  <AuthLayout>
    <div class="forgot-header">
      <h3 class="form-title">找回密码</h3>
      <p class="form-subtitle">{{ stepDesc[currentStep] }}</p>
    </div>

    <!-- 分步指示器 -->
    <div class="step-indicator">
      <div
        v-for="(s, i) in stepNames"
        :key="i"
        class="step-dot"
        :class="{ active: i === currentStep, done: i < currentStep }"
      >
        <span class="step-num">{{ i < currentStep ? '✓' : i + 1 }}</span>
        <span class="step-label">{{ s }}</span>
      </div>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="left">
      <!-- 第一步：验证身份 -->
      <template v-if="currentStep === 0">
        <el-form-item prop="account">
          <el-input v-model="form.account" placeholder="邮箱或手机号" size="large">
            <template #prefix><el-icon><Message /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item prop="code">
          <div class="code-row">
            <el-input v-model="form.code" placeholder="验证码" size="large">
              <template #prefix><el-icon><Key /></el-icon></template>
            </el-input>
            <el-button
              size="large"
              class="code-btn"
              :disabled="countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-button type="primary" size="large" class="submit-btn" @click="verifyCode">
          下一步
        </el-button>
      </template>

      <!-- 第二步：设置新密码 -->
      <template v-if="currentStep === 1">
        <el-form-item prop="newPassword">
          <el-input
            v-model="form.newPassword"
            :type="pwdType"
            placeholder="新密码（至少6位）"
            size="large"
          >
            <template #prefix><el-icon><Lock /></el-icon></template>
            <template #suffix>
              <el-icon class="toggle-pwd" @click="pwdType = pwdType === 'password' ? '' : 'password'">
                <component :is="pwdType === 'password' ? 'View' : 'Hide'" />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <!-- 密码强度 -->
        <div v-if="form.newPassword" class="pwd-strength">
          <div class="strength-bars">
            <div class="bar" :class="strengthClass" />
            <div class="bar" :class="pwdStrength >= 2 ? strengthClass : ''" />
            <div class="bar" :class="pwdStrength >= 3 ? strengthClass : ''" />
          </div>
          <span class="strength-text" :class="strengthClass">{{ strengthLabel }}</span>
        </div>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="确认新密码"
            size="large"
            @keyup.enter="handleReset"
          >
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          class="submit-btn"
          :loading="loading"
          @click="handleReset"
        >
          重置密码
        </el-button>
      </template>

      <!-- 第三步：完成 -->
      <template v-if="currentStep === 2">
        <div class="success-state">
          <el-icon class="success-icon" :size="56"><CircleCheck /></el-icon>
          <h4>密码重置成功</h4>
          <p>您的密码已更新，请使用新密码登录</p>
          <el-button type="primary" size="large" class="submit-btn" @click="$router.push('/login')">
            去登录
          </el-button>
        </div>
      </template>
    </el-form>

    <div v-if="currentStep < 2" class="form-footer">
      <router-link to="/login" class="link">
        <el-icon><ArrowLeft /></el-icon> 返回登录
      </router-link>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import AuthLayout from '@/views/components/AuthLayout.vue';

const formRef = ref(null);
const currentStep = ref(0);
const stepNames = ['验证身份', '设置密码', '完成'];
const stepDesc = [
  '请输入您的邮箱或手机号，我们将发送验证码',
  '请设置您的新密码',
  '',
];

const form = reactive({
  account: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
});

// ── 密码强度 ──
const pwdStrength = computed(() => {
  const p = form.newPassword;
  if (!p) return 0;
  let score = 0;
  if (p.length >= 6) score += 1;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score += 1;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score += 1;
  return score;
});
const strengthClass = computed(() => ['', 'weak', 'medium', 'strong'][pwdStrength.value] || '');
const strengthLabel = computed(() => ['', '弱', '中', '强'][pwdStrength.value] || '');

// ── 校验 ──
const validatePass = (_rule, value, callback) => {
  if (!value) callback(new Error('请输入新密码'));
  else if (value.length < 6) callback(new Error('密码长度不能少于6位'));
  else {
    if (form.confirmPassword) formRef.value.validateField('confirmPassword');
    callback();
  }
};
const validateConfirm = (_rule, value, callback) => {
  if (!value) callback(new Error('请再次输入密码'));
  else if (value !== form.newPassword) callback(new Error('两次输入密码不一致'));
  else callback();
};

const rules = {
  account: [{ required: true, message: '请输入邮箱或手机号', trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  newPassword: [{ required: true, validator: validatePass, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validateConfirm, trigger: 'blur' }],
};

const pwdType = ref('password');
const loading = ref(false);
const countdown = ref(0);

// ── 发送验证码 ──
const sendCode = async () => {
  if (!form.account) {
    ElMessage.warning('请先输入邮箱或手机号');
    return;
  }
  try {
    // TODO: 接入真实发送验证码 API
    await new Promise((resolve) => { setTimeout(resolve, 500); });
    ElMessage.success('验证码已发送');
    countdown.value = 60;
    const timer = setInterval(() => {
      countdown.value -= 1;
      if (countdown.value <= 0) clearInterval(timer);
    }, 1000);
  } catch {
    ElMessage.error('发送失败，请稍后重试');
  }
};

// ── 验证验证码 ──
const verifyCode = async () => {
  try {
    await formRef.value.validateField(['account', 'code']);
  } catch { return; }
  // TODO: 接入真实验证码校验 API
  currentStep.value = 1;
};

// ── 重置密码 ──
const handleReset = async () => {
  try {
    await formRef.value.validateField(['newPassword', 'confirmPassword']);
  } catch { return; }
  loading.value = true;
  try {
    // TODO: 接入真实重置密码 API
    await new Promise((resolve) => { setTimeout(resolve, 1000); });
    currentStep.value = 2;
  } catch {
    ElMessage.error('重置失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.forgot-header {
  margin-bottom: 24px;

  .form-title {
    font-size: 26px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 6px;
  }

  .form-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }
}

/* ── 分步指示器（带连线） ── */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 28px;

  .step-dot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    position: relative;

    &:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 14px;
      left: calc(50% + 14px);
      width: 48px;
      height: 1px;
      background: var(--border-color);
    }

    &:not(:last-child).done::after {
      background: #41B093;
    }

    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      background: var(--bg-elevated);
      color: var(--text-secondary);
      transition: all 0.3s;
      margin: 0 32px;
    }

    .step-label {
      font-size: 11px;
      color: var(--text-secondary);
      transition: color 0.3s;
      white-space: nowrap;
    }

    &.active .step-num {
      background: #41B093;
      color: #fff;
      box-shadow: 0 3px 10px rgba(65, 176, 147, 0.35);
    }

    &.active .step-label {
      color: #41B093;
      font-weight: 600;
    }

    &.done .step-num {
      background: #184657;
      color: #fff;
    }

    &.done .step-label {
      color: #184657;
    }
  }
}

/* ── 验证码行 ── */
.code-row {
  display: flex;
  gap: 10px;
  width: 100%;

  .el-input { flex: 1; }

  .code-btn {
    flex: 0 0 110px;
    border-radius: 10px;
    font-size: 13px;
    color: #41B093;
    border-color: #41B093;

    &:hover {
      background: rgba(65, 176, 147, 0.08);
    }

    &:disabled {
      color: var(--text-placeholder);
      border-color: var(--border-color);
    }
  }
}

/* ── 密码强度 ── */
.pwd-strength {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: -8px 0 14px;

  .strength-bars {
    display: flex;
    gap: 4px;
    flex: 1;

    .bar {
      height: 3px;
      flex: 1;
      border-radius: 2px;
      background: var(--border-color);
      transition: background 0.3s;

      &.weak { background: #E85F5B; }
      &.medium { background: #FCC14A; }
      &.strong { background: #41B093; }
    }
  }

  .strength-text {
    font-size: 12px;
    min-width: 20px;

    &.weak { color: #E85F5B; }
    &.medium { color: #FCC14A; }
    &.strong { color: #41B093; }
  }
}

/* ── 成功状态 ── */
.success-state {
  text-align: center;
  padding: 20px 0;

  .success-icon {
    color: #41B093;
    margin-bottom: 16px;
  }

  h4 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px;
  }

  p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 28px;
  }
}

/* ── 按钮 ── */
.submit-btn {
  width: 100%;
  height: 48px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #41B093 0%, #184657 100%);
  border: none;
  transition: all 0.25s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(65, 176, 147, 0.4);
  }

  &:active { transform: translateY(0); }
}

.form-footer {
  margin-top: 24px;
  text-align: center;
}

.link {
  color: #41B093;
  text-decoration: none;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;

  &:hover { color: #184657; }
}

.toggle-pwd {
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.2s;

  &:hover { color: var(--text-primary); }
}

:deep(.el-input__wrapper) {
  border-radius: 10px;
  border: 1.5px solid var(--border-color);
  box-shadow: none;
  background: var(--bg-elevated);
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: #41B093;
    background: var(--bg-card);
  }

  &.is-focus {
    border-color: #41B093;
    background: var(--bg-card);
    box-shadow: 0 0 0 3px rgba(65, 176, 147, 0.12);
  }
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}
</style>
