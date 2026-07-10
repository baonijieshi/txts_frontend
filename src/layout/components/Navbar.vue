<template>
  <div class="navbar">
    <breadcrumb class="breadcrumb-container" />

    <div class="right-menu">
      <notification-bell @toggle="notificationPanelVisible = !notificationPanelVisible" />
      <notification-panel v-model:visible="notificationPanelVisible" />
      <el-dropdown
        class="avatar-container"
        trigger="click"
        @visible-change="onDropdownVisibleChange"
      >
        <div class="avatar-wrapper">
          <el-avatar
            :size="32"
            :src="avatar || ''"
            :style="avatar ? {} : avatarGradientStyle(userName)"
            class="user-avatar"
          >{{ userName ? userName.charAt(0) : '' }}</el-avatar>
          <span class="user-name">{{ userName }}</span>
          <el-icon class="dropdown-caret" :class="{ rotated: dropdownOpen }"><CaretBottom /></el-icon>
        </div>
        <template #dropdown>
          <div class="user-dropdown">
            <!-- 身份卡片 -->
            <div class="user-dropdown-header">
              <el-avatar
                :size="44"
                :src="avatar || ''"
                :style="avatar ? {} : avatarGradientStyle(userName)"
                class="header-avatar"
              >{{ userName ? userName.charAt(0) : '' }}</el-avatar>
              <div class="header-info">
                <div class="header-name">{{ userName }}</div>
                <div class="header-role">{{ roleDisplayName }}</div>
              </div>
            </div>
            <div class="user-dropdown-divider" />
            <!-- 操作菜单 -->
            <div class="user-dropdown-menu">
              <button class="user-menu-item" @click="openAvatarDialog">
                <el-icon class="menu-icon"><Camera /></el-icon>
                <span>修改头像</span>
              </button>
              <button class="user-menu-item" @click="openPasswordDialog">
                <el-icon class="menu-icon"><Lock /></el-icon>
                <span>修改密码</span>
              </button>
              <div class="user-dropdown-divider" />
              <button class="user-menu-item logout-item" @click="logout">
                <el-icon class="menu-icon"><SwitchButton /></el-icon>
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </template>
      </el-dropdown>
    </div>

    <!-- 头像上传对话框 -->
    <el-dialog v-model="avatarDialogVisible" title="修改头像" width="400px" :close-on-click-modal="false">
      <div class="avatar-upload-area">
        <el-avatar :size="80" :src="previewUrl || avatar || ''">{{ userName ? userName.charAt(0) : '' }}</el-avatar>
        <el-upload
          class="avatar-uploader"
          :show-file-list="false"
          :before-upload="beforeUpload"
          :http-request="handleUpload"
          accept="image/*"
        >
          <el-button style="margin-top: 16px" :loading="uploading">
            <el-icon><Upload /></el-icon>选择图片
          </el-button>
        </el-upload>
        <div class="upload-tip">支持 jpg/png/gif，大小不超过 10MB</div>
      </div>
      <template #footer>
        <el-button @click="avatarDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!previewUrl" :loading="saving" @click="saveAvatar">保存</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码对话框 -->
    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="400px" :close-on-click-modal="false" @closed="resetPasswordForm">
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="80px">
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入旧密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码（至少6位）" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="passwordSaving" @click="handleChangePassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, computed, reactive, onMounted, watch,
} from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Camera, SwitchButton, Upload, Lock, CaretBottom,
} from '@element-plus/icons-vue';
import { useRouter, useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { uploadImage } from '@/api/upload';
import { changePassword } from '@/api/user';
import Breadcrumb from './Breadcrumb.vue';
import NotificationBell from './NotificationBell.vue';
import NotificationPanel from './NotificationPanel.vue';

const router = useRouter();
const route = useRoute();
const store = useStore();

const notificationPanelVisible = ref(false);

const userName = computed(() => store.getters.name || '用户');
const avatar = computed(() => store.getters.avatar);
const roles = computed(() => store.getters.roles || []);
const dropdownOpen = ref(false);

// 角色中文名映射
const roleDisplayName = computed(() => {
  const map = {
    admin: '平台管理员',
    dev: '开发者',
    tester: '测试工程师',
    pm: '产品经理',
    leader: '部门负责人',
    super_admin: '超级管理员',
  };
  const first = roles.value[0] || 'dev';
  return map[first] || first;
});

// 头像渐变色（与项目其他页面一致）
const avatarGradients = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
];
function avatarGradientStyle(name) {
  if (!name) return { background: avatarGradients[0], color: '#fff' };
  const idx = name.charCodeAt(0) % avatarGradients.length;
  return { background: avatarGradients[idx], color: '#fff' };
}

function onDropdownVisibleChange(visible) {
  dropdownOpen.value = visible;
}

// 头像对话框
const avatarDialogVisible = ref(false);
const previewUrl = ref('');
const uploading = ref(false);
const saving = ref(false);

const openAvatarDialog = () => {
  dropdownOpen.value = false;
  previewUrl.value = '';
  avatarDialogVisible.value = true;
};

const beforeUpload = (file) => {
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 10MB');
    return false;
  }
  return true;
};

const handleUpload = async ({ file }) => {
  uploading.value = true;
  try {
    const res = await uploadImage(file);
    previewUrl.value = res.data.url;
  } catch {
    // 错误消息由全局拦截器统一处理
  } finally {
    uploading.value = false;
  }
};

const saveAvatar = async () => {
  if (!previewUrl.value) return;
  saving.value = true;
  try {
    await store.dispatch('user/updateAvatar', previewUrl.value);
    ElMessage.success('头像更新成功');
    avatarDialogVisible.value = false;
  } catch {
    // 错误消息由全局拦截器统一处理
  } finally {
    saving.value = false;
  }
};

// 修改密码
const passwordDialogVisible = ref(false);
const passwordSaving = ref(false);
const passwordFormRef = ref(null);
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) callback(new Error('两次输入的密码不一致'));
        else callback();
      },
      trigger: 'blur',
    },
  ],
};
const openPasswordDialog = () => {
  dropdownOpen.value = false;
  passwordDialogVisible.value = true;
};
const resetPasswordForm = () => {
  passwordForm.oldPassword = '';
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
};
const handleChangePassword = async () => {
  if (!passwordFormRef.value) return;
  await passwordFormRef.value.validate();
  passwordSaving.value = true;
  try {
    const res = await changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    });
    ElMessage.success(res.message || '密码修改成功');
    passwordDialogVisible.value = false;
  } catch {
    // 错误消息由全局拦截器统一处理
  } finally {
    passwordSaving.value = false;
  }
};

onMounted(() => {
  store.dispatch('notification/startPolling');
});

// 跳转到登录页时停止轮询（token 过期、手动登出等场景）
watch(
  () => route.path,
  (path) => {
    if (path === '/login') {
      store.dispatch('notification/stopPolling');
    }
  },
);

const logout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await store.dispatch('notification/stopPolling');
    await store.dispatch('user/logout');
    ElMessage.success('退出成功');
    router.push('/login');
  } catch {
    // 用户取消
  }
};
</script>

<style lang="scss" scoped>
.navbar {
  height: 52px;
  flex-shrink: 0;
  overflow: visible;
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: var(--shadow-dropdown);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;

  .breadcrumb-container {
    flex: 0 0 auto;
  }

  .right-menu {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    height: 100%;

    .avatar-container {
      cursor: pointer;
      display: flex;
      align-items: center;
      height: 100%;

      .avatar-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 10px 4px 4px;
        border-radius: 24px;
        transition: background 0.15s ease;

        &:hover {
          background: var(--el-fill-color-light);
        }

        .user-avatar {
          flex-shrink: 0;
          transition: transform 0.2s ease;
          box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 3px var(--el-color-primary-light-7);
        }

        &:hover .user-avatar {
          transform: scale(1.05);
        }

        .user-name {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 500;
        }

        .dropdown-caret {
          font-size: 12px;
          color: var(--text-secondary);
          transition: transform 0.2s ease;

          &.rotated {
            transform: rotate(180deg);
          }
        }
      }
    }
  }
}

.avatar-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;

  .upload-tip {
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);
  }
}
</style>

<style lang="scss">
/* 下拉面板全局样式（渲染在 popper 中，需非 scoped） */
.el-popper.is-pure.is-light {
  .user-dropdown {
    min-width: 200px;
    padding: 0;
  }
}

.user-dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px 12px;

  .header-avatar {
    flex-shrink: 0;
    box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 3px var(--el-color-primary-light-5);
  }

  .header-info {
    min-width: 0;

    .header-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header-role {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 2px;
    }
  }
}

.user-dropdown-divider {
  height: 1px;
  background: var(--el-border-color-lighter);
  margin: 0;
}

.user-dropdown-menu {
  padding: 4px;
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.12s ease;
  font-family: inherit;

  .menu-icon {
    font-size: 16px;
    color: var(--text-secondary);
    flex-shrink: 0;
    transition: color 0.12s ease;
  }

  &:hover {
    background: var(--el-fill-color-light);
    padding-left: 14px;

    .menu-icon {
      color: var(--text-primary);
    }
  }

  &:active {
    background: var(--el-fill-color);
  }
}

.logout-item {
  &:hover {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);

    .menu-icon {
      color: var(--el-color-danger);
    }
  }

  &:active {
    background: var(--el-color-danger-light-7);
  }
}

/* 深色模式顶栏 */
[data-theme='dark'] .navbar {
  background: rgba(26, 26, 26, 0.72);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
