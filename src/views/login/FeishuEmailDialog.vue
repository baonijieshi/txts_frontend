<template>
  <el-dialog
    :model-value="visible"
    title="完善注册信息"
    width="420px"
    :close-on-click-modal="false"
    :show-close="false"
  >
    <p style="color:var(--text-secondary);font-size:13px;margin:0 0 20px">
      飞书账号未绑定邮箱，请补充以下信息完成注册。
    </p>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="0">
      <el-form-item prop="email">
        <el-input v-model="form.email" placeholder="请输入邮箱地址" size="large">
          <template #prefix><el-icon><Message /></el-icon></template>
        </el-input>
      </el-form-item>
      <el-form-item prop="dept">
        <el-select v-model="form.dept" placeholder="请选择部门" size="large" style="width:100%">
          <el-option v-for="d in deptOptions" :key="d" :label="d" :value="d" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button
        type="primary"
        size="large"
        style="width:100%"
        :loading="loading"
        @click="handleSubmit"
      >
        完成注册并登录
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Message } from '@element-plus/icons-vue';
import { getDeptList } from '@/api/department';
import { feishuCompleteRegister } from '@/api/user';

const props = defineProps({
  visible: Boolean,
  feishuInfo: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['success']);

const formRef = ref(null);
const loading = ref(false);
const deptOptions = ref([]);

const form = ref({ email: '', dept: '' });

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' },
  ],
  dept: [{ required: true, message: '请选择部门', trigger: 'change' }],
};

onMounted(async () => {
  if (!localStorage.getItem('token')) return;
  try {
    const res = await getDeptList({ status: '启用' });
    deptOptions.value = (res.data || []).map((d) => d.name);
  } catch { /* ignore */ }
});

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
  } catch {
    return;
  }
  loading.value = true;
  try {
    const res = await feishuCompleteRegister({
      ...props.feishuInfo,
      email: form.value.email,
      dept: form.value.dept,
    });
    if (res.code === 200 && res.data?.token) {
      emit('success', res.data.token);
    } else {
      ElMessage.error(res.message || '注册失败，请重试');
    }
  } catch {
    // 错误消息由全局拦截器统一处理
  } finally {
    loading.value = false;
  }
};
</script>
