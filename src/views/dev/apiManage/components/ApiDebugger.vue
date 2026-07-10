<template>
  <el-drawer
    :model-value="visible"
    title="接口调试"
    size="800px"
    direction="rtl"
    @update:model-value="$emit('update:visible', $event)"
  >
    <!-- 请求栏：两行布局 -->
    <div class="request-section">
      <div class="request-row env-row">
        <el-select
          v-if="envList.length > 0"
          :model-value="activeEnvId"
          placeholder="选择环境"
          class="env-select"
          @change="onEnvChange"
        >
          <el-option v-for="env in envList" :key="env.id" :label="env.name" :value="env.id">
            <div class="env-option">
              <span class="env-name">{{ env.name }}</span>
              <span class="env-url-hint">{{ env.url }}</span>
            </div>
          </el-option>
        </el-select>
        <el-input v-model="baseUrl" placeholder="Base URL（如 https://api.example.com）" class="base-url-input" clearable />
      </div>
      <div class="request-row main-row">
        <el-select v-model="method" class="method-select">
          <el-option v-for="m in HTTP_METHODS" :key="m" :label="m" :value="m">
            <span class="method-opt" :class="`method-${m}`">{{ m }}</span>
          </el-option>
        </el-select>
        <el-input v-model="url" placeholder="接口路径，如 /api/users/{id}" class="path-input" clearable />
        <el-button type="primary" :loading="loading" :disabled="loading" class="send-btn" @click="sendRequest">
          <el-icon v-if="!loading"><VideoPlay /></el-icon>
          {{ loading ? '发送中...' : '发送' }}
        </el-button>
      </div>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon closable class="error-alert" @close="error = ''" />

    <!-- 请求参数 Tabs -->
    <el-tabs v-model="activeTab" class="param-tabs">
      <el-tab-pane name="query">
        <template #label>Query <span v-if="enabledCount(queryParams)" class="tab-count">{{ enabledCount(queryParams) }}</span></template>
        <div class="param-table">
          <div v-for="(row, idx) in queryParams" :key="idx" class="param-row">
            <el-checkbox v-model="row.enabled" class="param-check" />
            <el-input v-model="row.key" placeholder="Key" size="small" :disabled="!row.enabled" />
            <el-input v-model="row.value" placeholder="Value" size="small" :disabled="!row.enabled" />
            <el-button size="small" type="danger" link @click="removeParam('query', idx)">删除</el-button>
          </div>
          <el-button size="small" type="primary" link @click="addParam('query')">+ 添加参数</el-button>
        </div>
      </el-tab-pane>
      <el-tab-pane name="header">
        <template #label>Header <span v-if="enabledCount(headerParams)" class="tab-count">{{ enabledCount(headerParams) }}</span></template>
        <div class="param-table">
          <div v-for="(row, idx) in headerParams" :key="idx" class="param-row">
            <el-checkbox v-model="row.enabled" class="param-check" />
            <el-input v-model="row.key" placeholder="Key" size="small" :disabled="!row.enabled" />
            <el-input v-model="row.value" placeholder="Value" size="small" :disabled="!row.enabled" />
            <el-button size="small" type="danger" link @click="removeParam('header', idx)">删除</el-button>
          </div>
          <el-button size="small" type="primary" link @click="addParam('header')">+ 添加参数</el-button>
        </div>
      </el-tab-pane>
      <el-tab-pane name="body">
        <template #label>Body</template>
        <div class="body-type-bar">
          <span
            v-for="t in BODY_TYPES"
            :key="t.value"
            class="body-type-item"
            :class="{ 'is-active': bodyType === t.value }"
            @click="switchBodyType(t.value)"
          >{{ t.label }}</span>
        </div>
        <div v-if="bodyType === 'none'" class="body-none-tip">
          <el-icon><InfoFilled /></el-icon>
          <span>该请求没有 Body 参数</span>
        </div>
        <div v-else-if="isFormBodyType" class="param-table">
          <div v-for="(row, idx) in currentBodyRows" :key="idx" class="param-row">
            <el-checkbox v-model="row.enabled" class="param-check" />
            <el-input v-model="row.key" placeholder="Key" size="small" :disabled="!row.enabled" />
            <el-input v-model="row.value" placeholder="Value" size="small" :disabled="!row.enabled" />
            <el-button size="small" type="danger" link @click="removeBodyRow(idx)">删除</el-button>
          </div>
          <el-button size="small" type="primary" link @click="addBodyRow">+ 添加参数</el-button>
        </div>
        <div v-else>
          <JsonEditor
            v-model="bodyStore[bodyType]"
            :placeholder="bodyPlaceholder(bodyType)"
          />
        </div>
      </el-tab-pane>
      <el-tab-pane name="pre">
        <template #label>前置操作</template>
        <div class="hook-tab-tip">发送请求前执行：可设置变量或发送前置 HTTP 请求（如获取 Token）</div>
        <HookEditor v-model="preHooks" />
      </el-tab-pane>
      <el-tab-pane name="post">
        <template #label>后置操作</template>
        <div class="hook-tab-tip">请求完成后执行：可提取响应变量或发送清理请求</div>
        <HookEditor v-model="postHooks" />
      </el-tab-pane>
    </el-tabs>

    <!-- 响应区域 -->
    <div v-if="response.status_code !== null" class="response-section">
      <div class="response-status-bar" :class="statusBarClass(response.status_code)">
        <span class="rs-label">STATUS</span>
        <span class="rs-code">{{ response.status_code }}</span>
        <span class="rs-text">{{ statusText(response.status_code) }}</span>
        <span class="rs-divider" />
        <span class="rs-time">{{ response.elapsed_ms }} ms</span>
      </div>
      <el-tabs v-model="responseTab" class="response-tabs">
        <el-tab-pane label="Body" name="body">
          <div class="response-body">
            <pre class="json-highlight" v-html="highlightJson(response.body)" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, reactive, computed, watch,
} from 'vue';
import { VideoPlay, InfoFilled } from '@element-plus/icons-vue';
import useDebugger from '@/composables/useDebugger';
import useEnv from '@/composables/useEnv';
import JsonEditor from '@/views/autotest/components/JsonEditor.vue';
import HookEditor from '@/views/autotest/components/HookEditor.vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  api: { type: Object, default: null },
  baseUrl: { type: String, default: '' },
});
defineEmits(['update:visible']);

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
const activeTab = ref('query');
const responseTab = ref('body');

function bodyPlaceholder(type) {
  if (type === 'xml') return '<root>\n  <key>value</key>\n</root>';
  if (type === 'binary') return '（Binary 类型暂不支持文本输入）';
  if (type === 'text') return '请输入文本内容';
  return '';
}

const {
  method, url, baseUrl, queryParams, headerParams,
  loading, response, error, addParam: origAddParam, removeParam: origRemoveParam,
} = useDebugger();

const { envList, activeEnvId, setActive } = useEnv();

function enabledCount(arr) {
  return (arr || []).filter((r) => r.enabled && r.key).length;
}

// Override addParam to include enabled flag
function addParam(tab) {
  if (tab === 'query') {
    queryParams.value.push({ key: '', value: '', enabled: true });
  } else {
    headerParams.value.push({ key: '', value: '', enabled: true });
  }
}

function removeParam(tab, idx) {
  if (tab === 'query') queryParams.value.splice(idx, 1);
  else headerParams.value.splice(idx, 1);
}

// body 类型独立存储
const bodyType = ref('none');
const bodyStore = reactive({
  'form-data': [],
  'x-www-form-urlencoded': [],
  json: '',
  xml: '',
  text: '',
  binary: '',
});

const preHooks = ref([]);
const postHooks = ref([]);

const isFormBodyType = computed(() => FORM_TYPES.includes(bodyType.value));
const currentBodyRows = computed(() => bodyStore[bodyType.value] || []);

function switchBodyType(newType) { bodyType.value = newType; }

function addBodyRow() {
  const key = bodyType.value;
  if (!Array.isArray(bodyStore[key])) bodyStore[key] = [];
  bodyStore[key].push({ key: '', value: '', enabled: true });
}

function removeBodyRow(idx) {
  const key = bodyType.value;
  if (Array.isArray(bodyStore[key])) bodyStore[key].splice(idx, 1);
}

function onEnvChange(id) {
  setActive(id);
  const env = envList.value.find((e) => e.id === id);
  if (env) baseUrl.value = env.url;
}

watch(() => props.api, (val) => {
  if (!val) return;
  if (val.method) method.value = val.method;
  if (val.path) url.value = val.path;
  if (props.baseUrl) baseUrl.value = props.baseUrl;

  const p = val.parameters || {};

  const query = Array.isArray(p.query) ? p.query : [];
  queryParams.value = query.length
    ? query.map((item) => ({ key: item.key || '', value: item.value || '', enabled: true }))
    : [{ key: '', value: '', enabled: true }];

  const header = Array.isArray(p.header) ? p.header : [];
  headerParams.value = header.length
    ? header.map((item) => ({ key: item.key || '', value: item.value || '', enabled: true }))
    : [{ key: '', value: '', enabled: true }];

  bodyStore['form-data'] = [];
  bodyStore['x-www-form-urlencoded'] = [];
  bodyStore.json = '';
  bodyStore.xml = '';
  bodyStore.text = '';
  bodyStore.binary = '';

  preHooks.value = [];
  postHooks.value = [];

  const body = p.body || {};
  const bType = body.type || 'none';
  bodyType.value = bType;

  if (FORM_TYPES.includes(bType)) {
    const rows = Array.isArray(body.content) ? body.content : [];
    bodyStore[bType] = rows.length
      ? rows.map((item) => ({ key: item.key || '', value: '', enabled: true }))
      : [{ key: '', value: '', enabled: true }];
  } else if (bType === 'json') {
    const fields = Array.isArray(body.content) ? body.content : [];
    if (fields.length) {
      const obj = {};
      fields.forEach((f) => { if (f.key) obj[f.key] = ''; });
      bodyStore.json = JSON.stringify(obj, null, 2);
    }
  }
}, { immediate: true });

async function sendRequest() {
  error.value = '';
  response.status_code = null;
  response.elapsed_ms = null;
  response.body = null;

  const fullUrl = baseUrl.value ? baseUrl.value.replace(/\/$/, '') + url.value : url.value;
  const params = {};
  queryParams.value.filter((r) => r.enabled).forEach(({ key, value }) => { if (key) params[key] = value; });
  const headers = {};
  headerParams.value.filter((r) => r.enabled).forEach(({ key, value }) => { if (key) headers[key] = value; });

  let body = null;
  if (bodyType.value !== 'none' && ['POST', 'PUT', 'PATCH'].includes(method.value.toUpperCase())) {
    if (isFormBodyType.value) {
      const fd = {};
      currentBodyRows.value.filter((r) => r.enabled).forEach(({ key, value }) => { if (key) fd[key] = value; });
      body = Object.keys(fd).length ? fd : null;
    } else {
      body = bodyStore[bodyType.value] || null;
    }
  }

  const { proxyRequest } = await import('@/api/apiManage');

  const hookCtx = {};
  await runHooks(preHooks.value, hookCtx, proxyRequest);

  loading.value = true;
  try {
    const res = await proxyRequest({
      url: fullUrl, method: method.value.toUpperCase(), headers, params, body,
    });
    if (res.code === 200) {
      response.status_code = res.data.status_code;
      response.elapsed_ms = res.data.elapsed_ms;
      response.body = res.data.body;
      await runHooks(postHooks.value, hookCtx, proxyRequest, res.data.body);
    } else {
      error.value = res.message || '请求失败';
    }
  } catch (e) {
    error.value = e?.message || '请求失败';
  } finally {
    loading.value = false;
  }
}

function resolveTpl(str, ctx) {
  return (str || '').replace(/\$\{([^}]+)\}/g, (m, key) => (key in ctx ? ctx[key] : m));
}

async function runHooks(hooks, ctx, proxyRequest, responseBody) {
  await (hooks || []).reduce(async (prev, hook) => {
    await prev;
    if (hook.type === 'set_var' && hook.var_name) {
      ctx[hook.var_name] = resolveTpl(hook.value, ctx);
    } else if (hook.type === 'http' && hook.url) {
      try {
        const res = await proxyRequest({
          url: resolveTpl(hook.url, ctx),
          method: (hook.method || 'GET').toUpperCase(),
          headers: {}, params: {},
          body: hook.body ? resolveTpl(hook.body, ctx) : null,
        });
        if (res.code === 200 && hook.extract?.var_name && hook.extract?.path) {
          const data = res.data.body;
          const val = hook.extract.path.split('.').reduce(
            (acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), data,
          );
          if (val !== undefined) ctx[hook.extract.var_name] = String(val);
        }
      } catch { /* ignore hook errors */ }
    } else if (hook.type === 'http' && !hook.url && responseBody && hook.extract?.var_name && hook.extract?.path) {
      const val = hook.extract.path.split('.').reduce(
        (acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), responseBody,
      );
      if (val !== undefined) ctx[hook.extract.var_name] = String(val);
    }
  }, Promise.resolve());
}

function statusBarClass(code) {
  if (!code) return '';
  if (code >= 200 && code < 300) return 'status-success';
  if (code >= 300 && code < 400) return 'status-redirect';
  if (code >= 400 && code < 500) return 'status-client-error';
  return 'status-server-error';
}

function statusText(code) {
  const map = { 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable' };
  return map[code] || '';
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightJson(data) {
  if (data === null || data === undefined) return 'null';
  let str;
  try {
    str = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    str = JSON.stringify(JSON.parse(str), null, 2);
  } catch { return escapeHtml(String(data)); }
  return escapeHtml(str).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) cls = /:$/.test(match) ? 'json-key' : 'json-string';
      else if (/true|false/.test(match)) cls = 'json-boolean';
      else if (/null/.test(match)) cls = 'json-null';
      return `<span class="${cls}">${match}</span>`;
    },
  );
}
</script>

<style scoped lang="scss">
// 请求区域
.request-section {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.request-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.env-row {
  .env-select { width: 140px; flex-shrink: 0; }
  .base-url-input { flex: 1; }
}

.main-row {
  .method-select { width: 110px; flex-shrink: 0; }
  .path-input { flex: 1; }
  .send-btn {
    flex-shrink: 0;
    padding: 8px 20px;
    font-weight: 600;
  }
}

.env-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.env-name { font-weight: 500; }
.env-url-hint {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
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

.error-alert { margin-bottom: 12px; }

// Tabs
.param-tabs {
  margin-bottom: 16px;
  :deep(.el-tabs__header) { margin-bottom: 10px; }
}

.tab-count {
  font-size: 11px;
  font-weight: 600;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 8px;
  padding: 1px 5px;
  margin-left: 3px;
}

// 参数表格
.param-table { padding: 4px 0; }

.param-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  .el-input { flex: 1; }
}

.param-check {
  flex-shrink: 0;
  :deep(.el-checkbox__inner) { border-radius: 3px; }
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

.hook-tab-tip { font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; }

// 响应区域
.response-section {
  border-top: 1px solid var(--border-color);
  padding-top: 16px;
}

.response-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;

  &.status-success { background: var(--el-color-success-light-9); }
  &.status-redirect { background: var(--el-color-primary-light-9); }
  &.status-client-error { background: var(--el-color-warning-light-9); }
  &.status-server-error { background: var(--el-color-danger-light-9); }

  .rs-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
  }
  .rs-code {
    font-size: 15px;
    font-weight: 700;
    font-family: 'Consolas', 'Monaco', monospace;
  }
  .rs-text {
    color: var(--text-regular);
  }
  .rs-divider {
    width: 1px;
    height: 16px;
    background: var(--border-color);
    margin: 0 4px;
  }
  .rs-time {
    font-weight: 600;
    font-family: 'Consolas', 'Monaco', monospace;
    color: var(--text-primary);
  }
}

.response-tabs {
  :deep(.el-tabs__header) { margin-bottom: 0; }
}

.response-body {
  background: #1e1e1e;
  border-radius: 0 0 8px 8px;
  padding: 14px;
  overflow: auto;
  max-height: 400px;

  .json-highlight {
    margin: 0;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre;
    color: #d4d4d4;

    :deep(.json-key) { color: #9cdcfe; }
    :deep(.json-string) { color: #ce9178; }
    :deep(.json-number) { color: #b5cea8; }
    :deep(.json-boolean) { color: #569cd6; }
    :deep(.json-null) { color: #569cd6; }
  }
}
</style>
