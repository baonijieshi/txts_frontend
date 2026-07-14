<template>
  <el-dialog :model-value="visible" :title="title" width="750px" destroy-on-close @update:model-value="$emit('update:visible', $event)">
    <el-form ref="formRef" :model="bugForm" :rules="bugFormRules" label-width="90px">
      <el-form-item label="Bug标题" prop="title">
        <el-input v-model="bugForm.title" placeholder="请输入Bug标题" />
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="Bug类型" prop="bugType">
            <ModernSelect v-model="bugForm.bugType" :options="bugTypeOptions" placeholder="请选择类型" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="所属模块">
            <ModernSelect v-model="bugForm.module" :options="moduleSelectOptions" placeholder="请选择模块（可选）" clearable />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="严重程度" prop="severity">
            <ModernSelect v-model="bugForm.severity" :options="severitySelectOptions" placeholder="请选择" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="优先级" prop="priority">
            <ModernSelect v-model="bugForm.priority" :options="bugPriorityOptions" placeholder="请选择" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="指派给" prop="assignee">
            <div style="display:flex;align-items:center;gap:8px;width:100%">
              <UserCascader v-model="bugForm.assignee" :user-list="userList" placeholder="请选择" style="flex:1" />
              <el-popover
                v-if="ai.isAvailable.value && suggestions.length > 0"
                placement="bottom"
                :width="260"
                trigger="click"
              >
                <template #reference>
                  <el-button size="small" text type="primary">
                    <el-icon :size="14"><MagicStick /></el-icon>
                    推荐
                  </el-button>
                </template>
                <div class="ai-suggest-list">
                  <div style="font-size:12px;font-weight:600;color:var(--text-secondary);padding:0 4px 6px">AI 推荐处理人</div>
                  <button
                    v-for="s in suggestions"
                    :key="s.id"
                    class="ai-suggest-item"
                    @click="bugForm.assignee = s.id; fetchSuggestions()"
                  >
                    <el-avatar :size="22" :src="s.avatar || ''">{{ s.name?.charAt(0) }}</el-avatar>
                    <span class="ai-suggest-name">{{ s.name }}</span>
                    <span class="ai-suggest-meta">已解决 {{ s.resolvedCount }} 个·均 {{ s.avgResolveHours }}h</span>
                  </button>
                </div>
              </el-popover>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="所属项目">
            <ModernSelect v-model="bugForm.project" :options="projectSelectOptions" placeholder="请选择项目（可选）" clearable />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="关联版本">
            <ModernSelect v-model="bugForm.versionId" :options="versionSelectOptions" placeholder="请选择版本（可选）" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12" />
      </el-row>
      <el-form-item label="重现步骤" prop="stepsToReproduce">
        <div style="width:100%">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:12px;color:var(--text-secondary)">支持直接粘贴图片</span>
            <el-button
              v-if="ai.isAvailable.value"
              size="small"
              text
              type="primary"
              :loading="ai.isProcessing.value"
              @click="handleAiGenerateSteps"
            >
              <el-icon :size="14"><MagicStick /></el-icon>
              AI 生成重现步骤
            </el-button>
          </div>
          <div style="border:1px solid var(--border-color);border-radius:4px;overflow:visible;position:relative;z-index:1">
            <Toolbar :editor="editorRef" :default-config="toolbarConfig" style="border-bottom:1px solid var(--border-color)" />
            <Editor
              v-model="bugForm.stepsToReproduce"
              :default-config="editorConfig"
              style="height:300px;overflow-y:hidden"
              mode="simple"
              @on-created="onEditorCreated"
            />
          </div>
        </div>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="bugForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
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
  ref, watch, shallowRef, onBeforeUnmount, computed, nextTick,
} from 'vue';
import { ElMessage } from 'element-plus';
import { MagicStick } from '@element-plus/icons-vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import '@wangeditor/editor/dist/css/style.css';
import { createBug, updateBug, suggestAssignee } from '@/api/bug';
import { getModuleFlatList } from '@/api/module';
import request from '@/utils/request';
import { useAi } from '@/composables/useAi'
import { markdownToHtml } from '@/utils/markdown';
import UserCascader from '@/components/UserCascader.vue';
import ModernSelect from '@/components/ModernSelect.vue';

const props = defineProps({
  visible: Boolean,
  editingId: {
    type: Number,
    default: null,
  },
  initialForm: {
    type: Object,
    default: null,
  },
  userList: {
    type: Array,
    default: () => [],
  },
  projectList: {
    type: Array,
    default: () => [],
  },
  versionOptions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:visible', 'saved']);

const ai = useAi();
const suggestions = ref([]);
const fetchSuggestions = async () => {
  try {
    const res = await suggestAssignee({ module: bugForm.value.module || undefined });
    suggestions.value = res.data || [];
  } catch {
    suggestions.value = [];
  }
};

const formRef = ref(null);
const title = ref('提交Bug');
const severityOptions = ['致命', '严重', '一般', '轻微', '建议'];

// ModernSelect 选项
const bugTypeOptions = [
  { label: '代码错误', value: '代码错误' },
  { label: '界面优化', value: '界面优化' },
  { label: '设计缺陷', value: '设计缺陷' },
  { label: '性能问题', value: '性能问题' },
  { label: '安全相关', value: '安全相关' },
  { label: '其他', value: '其他' },
];
const moduleSelectOptions = computed(() =>
  moduleOptions.value.map((m: any) => ({ label: m.fullName, value: m.name }))
);
const severitySelectOptions = computed(() =>
  severityOptions.map((s: string) => ({ label: s, value: s }))
);
const bugPriorityOptions = [
  { label: 'P0 - 最高', value: 'P0' },
  { label: 'P1 - 高', value: 'P1' },
  { label: 'P2 - 中', value: 'P2' },
  { label: 'P3 - 低', value: 'P3' },
];
const projectSelectOptions = computed(() =>
  (props.projectList || []).map((p: any) => ({ label: p.name, value: p.id }))
);
const versionSelectOptions = computed(() =>
  (props.versionOptions || []).map((v: any) => ({ label: v.name, value: v.id }))
);

const moduleOptions = ref([]);
const fetchModules = async () => {
  try {
    const res = await getModuleFlatList();
    moduleOptions.value = res.data || [];
  } catch {
    // 获取模块列表失败
  }
};

// ── AI 生成重现步骤 ──
const handleAiGenerateSteps = async () => {
  if (!bugForm.value.title) {
    ElMessage.warning('请先填写 Bug 标题');
    return;
  }
  const prompt = [
    '你是一个专业的软件测试工程师。请根据以下 Bug 信息，生成一段结构化的 Bug 重现步骤。',
    '',
    `Bug 标题：${bugForm.value.title}`,
    `Bug 类型：${bugForm.value.bugType}`,
    bugForm.value.module ? `所属模块：${bugForm.value.module}` : '',
    '',
    '请按以下格式输出：',
    '【前置条件】\n（如有特殊的前置条件）',
    '\n【操作步骤】\n1. 第一步\n2. 第二步\n3. 第三步',
    '\n【预期结果】\n（系统应该有的正确行为）',
    '\n【实际结果】\n（当前实际发生的错误行为）',
  ].filter(Boolean).join('\n');

  try {
    const result = await ai.complete(prompt);
    bugForm.value.stepsToReproduce = markdownToHtml(result);
    ElMessage.success('重现步骤已生成');
  } catch (e: any) {
    ElMessage.error(e.message || 'AI 生成失败');
  }
};

const editorRef = shallowRef(null);
const toolbarConfig = {};
const editorConfig = {
  placeholder: '请详细描述重现步骤，支持直接粘贴图片...',
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
          ElMessage.error('图片上传失败，请重试');
        }
      },
    },
  },
};

const onEditorCreated = (editor) => { editorRef.value = editor; };

onBeforeUnmount(() => {
  if (editorRef.value) editorRef.value.destroy();
});

const defaultBugForm = () => ({
  title: '',
  module: '',
  bugType: '代码错误',
  severity: '一般',
  priority: 'P1',
  assignee: null,
  project: null,
  versionId: null,
  stepsToReproduce: '',
  remark: '',
});

const bugForm = ref(defaultBugForm());

const bugFormRules = {
  title: [{ required: true, message: '请输入Bug标题', trigger: 'blur' }],
  bugType: [{ required: true, message: '请选择Bug类型', trigger: 'change' }],
  severity: [{ required: true, message: '请选择严重程度', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  assignee: [{ required: true, message: '请选择指派人', trigger: 'change' }],
  stepsToReproduce: [{ required: true, message: '请输入重现步骤', trigger: 'blur' }],
};

watch(() => props.visible, (val) => {
  if (val) {
    title.value = props.editingId ? '编辑Bug' : '提交Bug';
    bugForm.value = props.initialForm ? { ...defaultBugForm(), ...props.initialForm } : defaultBugForm();
    fetchModules();
    nextTick(() => fetchSuggestions());
  }
});

const handleSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    const payload = {
      title: bugForm.value.title,
      module: bugForm.value.module || '',
      bug_type: bugForm.value.bugType,
      severity: bugForm.value.severity,
      priority: bugForm.value.priority,
      assignee: bugForm.value.assignee,
      project: bugForm.value.project || null,
      version: bugForm.value.versionId || null,
      steps_to_reproduce: bugForm.value.stepsToReproduce,
      remark: bugForm.value.remark,
    };
    if (props.editingId) {
      await updateBug(props.editingId, payload);
      ElMessage.success('Bug已更新');
    } else {
      await createBug(payload);
      ElMessage.success('Bug已提交');
    }
    emit('update:visible', false);
    emit('saved');
  } catch {
    // 校验失败或请求失败
  }
};
</script>

<style scoped>
.user-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-suggest-list {
  padding: 4px;
}
.ai-suggest-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  color: var(--text-primary);
  transition: background 0.12s;
  &:hover { background: var(--bg-hover); }
}
.ai-suggest-name {
  font-weight: 500;
  flex-shrink: 0;
}
.ai-suggest-meta {
  font-size: 11px;
  color: var(--text-placeholder);
  margin-left: auto;
  white-space: nowrap;
}
</style>
