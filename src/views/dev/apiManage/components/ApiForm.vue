<template>
  <el-drawer
    :model-value="visible"
    :title="editingId ? '编辑接口' : '新增接口'"
    size="620px"
    direction="rtl"
    :before-close="handleClose"
    @update:model-value="$emit('update:visible', $event)"
  >
    <!-- 顶部 Method + Path 预览条 -->
    <div class="request-preview-bar">
      <span class="rp-method" :class="`method-${form.method}`">{{ form.method || 'METHOD' }}</span>
      <code class="rp-path">{{ form.path || '/api/path' }}</code>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="90px"
      label-position="left"
      class="api-form"
    >
      <div class="form-section">
        <el-form-item label="接口名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入接口名称" clearable />
        </el-form-item>
        <div class="form-row-2col">
          <el-form-item label="HTTP Method" prop="method">
            <el-select v-model="form.method" placeholder="选择方法" style="width: 100%">
              <el-option v-for="m in HTTP_METHODS" :key="m" :label="m" :value="m">
                <span class="method-opt" :class="`method-${m}`">{{ m }}</span>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="所属服务">
            <el-select v-model="form.service" placeholder="选择服务（选填）" clearable style="width: 100%">
              <el-option v-for="svc in serviceList" :key="svc.id" :label="svc.name" :value="svc.id" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="接口路径" prop="path">
          <el-input v-model="form.path" placeholder="例如：/api/users/{id}" clearable>
            <template #prefix><el-icon><Link /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="接口描述（选填）" />
        </el-form-item>
      </div>

      <!-- 请求参数区域 -->
      <div class="collapsible-panel">
        <div class="panel-header" @click="paramsExpanded = !paramsExpanded">
          <div class="panel-header-left">
            <el-icon class="toggle-icon" :class="{ 'is-expanded': paramsExpanded }"><ArrowRight /></el-icon>
            <span class="panel-title">请求参数</span>
            <span class="param-count-badge">{{ totalParamCount }}</span>
          </div>
        </div>
        <div class="panel-body" :class="{ 'is-expanded': paramsExpanded }">
          <el-tabs v-model="activeParamTab" class="param-tabs">
            <el-tab-pane name="path">
              <template #label>Path <span v-if="form.parameters.path.length" class="tab-count">{{ form.parameters.path.length }}</span></template>
              <div class="param-table">
                <div v-for="(row, idx) in form.parameters.path" :key="idx" class="param-row">
                  <span class="row-idx">{{ idx + 1 }}</span>
                  <el-input v-model="row.key" placeholder="Key" size="small" />
                  <el-select v-model="row.type" size="small" style="width:88px;flex-shrink:0">
                    <el-option v-for="t in FIELD_TYPES" :key="t" :label="t" :value="t" />
                  </el-select>
                  <el-input v-model="row.value" placeholder="Value" size="small" />
                  <el-input v-model="row.description" placeholder="描述" size="small" />
                  <el-checkbox v-model="row.required" style="flex-shrink:0">必填</el-checkbox>
                  <el-button size="small" type="danger" link @click="removeParam('path', idx)">删除</el-button>
                </div>
                <el-button size="small" type="primary" link @click="addParam('path')">+ 添加参数</el-button>
              </div>
            </el-tab-pane>
            <el-tab-pane name="query">
              <template #label>Query <span v-if="form.parameters.query.length" class="tab-count">{{ form.parameters.query.length }}</span></template>
              <div class="param-table">
                <div v-for="(row, idx) in form.parameters.query" :key="idx" class="param-row">
                  <span class="row-idx">{{ idx + 1 }}</span>
                  <el-input v-model="row.key" placeholder="Key" size="small" />
                  <el-select v-model="row.type" size="small" style="width:88px;flex-shrink:0">
                    <el-option v-for="t in FIELD_TYPES" :key="t" :label="t" :value="t" />
                  </el-select>
                  <el-input v-model="row.value" placeholder="Value" size="small" />
                  <el-input v-model="row.description" placeholder="描述" size="small" />
                  <el-checkbox v-model="row.required" style="flex-shrink:0">必填</el-checkbox>
                  <el-button size="small" type="danger" link @click="removeParam('query', idx)">删除</el-button>
                </div>
                <el-button size="small" type="primary" link @click="addParam('query')">+ 添加参数</el-button>
              </div>
            </el-tab-pane>
            <el-tab-pane name="header">
              <template #label>Header <span v-if="form.parameters.header.length" class="tab-count">{{ form.parameters.header.length }}</span></template>
              <div class="param-table">
                <div v-for="(row, idx) in form.parameters.header" :key="idx" class="param-row">
                  <span class="row-idx">{{ idx + 1 }}</span>
                  <el-input v-model="row.key" placeholder="Key" size="small" />
                  <el-select v-model="row.type" size="small" style="width:88px;flex-shrink:0">
                    <el-option v-for="t in FIELD_TYPES" :key="t" :label="t" :value="t" />
                  </el-select>
                  <el-input v-model="row.value" placeholder="Value" size="small" />
                  <el-input v-model="row.description" placeholder="描述" size="small" />
                  <el-checkbox v-model="row.required" style="flex-shrink:0">必填</el-checkbox>
                  <el-button size="small" type="danger" link @click="removeParam('header', idx)">删除</el-button>
                </div>
                <el-button size="small" type="primary" link @click="addParam('header')">+ 添加参数</el-button>
              </div>
            </el-tab-pane>
            <el-tab-pane name="body">
              <template #label>Body</template>
              <!-- Body 类型选择栏 -->
              <div class="body-type-bar">
                <span
                  v-for="t in BODY_TYPES"
                  :key="t.value"
                  class="body-type-item"
                  :class="{ 'is-active': bodyType === t.value }"
                  @click="switchBodyType(t.value)"
                >{{ t.label }}</span>
              </div>
              <!-- none -->
              <div v-if="bodyType === 'none'" class="body-none-tip">
                <el-icon><InfoFilled /></el-icon>
                <span>该请求没有 Body 参数</span>
              </div>
              <!-- form-data / x-www-form-urlencoded：键值对 -->
              <div v-else-if="isFormBodyType" class="param-table">
                <div v-for="(row, idx) in currentBodyRows" :key="idx" class="param-row">
                  <span class="row-idx">{{ idx + 1 }}</span>
                  <el-input v-model="row.key" placeholder="Key" size="small" />
                  <el-input v-model="row.value" placeholder="Value" size="small" />
                  <el-input v-model="row.description" placeholder="描述" size="small" />
                  <el-button size="small" type="danger" link @click="removeBodyRow(idx)">删除</el-button>
                </div>
                <el-button size="small" type="primary" link @click="addBodyRow">+ 添加参数</el-button>
              </div>
              <!-- JSON：树形字段编辑器 -->
              <div v-else-if="bodyType === 'json'">
                <div class="json-field-header">
                  <span class="col-name">字段名</span>
                  <span class="col-type">类型</span>
                  <span class="col-required">必填</span>
                  <span class="col-desc">描述</span>
                  <span class="col-action" />
                </div>
                <div
                  v-for="(field, idx) in bodyStore.json"
                  :key="idx"
                  class="json-field-row"
                >
                  <span class="row-idx">{{ idx + 1 }}</span>
                  <el-input v-model="field.key" placeholder="字段名" size="small" class="col-name" />
                  <el-select v-model="field.type" size="small" class="col-type">
                    <el-option v-for="t in FIELD_TYPES" :key="t" :label="t" :value="t" />
                  </el-select>
                  <el-checkbox v-model="field.required" class="col-required" />
                  <el-input v-model="field.description" placeholder="描述" size="small" class="col-desc" />
                  <el-button size="small" type="danger" link class="col-action" @click="removeJsonField(idx)">删除</el-button>
                </div>
                <el-button size="small" type="primary" link @click="addJsonField">+ 添加字段</el-button>
              </div>
              <!-- XML / Text / Binary：文本编辑器 -->
              <div v-else>
                <el-input
                  v-model="bodyStore[bodyType]"
                  type="textarea"
                  :rows="8"
                  :placeholder="bodyPlaceholder(bodyType)"
                />
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <!-- 响应示例区域 -->
      <div class="collapsible-panel">
        <div class="panel-header" @click="responseExpanded = !responseExpanded">
          <div class="panel-header-left">
            <el-icon class="toggle-icon" :class="{ 'is-expanded': responseExpanded }"><ArrowRight /></el-icon>
            <span class="panel-title">响应示例</span>
          </div>
        </div>
        <div class="panel-body" :class="{ 'is-expanded': responseExpanded }">
          <el-input v-model="form.response_example" type="textarea" :rows="6" placeholder="粘贴响应示例 JSON（选填）" />
        </div>
      </div>
    </el-form>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存接口</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, reactive, computed, watch
} from 'vue';
import { ArrowRight, Link, InfoFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import {
  createApi, getApiDetail, updateApi, getServiceList,
} from '@/api/apiManage';

const props = defineProps({
  visible: { type: Boolean, default: false },
  editingId: { type: [Number, String], default: null },
  defaultServiceId: { type: [Number, String], default: null },
});
const emit = defineEmits(['update:visible', 'saved']);

const serviceList = ref([]);
async function loadServices() {
  const res = await getServiceList();
  if (res.code === 200) serviceList.value = res.data || [];
}
loadServices();

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const BODY_TYPES = [
  { label: 'none', value: 'none' },
  { label: 'form-data', value: 'form-data' },
  { label: 'x-www-form-urlencoded', value: 'x-www-form-urlencoded' },
  { label: 'JSON', value: 'json' },
  { label: 'XML', value: 'xml' },
  { label: 'Text', value: 'text' },
  { label: 'Binary', value: 'binary' },
];
const FORM_TYPES = ['form-data', 'x-www-form-urlencoded'];
const FIELD_TYPES = ['string', 'integer', 'number', 'boolean', 'object', 'array'];

function bodyPlaceholder(type) {
  if (type === 'xml') return '<root>\n  <key>value</key>\n</root>';
  if (type === 'binary') return '（Binary 类型请在调试面板中上传文件）';
  return '请输入内容';
}

const formRef = ref(null);
const saving = ref(false);
const paramsExpanded = ref(false);
const responseExpanded = ref(false);
const activeParamTab = ref('query');

const totalParamCount = computed(() => {
  const q = form.parameters.query.length;
  const h = form.parameters.header.length;
  const p = form.parameters.path.length;
  return q + h + p;
});

// body 类型独立存储
const bodyType = ref('none');
const bodyStore = reactive({
  'form-data': [],
  'x-www-form-urlencoded': [],
  json: [],
  xml: '',
  text: '',
  binary: '',
});

const isFormBodyType = computed(() => FORM_TYPES.includes(bodyType.value));
const currentBodyRows = computed(() => bodyStore[bodyType.value] || []);

function switchBodyType(newType) {
  bodyType.value = newType;
}

function addBodyRow() {
  const key = bodyType.value;
  if (!Array.isArray(bodyStore[key])) bodyStore[key] = [];
  bodyStore[key].push({ key: '', value: '', description: '' });
}
function removeBodyRow(index) {
  const key = bodyType.value;
  if (Array.isArray(bodyStore[key])) bodyStore[key].splice(index, 1);
}

function addJsonField() {
  bodyStore.json.push({
    key: '', type: 'string', required: false, description: '',
  });
}
function removeJsonField(index) {
  bodyStore.json.splice(index, 1);
}

function serializeBody() {
  if (bodyType.value === 'none') return { type: 'none', content: '' };
  if (FORM_TYPES.includes(bodyType.value)) {
    return { type: bodyType.value, content: bodyStore[bodyType.value] };
  }
  return { type: bodyType.value, content: bodyStore[bodyType.value] };
}

function schemaToFields(schema) {
  if (!schema || typeof schema !== 'object') return [];
  const props = schema.properties || {};
  const required = Array.isArray(schema.required) ? schema.required : [];
  return Object.entries(props).map(([k, v]) => ({
    key: k,
    type: v.type || 'string',
    required: required.includes(k),
    description: v.title || v.description || '',
  }));
}

function restoreBody(rawBody) {
  bodyStore['form-data'] = [];
  bodyStore['x-www-form-urlencoded'] = [];
  bodyStore.json = [];
  bodyStore.xml = '';
  bodyStore.text = '';
  bodyStore.binary = '';

  if (!rawBody) { bodyType.value = 'none'; return; }
  if (Array.isArray(rawBody)) {
    bodyType.value = 'form-data';
    bodyStore['form-data'] = rawBody;
    return;
  }
  const t = rawBody.type || 'none';
  bodyType.value = t;
  if (t === 'none') return;
  if (FORM_TYPES.includes(t)) {
    bodyStore[t] = Array.isArray(rawBody.content) ? rawBody.content : [];
  } else if (t === 'json') {
    const { content } = rawBody;
    if (Array.isArray(content)) {
      bodyStore.json = content;
    } else if (typeof content === 'string' && content.trim()) {
      try {
        bodyStore.json = schemaToFields(JSON.parse(content));
      } catch {
        bodyStore.json = [];
      }
    } else if (content && typeof content === 'object') {
      bodyStore.json = schemaToFields(content);
    }
  } else {
    bodyStore[t] = typeof rawBody.content === 'string' ? rawBody.content : '';
  }
}

const form = reactive({
  name: '',
  method: '',
  path: '',
  description: '',
  service: null,
  parameters: { query: [], header: [], path: [] },
  response_example: '',
  response_data: {},
});

const rules = {
  name: [{ required: true, message: '请输入接口名称', trigger: 'blur' }],
  method: [{ required: true, message: '请选择 HTTP Method', trigger: 'change' }],
  path: [{ required: true, message: '请输入接口路径', trigger: 'blur' }],
};

function addParam(tab) { form.parameters[tab].push({ key: '', value: '', type: 'string', description: '', required: false }); }
function removeParam(tab, index) { form.parameters[tab].splice(index, 1); }

function resetForm() {
  form.name = '';
  form.method = '';
  form.path = '';
  form.description = '';
  form.service = props.defaultServiceId ?? null;
  form.parameters.query = [];
  form.parameters.header = [];
  form.parameters.path = [];
  form.response_example = '';
  form.response_data = {};
  restoreBody(null);
  paramsExpanded.value = false;
  responseExpanded.value = false;
  activeParamTab.value = 'query';
  formRef.value?.clearValidate();
}

watch(() => props.visible, async (val) => {
  if (val) {
    resetForm();
    if (props.editingId) {
      try {
        const res = await getApiDetail(props.editingId);
        if (res?.data) {
          const d = res.data;
          form.name = d.name || '';
          form.method = d.method || '';
          form.path = d.path || '';
          form.description = d.description || '';
          form.service = d.service ?? null;
          form.response_example = d.response_example || '';
          form.response_data = d.response_data || {};
          const p = d.parameters || {};
          // 补全历史数据中缺失的 type 字段
          const normalizeParam = (arr) => (Array.isArray(arr) ? arr : []).map((item) => ({ type: 'string', required: false, ...item }));
          form.parameters.query = normalizeParam(p.query);
          form.parameters.header = normalizeParam(p.header);
          form.parameters.path = normalizeParam(p.path);
          restoreBody(p.body);
        }
      } catch { ElMessage.error('获取接口详情失败'); }
    }
  }
});

function handleClose() { emit('update:visible', false); }

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const payload = {
      name: form.name,
      method: form.method,
      path: form.path,
      description: form.description,
      service: form.service,
      parameters: {
        query: form.parameters.query,
        header: form.parameters.header,
        path: form.parameters.path,
        body: serializeBody(),
      },
      response_example: form.response_example,
      response_data: form.response_data,
    };
    if (props.editingId) {
      await updateApi(props.editingId, payload);
      ElMessage.success('接口已更新');
    } else {
      await createApi(payload);
      ElMessage.success('接口已保存');
    }
    emit('update:visible', false);
    emit('saved');
  } catch { /* request.js 拦截器统一处理 */ } finally { saving.value = false; }
}
</script>

<style scoped lang="scss">
// 顶部请求预览条
.request-preview-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-bottom: 20px;
}

.rp-method {
  font-size: 12px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
  padding: 3px 10px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  flex-shrink: 0;

  &.method-GET { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.method-POST { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.method-PUT { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.method-PATCH { background: var(--bg-hover); color: var(--text-secondary); }
  &.method-DELETE { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
}

.rp-path {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 表单区域
.api-form {
  :deep(.el-form-item) { margin-bottom: 16px; }
}

.form-section {
  padding-bottom: 8px;
}

.form-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}

.method-opt {
  font-size: 12px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
  letter-spacing: 0.5px;

  &.method-GET { color: var(--el-color-success); }
  &.method-POST { color: var(--el-color-primary); }
  &.method-PUT { color: var(--el-color-warning); }
  &.method-DELETE { color: var(--el-color-danger); }
}

// 可折叠面板
.collapsible-panel {
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  cursor: pointer;
  background: var(--bg-elevated);
  user-select: none;
  transition: background 0.15s;

  &:hover { background: var(--bg-hover); }
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-icon {
  font-size: 14px;
  color: var(--text-secondary);
  transition: transform 200ms ease;
  &.is-expanded { transform: rotate(90deg); }
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.param-count-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-hover);
  border-radius: 10px;
  padding: 1px 7px;
}

.panel-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 300ms ease;
  &.is-expanded { max-height: 1000px; }
  padding: 0 14px;

  &.is-expanded { padding: 14px; }
}

// Tabs
.param-tabs {
  :deep(.el-tabs__header) { margin-bottom: 10px; }
}

.tab-count {
  font-size: 11px;
  font-weight: 600;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 8px;
  padding: 1px 5px;
  margin-left: 4px;
}

// 参数行
.param-table { padding: 4px 0; }

.param-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  .el-input { flex: 1; }
}

.row-idx {
  font-size: 11px;
  color: var(--text-placeholder);
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

// Body 类型选择
.body-type-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 14px;
  padding: 4px;
  background: var(--bg-elevated);
  border-radius: 8px;
  border: 1px solid var(--border-color);

  .body-type-item {
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    color: var(--text-regular);
    transition: all 0.15s;

    &:hover { color: var(--el-color-primary); }
    &.is-active {
      color: var(--el-color-primary);
      font-weight: 600;
      background: var(--bg-card);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
  }
}

.body-none-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  padding: 16px 0;
  .el-icon { color: var(--text-placeholder); }
}

// JSON 字段编辑器
.json-field-header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 8px;
}

.json-field-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.col-name { flex: 2; min-width: 0; }
.col-type { flex: 1.2; min-width: 90px; }
.col-required { flex: 0 0 40px; display: flex; justify-content: center; }
.col-desc { flex: 2; min-width: 0; }
.col-action { flex: 0 0 36px; }

// Footer
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}
</style>
