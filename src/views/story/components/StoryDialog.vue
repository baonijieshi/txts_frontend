<template>
  <el-dialog :model-value="visible" :title="title" width="860px" destroy-on-close class="story-dialog" @update:model-value="$emit('update:visible', $event)">
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px" label-position="top">
      <el-form-item label="需求标题" prop="title">
        <el-input v-model="form.title" placeholder="请输入需求标题" size="large" />
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="所属产品" prop="product">
            <ModernSelect v-model="form.product" :options="productOptions" placeholder="请选择产品" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="优先级" prop="priority">
            <ModernSelect v-model="form.priority" :options="priorityOptions" placeholder="请选择" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="指派给">
            <UserCascader v-model="form.assignee" :user-list="userList" placeholder="请选择处理人" width="100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="预估工时">
            <el-input v-model="form.estimate" placeholder="如 2h / 0.5d / 3d" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item v-if="editingId" label="状态">
        <ModernSelect v-model="form.status" :options="storyStatusOptions" style="width: 200px" />
      </el-form-item>
      <div class="review-section">
        <div class="review-section-title">审核设置（可选）</div>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="产品审核人">
              <UserCascader v-model="form.productReviewer" :user-list="userList" placeholder="请选择" width="100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="技术审核人">
              <UserCascader v-model="form.techReviewer" :user-list="userList" placeholder="请选择" width="100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <el-form-item label="描述">
        <div style="width:100%">
          <div v-if="ai.isAvailable.value" class="editor-header">
            <div class="editor-header-right">
              <el-button
                size="small"
                text
                type="primary"
                :loading="ai.isProcessing.value"
                @click="handleAiGenerateDesc"
              >
                <el-icon :size="14"><MagicStick /></el-icon>
                AI 生成描述
              </el-button>
            </div>
          </div>
          <div class="editor-wrapper">
            <Toolbar :editor="editorRef" :default-config="toolbarConfig" :mode="mode" />
            <Editor
              v-model="form.description"
              :default-config="editorConfig"
              class="editor-body"
              @on-created="onEditorCreated"
            />
          </div>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, watch, shallowRef, onBeforeUnmount, computed,
} from 'vue';
import { ElMessage } from 'element-plus';
import { MagicStick } from '@element-plus/icons-vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import { createStory, updateStory } from '@/api/story';
import request from '@/utils/request';
import { useAi } from '@/composables/useAi'
import { markdownToHtml } from '@/utils/markdown';
import ModernSelect from '@/components/ModernSelect.vue';
import UserCascader from '@/components/UserCascader.vue';

const props = defineProps({
  visible: Boolean,
  editingId: { type: Number, default: null },
  initialForm: { type: Object, default: null },
  productList: { type: Array, default: () => [] },
  userList: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:visible', 'saved']);

const ai = useAi();
const formRef = ref(null);
const title = ref('新建需求');
const editorRef = shallowRef(null);
const mode = ref('default');

// ModernSelect 选项
const productOptions = computed(() =>
  props.productList.map((p: any) => ({ label: p.name, value: p.id }))
);
const priorityOptions = [
  { label: '高', value: '高' },
  { label: '中', value: '中' },
  { label: '低', value: '低' },
];
const storyStatusOptions = [
  { label: '新建', value: '新建' },
  { label: '开发中', value: '开发中' },
  { label: '已完成', value: '已完成' },
  { label: '已关闭', value: '已关闭' },
];

const toolbarConfig = {};
const editorConfig = {
  placeholder: '请输入需求描述...',
  MENU_CONF: {
    uploadImage: {
      async customUpload(file, insertFn) {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await request({
            url: '/upload/image',
            method: 'post',
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          });
          if (res.code === 200 && res.data?.url) {
            insertFn(res.data.url, file.name, res.data.url);
          } else {
            ElMessage.error('图片上传失败');
          }
        } catch {
          // 错误消息由全局拦截器统一处理
        }
      },
    },
  },
};

const onEditorCreated = (editor) => {
  editorRef.value = editor;
};

onBeforeUnmount(() => {
  if (editorRef.value) editorRef.value.destroy();
});

const defaultForm = () => ({
  title: '',
  product: null,
  priority: '中',
  status: '新建',
  assignee: null,
  estimate: '',
  description: '',
  productReviewer: null,
  techReviewer: null,
});

const form = ref(defaultForm());

const formRules = {
  title: [{ required: true, message: '请输入需求标题', trigger: 'blur' }],
  product: [{ required: true, message: '请选择所属产品', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
};

watch(() => props.visible, (val) => {
  if (val) {
    title.value = props.editingId ? '编辑需求' : '新建需求';
    form.value = props.initialForm ? { ...props.initialForm } : defaultForm();
  }
});

const handleSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    const payload = {
      ...form.value,
      product_reviewer: form.value.productReviewer || null,
      tech_reviewer: form.value.techReviewer || null,
    };
    delete payload.productReviewer;
    delete payload.techReviewer;
    if (props.editingId) {
      await updateStory(props.editingId, payload);
      ElMessage.success('需求已更新');
    } else {
      await createStory(payload);
      ElMessage.success('需求已创建');
    }
    emit('update:visible', false);
    emit('saved');
  } catch {
    // 校验失败或请求失败
  }
};

// ── AI 生成需求描述 ──
const handleAiGenerateDesc = async () => {
  if (!form.value.title) {
    ElMessage.warning('请先填写需求标题');
    return;
  }
  const prompt = [
    '你是一个专业的产品经理。请根据以下需求信息，用 Markdown 格式生成一段结构化的需求描述。',
    '',
    `需求标题：${form.value.title}`,
    `优先级：${form.value.priority}`,
    '',
    '请严格按以下 Markdown 格式输出：',
    '## 背景与目标',
    '（描述需求的背景、用户痛点、期望达到的目标）',
    '',
    '## 功能描述',
    '- 核心功能点1',
    '- 核心功能点2',
    '- 核心功能点3',
    '',
    '## 验收标准',
    '1. 验收标准1',
    '2. 验收标准2',
    '3. 验收标准3',
  ].join('\n');
  try {
    const result = await ai.complete(prompt);
    form.value.description = markdownToHtml(result);
    ElMessage.success('描述已生成');
  } catch (e: any) {
    ElMessage.error(e.message || 'AI 生成失败');
  }
};
</script>

<style src="@wangeditor/editor/dist/css/style.css" />

<style scoped lang="scss">
// 弹窗全局
:deep(.el-dialog__header) {
  padding: 20px 24px 0;
}

:deep(.el-dialog__body) {
  padding: 16px 24px 8px;
}

:deep(.el-dialog__footer) {
  padding: 12px 24px 20px;
}

// 表单项间距
:deep(.el-form-item) {
  margin-bottom: 18px;

  .el-form-item__label {
    font-weight: 600;
    font-size: 12px;
    color: var(--text-regular);
    padding-bottom: 4px;
  }
}

// 编辑器头部（AI 按钮）
.editor-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 6px;
}

.editor-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

// 编辑器包装器
.editor-wrapper {
  border: 1px solid var(--border-color);
  border-radius: 6px;

  :deep(.w-e-toolbar) {
    border-bottom: 1px solid var(--border-color);
    border-radius: 0;
  }
}

.editor-body {
  height: 320px;
  overflow-y: auto;
  border-radius: 0 0 6px 6px;
}

// 审核设置区域
.review-section {
  padding: 14px 16px 6px;
  margin-bottom: 6px;
  background: var(--bg-elevated);
  border-radius: 8px;
  border: 1px solid var(--border-light);

  .el-form-item {
    margin-bottom: 12px;
  }
}

.review-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
}
</style>
