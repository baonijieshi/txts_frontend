<template>
  <el-dialog :model-value="visible" width="580px" destroy-on-close class="product-dialog" @update:model-value="$emit('update:visible', $event)">
    <template #header>
      <div class="dialog-header">
        <span class="dialog-title">{{ title }}</span>
      </div>
    </template>

    <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px" class="product-form">
      <!-- 封面图片 -->
      <div class="form-group">
        <div class="form-group__title">封面信息</div>
        <el-form-item label="封面图片">
          <div class="cover-upload">
            <div v-if="form.cover" class="cover-preview" @click="triggerUpload">
              <img :src="form.cover" alt="封面预览" />
              <div class="cover-mask">
                <el-icon><Edit /></el-icon>
                <span>更换封面</span>
              </div>
            </div>
            <div v-else class="cover-placeholder" @click="triggerUpload">
              <el-icon class="placeholder-icon"><Plus /></el-icon>
              <span class="placeholder-text">上传封面</span>
              <span class="placeholder-hint">建议尺寸 800×400，支持 jpg/png</span>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleFileChange"
            />
            <el-button v-if="form.cover" size="small" type="danger" link style="margin-top: 8px" @click="removeCover">
              <el-icon><Delete /></el-icon>移除封面
            </el-button>
          </div>
        </el-form-item>
      </div>

      <!-- 基本信息 -->
      <div class="form-group">
        <div class="form-group__title">基本信息</div>
        <el-form-item label="产品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入产品名称" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产品代号">
              <el-input v-model="form.code" placeholder="请输入产品代号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产品线">
              <el-input v-model="form.line" placeholder="请输入产品线" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 人员与状态 -->
      <div class="form-group">
        <div class="form-group__title">人员与状态</div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="负责人">
              <UserCascader v-model="form.owner" :user-list="userOptions" placeholder="请选择负责人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <ModernSelect v-model="form.status" :options="statusOptions" placeholder="请选择状态" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 描述 -->
      <div class="form-group">
        <div class="form-group__title">描述</div>
        <el-form-item label="">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请输入产品描述" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { createProduct, updateProduct } from '@/api/product';
import { uploadImage } from '@/api/upload';
import ModernSelect from '@/components/ModernSelect.vue';
import UserCascader from '@/components/UserCascader.vue';

const props = defineProps({
  visible: Boolean,
  editingId: { type: Number, default: null },
  initialForm: { type: Object, default: null },
  userOptions: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:visible', 'saved']);

const formRef = ref(null);
const fileInput = ref(null);
const title = ref('新建产品');
const saving = ref(false);
const uploading = ref(false);

const defaultForm = () => ({
  name: '',
  code: '',
  line: '',
  owner: null,
  status: '活跃',
  description: '',
  cover: '',
});

const form = ref(defaultForm());

const formRules = {
  name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
};

const statusOptions = [
  { label: '活跃', value: '活跃' },
  { label: '已关闭', value: '已关闭' },
];

watch(() => props.visible, (val) => {
  if (val) {
    title.value = props.editingId ? '编辑产品' : '新建产品';
    form.value = props.initialForm ? { ...defaultForm(), ...props.initialForm } : defaultForm();
  }
});

const triggerUpload = () => {
  fileInput.value?.click();
};

const handleFileChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 10MB');
    return;
  }

  uploading.value = true;
  try {
    const res = await uploadImage(file, {
      compress: true,
      compressOptions: { maxWidth: 1920, maxHeight: 1080, quality: 0.82 },
    });
    if (res.code === 200) {
      form.value.cover = res.data.url;
      ElMessage.success('封面上传成功');
    } else {
      ElMessage.error(res.message || '上传失败');
    }
  } catch {
    ElMessage.error('上传失败，请重试');
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
};

const removeCover = () => {
  form.value.cover = '';
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    saving.value = true;
    if (props.editingId) {
      await updateProduct(props.editingId, form.value);
      ElMessage.success('产品已更新');
    } else {
      await createProduct(form.value);
      ElMessage.success('产品已创建');
    }
    emit('update:visible', false);
    emit('saved');
  } catch {
    // 校验失败或请求失败
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped lang="scss">
/* ── 弹窗头部 ── */
.product-dialog {
  :deep(.el-dialog__header) {
    padding: 20px 24px 12px;
    margin-right: 0;
    border-bottom: 1px solid var(--border-color);
  }

  :deep(.el-dialog__body) {
    padding: 16px 24px;
  }
}

.dialog-header {
  display: flex;
  align-items: center;

  .dialog-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

/* ── 表单分组 ── */
.product-form {
  .form-group {
    margin-bottom: 20px;
    padding: 16px 16px 4px;
    background: var(--bg-elevated);
    border-radius: 10px;

    &:last-child {
      margin-bottom: 0;
    }

    &__title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-regular);
      margin-bottom: 14px;
    }
  }
}

/* ── 封面上传 ── */
.cover-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.cover-preview {
  position: relative;
  width: 100%;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cover-mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: #fff;
    font-size: 13px;
    opacity: 0;
    transition: opacity 0.25s;
  }

  &:hover .cover-mask {
    opacity: 1;
  }
}

.cover-placeholder {
  width: 100%;
  height: 160px;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.25s, background 0.25s;
  background: var(--bg-elevated);

  &:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  .placeholder-icon {
    font-size: 28px;
    color: var(--text-secondary);
  }

  .placeholder-text {
    font-size: 14px;
    color: var(--text-regular);
    font-weight: 500;
  }

  .placeholder-hint {
    font-size: 12px;
    color: var(--text-secondary);
  }
}
</style>
