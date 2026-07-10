<template>
  <el-dialog
    :model-value="visible"
    :title="step === 'input' ? '从飞书导入' : '预览并创建需求'"
    width="800px"
    @update:model-value="handleDialogClose"
  >
    <!-- 第一步：输入飞书文档链接 -->
    <div v-if="step === 'input'">
      <el-form ref="urlFormRef" :model="urlForm" :rules="urlRules" label-width="0">
        <el-form-item prop="docUrl">
          <el-input
            v-model="urlForm.docUrl"
            placeholder="请粘贴飞书文档链接，如 https://xxx.feishu.cn/docx/xxx"
            clearable
            :disabled="parsing"
          >
            <template #prefix>
              <el-icon><Link /></el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <div v-if="parsing" class="parsing-tip">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在解析文档...</span>
      </div>
    </div>

    <!-- 第二步：预览编辑表单 -->
    <el-form v-if="step === 'preview'" ref="formRef" :model="form" :rules="formRules" label-width="80px">
      <el-form-item label="需求标题" prop="title">
        <el-input v-model="form.title" placeholder="请输入需求标题" />
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="所属产品" prop="product">
            <el-select v-model="form.product" placeholder="请选择产品" clearable style="width: 100%">
              <el-option v-for="p in productList" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="优先级" prop="priority">
            <el-select v-model="form.priority" placeholder="请选择" style="width: 100%">
              <el-option label="高" value="高" />
              <el-option label="中" value="中" />
              <el-option label="低" value="低" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="状态">
            <el-select v-model="form.status" style="width: 100%">
              <el-option label="新建" value="新建" />
              <el-option label="开发中" value="开发中" />
              <el-option label="已完成" value="已完成" />
              <el-option label="已关闭" value="已关闭" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="指派给">
            <UserCascader v-model="form.assignee" :user-list="userList" placeholder="请选择" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="描述">
        <div class="doc-preview" v-html="form.description" />
      </el-form-item>
    </el-form>

    <template #footer>
      <template v-if="step === 'input'">
        <el-button @click="handleDialogClose(false)">取消</el-button>
        <el-button type="primary" :loading="parsing" @click="handleParse">解析</el-button>
      </template>
      <template v-else>
        <el-button @click="handleDialogClose(false)">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">确认创建</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Link, Loading } from '@element-plus/icons-vue';
import { parseFeishuDoc, createStory } from '@/api/story';
import UserCascader from '@/components/UserCascader.vue';

const FEISHU_URL_REGEX = /https?:\/\/[\w.-]+\.(feishu\.cn|larkoffice\.com)\/(docx|wiki|docs)\/([\w-]+)/;

const props = defineProps({
  visible: Boolean,
  productList: { type: Array, default: () => [] },
  userList: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:visible', 'imported']);

const step = ref('input');
const parsing = ref(false);
const creating = ref(false);

const urlFormRef = ref(null);
const urlForm = ref({ docUrl: '' });

const validateDocUrl = (_rule, value, callback) => {
  if (!value || !value.trim()) {
    callback(new Error('请输入飞书文档链接'));
  } else if (!FEISHU_URL_REGEX.test(value.trim())) {
    callback(new Error('请输入有效的飞书文档链接'));
  } else {
    callback();
  }
};

const urlRules = {
  docUrl: [{ validator: validateDocUrl, trigger: 'blur' }],
};

const formRef = ref(null);

const defaultForm = () => ({
  title: '',
  description: '',
  product: null,
  priority: '中',
  status: '新建',
  assignee: null,
  estimate: '',
});

const form = ref(defaultForm());

const formRules = {
  title: [{ required: true, message: '请输入需求标题', trigger: 'blur' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
};

watch(() => props.visible, (val) => {
  if (val) {
    step.value = 'input';
    urlForm.value = { docUrl: '' };
    form.value = defaultForm();
    parsing.value = false;
    creating.value = false;
  }
});

const handleDialogClose = (val) => { emit('update:visible', val); };

const handleParse = async () => {
  if (!urlFormRef.value) return;
  try {
    await urlFormRef.value.validate();
  } catch {
    return;
  }
  parsing.value = true;
  try {
    const res = await parseFeishuDoc({ url: urlForm.value.docUrl.trim() });
    if (res.code === 200 && res.data) {
      form.value.title = res.data.title || '';
      form.value.description = res.data.content || '';
      step.value = 'preview';
    } else {
      ElMessage.error(res.message || '解析失败，请重试');
    }
  } catch {
    // 错误消息由全局拦截器统一处理
  } finally {
    parsing.value = false;
  }
};

const handleCreate = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }
  creating.value = true;
  try {
    await createStory(form.value);
    ElMessage.success('导入成功');
    emit('update:visible', false);
    emit('imported');
  } catch {
    // 错误消息由全局拦截器统一处理
  } finally {
    creating.value = false;
  }
};
</script>

<style scoped lang="scss">
.parsing-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.doc-preview {
  width: 100%;
  max-height: 320px;
  overflow-y: auto;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);

  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin: 12px 0 6px;
    font-weight: 600;
  }
  :deep(p) { margin: 4px 0; }
  :deep(ul), :deep(ol) { padding-left: 20px; margin: 4px 0; }
  :deep(li) { margin: 2px 0; }
  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
  }
  :deep(th), :deep(td) {
    border: 1px solid var(--border-color);
    padding: 6px 10px;
    vertical-align: top;
  }
  :deep(th) { background: var(--bg-elevated); font-weight: 600; }
  :deep(blockquote) {
    border-left: 3px solid var(--border-color);
    margin: 6px 0;
    padding: 4px 12px;
    color: var(--text-regular);
  }
  :deep(pre) {
    background: var(--bg-elevated);
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
  }
  :deep(hr) { border: none; border-top: 1px solid var(--border-color); margin: 10px 0; }
  :deep(img) { max-width: 100%; }
}
</style>
