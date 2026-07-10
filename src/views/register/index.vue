<template>
  <AuthLayout>
    <div class="register-header">
      <h3 class="form-title">创建账号</h3>
      <p class="form-subtitle">填写以下信息完成注册</p>
    </div>

    <!-- 分步指示器 -->
    <div class="step-indicator">
      <div
        v-for="(s, i) in steps"
        :key="i"
        class="step-dot"
        :class="{ active: i === currentStep, done: i < currentStep }"
      >
        <span class="step-num">{{ i < currentStep ? '✓' : i + 1 }}</span>
        <span class="step-label">{{ s }}</span>
      </div>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="left"
    >
      <!-- 第一步：基本信息 -->
      <template v-if="currentStep === 0">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名（3-20个字符）" size="large">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item prop="name">
          <el-input v-model="form.name" placeholder="真实姓名" size="large">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item prop="dept">
          <el-select v-model="form.dept" placeholder="请选择部门" size="large" style="width:100%">
            <el-option v-for="d in deptOptions" :key="d" :label="d" :value="d" />
          </el-select>
        </el-form-item>
        <el-button type="primary" size="large" class="submit-btn" @click="nextStep">
          下一步
        </el-button>
      </template>

      <!-- 第二步：联系方式 -->
      <template v-if="currentStep === 1">
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="邮箱地址" size="large">
            <template #prefix><el-icon><Message /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item prop="phone">
          <el-input v-model="form.phone" placeholder="请输入注册飞书的手机号" size="large">
            <template #prefix><el-icon><Phone /></el-icon></template>
          </el-input>
        </el-form-item>
        <div class="step-actions">
          <el-button size="large" class="back-btn" @click="currentStep = 0">上一步</el-button>
          <el-button type="primary" size="large" class="next-btn" @click="nextStep">下一步</el-button>
        </div>
      </template>

      <!-- 第三步：设置密码 -->
      <template v-if="currentStep === 2">
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            :type="pwdType"
            placeholder="设置密码（至少6位）"
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

        <!-- 密码强度指示器 -->
        <div v-if="form.password" class="pwd-strength">
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
            placeholder="确认密码"
            size="large"
            @keyup.enter="handleSubmit"
          >
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-form-item prop="agree">
          <el-checkbox v-model="form.agree">
            我已阅读并同意
            <a href="#" class="link" @click.prevent="showAgreement = true">《用户协议》</a>
            和
            <a href="#" class="link" @click.prevent="showPrivacy = true">《隐私政策》</a>
          </el-checkbox>
        </el-form-item>

        <div class="step-actions">
          <el-button size="large" class="back-btn" @click="currentStep = 1">上一步</el-button>
          <el-button
            type="primary"
            size="large"
            class="next-btn"
            :loading="loading"
            @click="handleSubmit"
          >
            完成注册
          </el-button>
        </div>
      </template>
    </el-form>

    <div class="form-footer">
      已有账号？
      <router-link to="/login" class="link">立即登录</router-link>
    </div>

    <!-- 用户协议弹窗 -->
    <el-dialog v-model="showAgreement" title="用户协议" width="600px" top="5vh">
      <div class="agreement-content">
        <p>更新日期：2026年1月1日 &nbsp;&nbsp; 生效日期：2026年1月1日</p>
        <h4>一、总则</h4>
        <p>欢迎使用 KN Platform（以下简称"本平台"）。本协议是您与本平台之间关于使用本平台服务所订立的协议。请您在注册前仔细阅读本协议，注册即表示您已阅读并同意本协议的全部条款。</p>
        <h4>二、账号注册与安全</h4>
        <p>1. 您注册时须提供真实、准确、完整的个人信息，并在信息变更时及时更新。</p>
        <p>2. 您应妥善保管账号及密码，因您保管不当导致的账号安全问题，本平台不承担责任。</p>
        <p>3. 如发现账号被盗用，请立即联系管理员处理。</p>
        <h4>三、服务内容</h4>
        <p>本平台提供项目管理、需求跟踪、缺陷管理、测试用例管理、线上问题处理等研发协作服务。本平台有权根据业务需要调整、中断或终止部分服务，并提前通知用户。</p>
        <h4>四、用户行为规范</h4>
        <p>1. 您不得利用本平台从事任何违法违规活动。</p>
        <p>2. 您不得上传、发布含有恶意代码、病毒或其他有害内容的文件。</p>
        <p>3. 您不得干扰本平台的正常运营，不得未经授权访问他人账号或数据。</p>
        <h4>五、知识产权</h4>
        <p>本平台的所有内容（包括但不限于软件、界面设计、文档）的知识产权归本平台所有。未经书面授权，您不得复制、修改、传播或用于商业目的。</p>
        <h4>六、免责声明</h4>
        <p>本平台不对因不可抗力、网络故障、第三方服务中断等原因导致的服务中断或数据丢失承担责任。</p>
        <h4>七、协议修改</h4>
        <p>本平台有权修改本协议，修改后的协议将在平台内公告。您继续使用本平台即视为接受修改后的协议。</p>
        <h4>八、联系我们</h4>
        <p>如您对本协议有任何疑问，请联系平台管理员。</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="showAgreement = false">我已阅读</el-button>
      </template>
    </el-dialog>

    <!-- 隐私政策弹窗 -->
    <el-dialog v-model="showPrivacy" title="隐私政策" width="600px" top="5vh">
      <div class="agreement-content">
        <p>更新日期：2026年1月1日 &nbsp;&nbsp; 生效日期：2026年1月1日</p>
        <h4>一、我们收集的信息</h4>
        <p>在您注册和使用本平台过程中，我们会收集以下信息：</p>
        <p>1. <strong>账号信息</strong>：用户名、姓名、邮箱、手机号、所属部门。</p>
        <p>2. <strong>使用数据</strong>：您在平台上创建的项目、需求、缺陷、测试用例、线上问题等业务数据。</p>
        <p>3. <strong>日志信息</strong>：登录时间、操作记录等，用于安全审计和问题排查。</p>
        <h4>二、信息的使用</h4>
        <p>1. 提供、维护和改进本平台的服务。</p>
        <p>2. 向您发送与服务相关的通知（如任务指派、缺陷更新等）。</p>
        <p>3. 保障账号安全，防止欺诈和滥用行为。</p>
        <h4>三、信息的共享</h4>
        <p>我们不会将您的个人信息出售给第三方。以下情况除外：</p>
        <p>1. 经您明确同意。</p>
        <p>2. 依据法律法规要求或政府机关的合法要求。</p>
        <h4>四、信息的存储与安全</h4>
        <p>您的数据存储在本平台的服务器中。我们采取合理的技术和管理措施保护您的信息安全，包括数据加密、访问控制等。</p>
        <h4>五、您的权利</h4>
        <p>1. <strong>访问权</strong>：您可以查看您的个人信息。</p>
        <p>2. <strong>更正权</strong>：您可以通过账号设置更正不准确的信息。</p>
        <p>3. <strong>删除权</strong>：您可以联系管理员申请删除账号及相关数据。</p>
        <h4>六、Cookie 与本地存储</h4>
        <p>本平台使用 Token 机制维持登录状态，存储于浏览器本地。您可以清除浏览器缓存来移除这些数据，但这将导致您退出登录。</p>
        <h4>七、隐私政策的变更</h4>
        <p>我们可能会不时更新本隐私政策。更新后我们将在平台内通知您，请定期查阅。</p>
        <h4>八、联系我们</h4>
        <p>如您对本隐私政策有任何疑问或投诉，请联系平台管理员。</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="showPrivacy = false">我已阅读</el-button>
      </template>
    </el-dialog>
  </AuthLayout>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, reactive, computed, onMounted,
} from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '@/utils/request';
import { getDeptList } from '@/api/department';
import AuthLayout from '@/views/components/AuthLayout.vue';

const router = useRouter();
const formRef = ref(null);
const deptOptions = ref([]);
const currentStep = ref(0);
const steps = ['基本信息', '联系方式', '设置密码'];

onMounted(async () => {
  if (!localStorage.getItem('token')) return;
  try {
    const res = await getDeptList({ status: '启用' });
    deptOptions.value = (res.data || []).map((d) => d.name);
  } catch { /* ignore */ }
});

const form = reactive({
  username: '',
  name: '',
  dept: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  agree: false,
});

// ── 密码强度 ──
const pwdStrength = computed(() => {
  const p = form.password;
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
const validatePass = (rule, value, callback) => {
  if (!value) callback(new Error('请输入密码'));
  else if (value.length < 6) callback(new Error('密码长度不能少于6位'));
  else {
    if (form.confirmPassword) formRef.value.validateField('confirmPassword');
    callback();
  }
};
const validateConfirm = (rule, value, callback) => {
  if (!value) callback(new Error('请再次输入密码'));
  else if (value !== form.password) callback(new Error('两次输入密码不一致'));
  else callback();
};
const validateAgree = (rule, value, callback) => {
  if (!value) callback(new Error('请阅读并同意用户协议'));
  else callback();
};

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    {
      min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur',
    },
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
  ],
  dept: [{ required: true, message: '请选择部门', trigger: 'change' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^\+?[\d\s-]{7,15}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  password: [{ required: true, validator: validatePass, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validateConfirm, trigger: 'blur' }],
  agree: [{ validator: validateAgree, trigger: 'change' }],
};

// ── 分步字段映射 ──
const stepFields = [
  ['username', 'name', 'dept'],
  ['email', 'phone'],
  ['password', 'confirmPassword', 'agree'],
];

const nextStep = async () => {
  try {
    await formRef.value.validateField(stepFields[currentStep.value]);
    currentStep.value += 1;
  } catch { /* 校验失败 */ }
};

const pwdType = ref('password');
const loading = ref(false);
const showAgreement = ref(false);
const showPrivacy = ref(false);

const handleSubmit = async () => {
  try {
    await formRef.value.validateField(stepFields[2]);
  } catch { return; }
  loading.value = true;
  try {
    await request({
      url: '/user/register',
      method: 'post',
      data: {
        username: form.username,
        name: form.name,
        email: form.email,
        phone: form.phone,
        dept: form.dept,
        password: form.password,
      },
    });
    ElMessage.success('注册成功，请登录');
    router.push('/login');
  } catch {
    // 错误消息由全局拦截器统一处理
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.register-header {
  margin-bottom: 20px;

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

/* ── 分步指示器 ── */
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

    /* 步骤间连线 */
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

/* ── 按钮 ── */
.submit-btn {
  width: 100%;
  height: 48px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #41B093 0%, #184657 100%);
  border: none;
  transition: all 0.25s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(65, 176, 147, 0.4);
  }
}

.step-actions {
  display: flex;
  gap: 12px;

  .back-btn {
    flex: 0 0 96px;
    height: 48px;
    border-radius: 10px;
    font-size: 14px;
    color: var(--text-regular);
    border-color: var(--border-color);

    &:hover {
      color: #184657;
      border-color: #41B093;
    }
  }

  .next-btn {
    flex: 1;
    height: 48px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    background: linear-gradient(135deg, #41B093 0%, #184657 100%);
    border: none;
    transition: all 0.25s;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(65, 176, 147, 0.4);
    }
  }
}

.form-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}

.link {
  color: #41B093;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;

  &:hover { color: #184657; }
}

.toggle-pwd {
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.2s;

  &:hover { color: var(--text-primary); }
}

.agreement-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 4px;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.8;

  h4 {
    margin: 16px 0 6px;
    font-weight: 600;
    color: var(--text-primary);
  }

  p { margin: 4px 0; }
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

:deep(.el-select .el-input__wrapper) {
  border-radius: 10px;
  border: 1.5px solid var(--border-color);
  box-shadow: none;
  background: var(--bg-elevated);
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #41B093;
  border-color: #41B093;
}
</style>
