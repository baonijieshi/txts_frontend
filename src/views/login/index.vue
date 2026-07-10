<template>
  <AuthLayout>
    <div class="login-header">
      <h3 class="form-title">欢迎回来</h3>
      <p class="form-subtitle">登录您的账号以继续</p>
    </div>

    <el-form
      ref="loginFormRef"
      :model="loginForm"
      :rules="loginRules"
      label-position="left"
      @keyup.enter="handleLogin"
    >
      <el-form-item prop="username">
        <el-input
          ref="usernameRef"
          v-model="loginForm.username"
          placeholder="用户名"
          size="large"
          autocomplete="on"
        >
          <template #prefix>
            <el-icon><User /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item prop="password">
        <el-input
          ref="passwordRef"
          v-model="loginForm.password"
          :type="passwordType"
          placeholder="密码"
          size="large"
          autocomplete="on"
        >
          <template #prefix>
            <el-icon><Lock /></el-icon>
          </template>
          <template #suffix>
            <el-icon class="toggle-pwd" @click="togglePwd">
              <component :is="passwordType === 'password' ? 'View' : 'Hide'" />
            </el-icon>
          </template>
        </el-input>
      </el-form-item>

      <div class="form-options">
        <el-checkbox v-model="rememberMe">记住密码</el-checkbox>
        <router-link to="/forgot-password" class="link">忘记密码？</router-link>
      </div>

      <el-button
        :loading="loading"
        type="primary"
        size="large"
        class="submit-btn"
        @click.prevent="handleLogin"
      >
        登 录
      </el-button>
    </el-form>

    <div class="form-footer">
      还没有账号？
      <router-link to="/register" class="link">立即注册</router-link>
    </div>

    <!-- 飞书扫码登录 -->
    <div class="feishu-divider">
      <span>或</span>
    </div>
    <el-button class="feishu-btn" size="large" :loading="feishuLoading" @click="handleFeishuLogin">
      <img src="@/assets/feishu-logo.svg" class="feishu-icon" alt="飞书">
      飞书扫码登录
    </el-button>

    <!-- 邮箱补填弹窗 -->
    <FeishuEmailDialog
      :visible="emailDialogVisible"
      :feishu-info="feishuInfo"
      @success="onFeishuRegisterSuccess"
    />
  </AuthLayout>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, reactive, nextTick, onMounted, onUnmounted,
} from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import AuthLayout from '@/views/components/AuthLayout.vue';
import { feishuLogin } from '@/api/user';
import FeishuEmailDialog from './FeishuEmailDialog.vue';

const router = useRouter();
const store = useStore();

const loginFormRef = ref(null);
const usernameRef = ref(null);
const passwordRef = ref(null);

const loginForm = reactive({ username: '', password: '' });
const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const passwordType = ref('password');
const loading = ref(false);
const rememberMe = ref(false);

const togglePwd = () => {
  passwordType.value = passwordType.value === 'password' ? '' : 'password';
  nextTick(() => { passwordRef.value.focus(); });
};

const handleLogin = async () => {
  await loginFormRef.value.validate();
  loading.value = true;
  try {
    await store.dispatch('user/login', loginForm);
    if (rememberMe.value) {
      localStorage.setItem('kn_remember', JSON.stringify({
        username: loginForm.username,
        password: loginForm.password,
      }));
    } else {
      localStorage.removeItem('kn_remember');
    }
    ElMessage.success('登录成功');
    router.push({ path: '/dashboard' });
  } catch {
    // 错误消息由全局拦截器统一处理
  } finally {
    loading.value = false;
  }
};

// ── 飞书扫码登录 ──
const feishuLoading = ref(false);
const emailDialogVisible = ref(false);
const feishuInfo = ref({});
let feishuWindow = null;

function handleFeishuMessage(event) {
  if (event.data?.type !== 'feishu_login_callback') return;
  const { code, error } = event.data;
  if (error) {
    ElMessage.error('飞书授权失败：' + error);
    feishuLoading.value = false;
    return;
  }
  if (!code) return;
  const redirectUri = `${window.location.origin}/feishu-login-callback.html`;
  feishuLogin({ code, redirect_uri: redirectUri }).then((res) => {
    if (res.code !== 200) {
      ElMessage.error(res.message || '飞书登录失败');
      return;
    }
    if (res.data.need_email) {
      feishuInfo.value = res.data.feishu_info;
      emailDialogVisible.value = true;
    } else {
      onFeishuLoginSuccess(res.data.token);
    }
  }).catch(() => {
    ElMessage.error('飞书登录失败，请重试');
  }).finally(() => {
    feishuLoading.value = false;
    if (feishuWindow) { feishuWindow.close(); feishuWindow = null; }
  });
}

async function handleFeishuLogin() {
  feishuLoading.value = true;
  const redirectUri = `${window.location.origin}/feishu-login-callback.html`;
  const params = new URLSearchParams({
    app_id: 'cli_a931d0c8a7f89cd5',
    redirect_uri: redirectUri,
    scope: 'contact:user.employee:readonly',
    state: 'feishu_login',
  });
  const authUrl = `https://accounts.feishu.cn/open-apis/authen/v1/authorize?${params}`;
  feishuWindow = window.open(authUrl, 'feishu_login', 'width=600,height=700,left=200,top=100');
  if (!feishuWindow) {
    ElMessage.error('弹窗被拦截，请允许弹窗后重试');
    feishuLoading.value = false;
    return;
  }
  // 轮询检测用户手动关闭弹窗
  const timer = setInterval(() => {
    if (feishuWindow && feishuWindow.closed) {
      clearInterval(timer);
      feishuLoading.value = false;
      feishuWindow = null;
    }
  }, 500);
}

function onFeishuLoginSuccess(token) {
  store.commit('user/SET_TOKEN', token);
  localStorage.setItem('token', token);
  ElMessage.success('登录成功');
  router.push({ path: '/dashboard' });
}

function onFeishuRegisterSuccess(token) {
  emailDialogVisible.value = false;
  onFeishuLoginSuccess(token);
}

onMounted(() => {
  window.addEventListener('message', handleFeishuMessage);
  if (!loginForm.username) usernameRef.value.focus();
  else if (!loginForm.password) passwordRef.value.focus();
  const saved = localStorage.getItem('kn_remember');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      loginForm.username = data.username || '';
      loginForm.password = data.password || '';
      rememberMe.value = true;
    } catch { /* ignore */ }
  }
});

onUnmounted(() => {
  window.removeEventListener('message', handleFeishuMessage);
});
</script>

<style lang="scss" scoped>
.login-header {
  margin-bottom: 36px;

  .form-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px;
    letter-spacing: 0.5px;
  }

  .form-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.submit-btn {
  width: 100%;
  height: 48px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #41B093 0%, #184657 100%);
  border: none;
  transition: all 0.25s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(65, 176, 147, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}

.form-footer {
  margin-top: 28px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}

.feishu-divider {
  display: flex;
  align-items: center;
  margin: 20px 0 16px;
  color: var(--text-secondary);
  font-size: 13px;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-color);
  }

  span { padding: 0 12px; }
}

.feishu-btn {
  width: 100%;
  height: 48px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  border: 1.5px solid var(--border-color);
  color: var(--text-primary);
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.25s;

  &:hover {
    border-color: #1456F0;
    color: #1456F0;
    background: var(--el-color-primary-light-9);
  }

  .feishu-icon {
    width: 20px;
    height: 20px;
  }
}

.link {
  color: #41B093;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;

  &:hover {
    color: #184657;
  }
}

.toggle-pwd {
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.2s;

  &:hover {
    color: var(--text-primary);
  }
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

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #41B093;
  border-color: #41B093;
}

:deep(.el-checkbox__label) {
  color: var(--text-regular);
}
</style>
