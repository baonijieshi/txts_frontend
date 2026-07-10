<template>
  <el-dialog
    :model-value="visible"
    :title="editingId ? '编辑问题' : '提交问题'"
    width="720px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px" style="margin-top:8px">
      <!-- 流程步骤条（编辑时可见） -->
      <div v-if="editingId" class="flow-section">
        <div class="flow-title">处理流程</div>
        <el-steps
          :active="stepIndex(form.status)"
          finish-status="success"
          simple
          class="ticket-steps"
        >
          <el-step v-for="s in STEPS" :key="s" :title="s" />
        </el-steps>
        <div class="step-actions">
          <el-button size="small" :disabled="stepIndex(form.status) === 0" @click="prevStep">上一步</el-button>
          <span class="step-current">{{ form.status }}</span>
          <el-button
            size="small"
            type="primary"
            :disabled="stepIndex(form.status) === STEPS.length - 1"
            @click="nextStep"
          >下一步</el-button>
        </div>
      </div>
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item label="标题" prop="title">
            <el-input v-model="form.title" placeholder="请一句话概括问题内容" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="类型" prop="ticket_type">
            <el-select v-model="form.ticket_type" style="width:100%">
              <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="优先级" prop="priority">
            <el-select v-model="form.priority" style="width:100%">
              <el-option v-for="p in ['P0','P1','P2','P3']" :key="p" :label="p" :value="p" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="模块">
            <el-select v-model="form.module" placeholder="选择模块" clearable filterable style="width:100%">
              <el-option
                v-for="m in moduleList"
                :key="m.id"
                :label="m.fullName || m.name"
                :value="m.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="处理人">
            <UserCascader v-model="form.assignee" :user-list="userList" placeholder="请选择" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="测试处理人">
            <UserCascader v-model="form.test_assignee" :user-list="testUserList" placeholder="请选择" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="研发处理人">
            <UserCascader v-model="form.dev_assignee" :user-list="devUserList" placeholder="请选择" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="描述">
        <div style="border: 1px solid var(--border-color); border-radius: 4px; width: 100%">
          <Toolbar
            :editor="editorRef"
            :default-config="toolbarConfig"
            :mode="mode"
            style="border-bottom: 1px solid var(--border-color)"
          />
          <Editor
            v-model="form.description"
            :default-config="editorConfig"
            :mode="mode"
            style="height: 220px"
            @on-created="onEditorCreated"
          />
        </div>
      </el-form-item>
      <el-form-item v-if="editingId" label="解决方案">
        <el-input v-model="form.solution" type="textarea" :rows="3" placeholder="请填写解决方案" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, watch, shallowRef, onBeforeUnmount,
} from 'vue';
import { ElMessage } from 'element-plus';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import '@wangeditor/editor/dist/css/style.css';
import { createTicket, updateTicket } from '@/api/ticket';
import { getModuleFlatList } from '@/api/module';
import request from '@/utils/request';
import UserCascader from '@/components/UserCascader.vue';
import { STEPS, stepIndex, typeOptions } from '../ticketConstants';

const props = defineProps({
  visible: { type: Boolean, default: false },
  editingRow: { type: Object, default: null },
  userList: { type: Array, default: () => [] },
  testUserList: { type: Array, default: () => [] },
  devUserList: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:visible', 'saved']);

const editingId = ref(null);
const submitting = ref(false);
const formRef = ref(null);
const moduleList = ref([]);

const fetchModules = async () => {
  try {
    const res = await getModuleFlatList();
    moduleList.value = res.data || [];
  } catch {
    // 获取模块列表失败
  }
};

const defaultForm = () => ({
  title: '',
  ticket_type: '问题',
  priority: 'P1',
  status: STEPS[0],
  module: null,
  assignee: null,
  test_assignee: null,
  dev_assignee: null,
  description: '',
  solution: '',
  remark: '',
});

const form = ref(defaultForm());

const formRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  ticket_type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
};

const nextStep = () => {
  const i = stepIndex(form.value.status);
  if (i < STEPS.length - 1) form.value.status = STEPS[i + 1];
};
const prevStep = () => {
  const i = stepIndex(form.value.status);
  if (i > 0) form.value.status = STEPS[i - 1];
};

// 富文本
const editorRef = shallowRef();
const toolbarConfig = {};
const editorConfig = {
  placeholder: '请描述问题或需求详情，支持直接粘贴图片...',
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
const onEditorCreated = (editor) => { editorRef.value = editor; };
onBeforeUnmount(() => { if (editorRef.value) editorRef.value.destroy(); });

watch(() => props.visible, (val) => {
  if (val) {
    fetchModules();
    if (props.editingRow) {
      editingId.value = props.editingRow.id;
      form.value = {
        title: props.editingRow.title,
        ticket_type: props.editingRow.ticket_type,
        priority: props.editingRow.priority,
        status: props.editingRow.status,
        module: props.editingRow.module || null,
        assignee: props.editingRow.assignee || null,
        test_assignee: props.editingRow.test_assignee || null,
        dev_assignee: props.editingRow.dev_assignee || null,
        description: props.editingRow.description || '',
        solution: props.editingRow.solution || '',
        remark: props.editingRow.remark || '',
      };
    } else {
      editingId.value = null;
      form.value = defaultForm();
    }
  } else if (editorRef.value) {
    editorRef.value.setHtml('');
  }
});

const handleSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    submitting.value = true;
    if (editingId.value) {
      await updateTicket(editingId.value, form.value);
      ElMessage.success('问题已更新');
    } else {
      await createTicket(form.value);
      ElMessage.success('问题已提交');
    }
    emit('update:visible', false);
    emit('saved');
  } catch {
    // 校验或提交失败
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped lang="scss">
.flow-section {
  margin-bottom: 18px;
}

.flow-title {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}

.ticket-steps {
  width: 100%;
  margin-bottom: 8px;

  :deep(.el-step__title) {
    font-size: 11px;
  }
}

.step-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 10px;

  .step-current {
    font-size: 12px;
    color: var(--el-color-primary);
    font-weight: 500;
    min-width: 90px;
    text-align: center;
  }
}

.user-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
