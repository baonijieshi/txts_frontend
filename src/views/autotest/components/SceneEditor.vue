<template>
  <div class="scene-editor">
    <el-tabs v-model="activeTab">
      <!-- 基本信息 -->
      <el-tab-pane label="基本信息" name="basic">
        <el-form :model="form" label-width="90px" style="max-width:600px; margin-top:12px">
          <el-form-item label="场景名称" required>
            <el-input v-model="form.name" placeholder="请输入场景名称" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="form.description" type="textarea" :rows="2" placeholder="选填" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 步骤配置 -->
      <el-tab-pane label="步骤配置" name="steps">
        <div class="steps-toolbar">
          <el-button :icon="Plus" size="small" @click="addStep">添加步骤</el-button>
          <el-button size="small" @click="importFromApi">从接口库导入</el-button>
        </div>

        <div v-if="form.steps.length === 0" class="steps-empty">
          <el-empty description="暂无步骤，点击「添加步骤」或「从接口库导入」" :image-size="80" />
        </div>

        <el-collapse v-else v-model="expandedSteps" accordion>
          <el-collapse-item
            v-for="(step, idx) in form.steps"
            :key="idx"
            :name="idx"
          >
            <template #title>
              <div class="step-title">
                <el-tag size="small" type="info">{{ idx + 1 }}</el-tag>
                <el-tag size="small" :type="methodTagType(step.method)" style="margin-left:6px">{{ step.method }}</el-tag>
                <span style="margin-left:8px; font-size:13px">{{ step.name || step.path || '未命名步骤' }}</span>
                <div class="step-actions" @click.stop>
                  <el-button size="small" link @click="moveStep(idx, -1)" :disabled="idx === 0">↑</el-button>
                  <el-button size="small" link @click="moveStep(idx, 1)" :disabled="idx === form.steps.length - 1">↓</el-button>
                  <el-button size="small" link type="danger" @click="removeStep(idx)">删除</el-button>
                </div>
              </div>
            </template>

            <el-form :model="step" label-width="80px" size="small" style="padding: 8px 0">
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="步骤名称">
                    <el-input v-model="step.name" placeholder="步骤描述" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="方法">
                    <el-select v-model="step.method" style="width:100%">
                      <el-option v-for="m in HTTP_METHODS" :key="m" :label="m" :value="m" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item label="路径">
                    <el-input v-model="step.path" placeholder="/api/xxx 或 ${base_url}/..." />
                  </el-form-item>
                </el-col>
              </el-row>

              <!-- Query 参数 -->
              <el-form-item label="Query">
                <KvEditor v-model="step.query_params" placeholder-key="参数名" placeholder-val="参数值" />
              </el-form-item>

              <!-- Header -->
              <el-form-item label="Header">
                <KvEditor v-model="step.headers" placeholder-key="Header名" placeholder-val="Header值" />
              </el-form-item>

              <!-- Body -->
              <el-form-item label="Body">
                <JsonEditor
                  v-model="step.body"
                  @valid-change="(ok) => { step.bodyError = ok ? '' : step.bodyError; }"
                />
              </el-form-item>

              <!-- 断言 -->
              <el-form-item label="断言">
                <AssertionEditor v-model="step.assertions" />
              </el-form-item>

              <!-- 变量提取 -->
              <el-form-item label="变量提取">
                <ExtractionEditor v-model="step.extractions" />
              </el-form-item>

              <!-- 前置操作 -->
              <el-form-item label="前置操作">
                <HookEditor v-model="step.pre_hooks" />
              </el-form-item>

              <!-- 后置操作 -->
              <el-form-item label="后置操作">
                <HookEditor v-model="step.post_hooks" />
              </el-form-item>
            </el-form>
          </el-collapse-item>
        </el-collapse>
      </el-tab-pane>

      <!-- 场景变量 -->
      <el-tab-pane label="场景变量" name="vars">
        <div style="margin-top:12px">
          <p style="font-size:12px; color:var(--text-secondary); margin-bottom:8px">
            场景变量可在步骤路径、参数、断言中通过 <code>${变量名}</code> 引用；
            也可使用 <code>${faker.name}</code>、<code>${faker.email}</code> 等动态 Mock 变量（每次执行随机生成）
          </p>
          <KvEditor v-model="form.variables" placeholder-key="变量名" placeholder-val="默认值" show-desc />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 从接口库导入弹窗 -->
    <el-dialog v-model="apiPickerVisible" title="从接口库导入" width="700px" append-to-body>
      <div class="api-picker-filter">
        <el-input v-model="apiSearch" placeholder="搜索接口名称或路径" clearable
          class="api-picker-search" @input="searchApis" />
        <el-select
          v-model="apiServiceFilter"
          placeholder="全部服务"
          clearable
          class="api-picker-service"
          @change="onServiceFilterChange"
        >
          <el-option
            v-for="svc in apiServiceList"
            :key="svc.id"
            :label="svc.name"
            :value="svc.id"
          />
        </el-select>
      </div>
      <el-table :data="apiOptions" height="360" @selection-change="selectedApis = $event">
        <el-table-column type="selection" width="46" />
        <el-table-column label="Method" width="90">
          <template #default="{ row }">
            <el-tag :type="methodTagType(row.method)" size="small">{{ row.method }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="接口名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="path" label="路径" min-width="200" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="apiPickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImportApis">导入选中 ({{ selectedApis.length }})</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { getApiList, getServiceList } from '@/api/apiManage';
import KvEditor from './KvEditor.vue';
import AssertionEditor from './AssertionEditor.vue';
import ExtractionEditor from './ExtractionEditor.vue';
import JsonEditor from './JsonEditor.vue';
import HookEditor from './HookEditor.vue';

const props = defineProps({ scene: { type: Object, default: null } });

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const METHOD_TAG = {
  GET: 'success', POST: 'primary', PUT: 'warning', PATCH: 'info', DELETE: 'danger',
};

const activeTab = ref('basic');
const expandedSteps = ref(null);

const form = ref({
  name: '',
  description: '',
  steps: [],
  variables: [],
});

watch(() => props.scene, async (scene) => {
  if (!scene) {
    form.value = {
      name: '', description: '', steps: [], variables: [],
    };
    return;
  }
  // 加载详情
  const { getSceneDetail } = await import('@/api/autotest');
  const res = await getSceneDetail(scene.id);
  const d = res.data;
  form.value = {
    name: d.name,
    description: d.description,
    variables: (d.variables || []).map((v) => ({
      key: v.key,
      value: v.value,
      description: v.description || '',
    })),
    steps: (d.steps || []).map((s) => ({
      name: s.name,
      api: s.api,
      method: s.method,
      path: s.path,
      query_params: paramsToKv(s.parameters?.query),
      headers: paramsToKv(s.parameters?.header),
      body: bodyToStr(s.parameters?.body),
      bodyError: '',
      assertions: s.assertions || [],
      extractions: s.extractions || [],
      pre_hooks: s.pre_hooks || [],
      post_hooks: s.post_hooks || [],
    })),
  };
}, { immediate: true });

function paramsToKv(obj) {
  if (!obj) return [];
  return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
}

function bodyToStr(body) {
  if (!body) return '';
  if (typeof body === 'string') return body;
  return JSON.stringify(body, null, 2);
}

function validateBodyStr(str) {
  const raw = (str || '').trim();
  if (!raw) return true;
  const sanitized = raw
    .replace(/"([^"]*)\$\{[^}]+\}([^"]*)"/g, (_, pre, post) => `"${pre}__VAR__${post}"`)
    .replace(/\$\{[^}]+\}/g, '"__VAR__"');
  try { JSON.parse(sanitized); return true; } catch { return false; }
}

function addStep() {
  form.value.steps.push({
    name: '',
    api: null,
    method: 'GET',
    path: '',
    query_params: [],
    headers: [],
    body: '',
    bodyError: '',
    assertions: [],
    extractions: [],
    pre_hooks: [],
    post_hooks: [],
  });
  expandedSteps.value = form.value.steps.length - 1;
}

function removeStep(idx) {
  form.value.steps.splice(idx, 1);
}

function moveStep(idx, dir) {
  const arr = form.value.steps;
  const target = idx + dir;
  if (target < 0 || target >= arr.length) return;
  [arr[idx], arr[target]] = [arr[target], arr[idx]];
}

function methodTagType(m) {
  return METHOD_TAG[m?.toUpperCase()] || '';
}

// 从接口库导入
const apiPickerVisible = ref(false);
const apiSearch = ref('');
const apiOptions = ref([]);
const selectedApis = ref([]);
const apiServiceList = ref([]);
const apiServiceFilter = ref(null);
let searchTimer = null;

async function importFromApi() {
  apiPickerVisible.value = true;
  apiServiceFilter.value = null;
  await Promise.all([loadServices(), loadApis()]);
}

async function loadServices() {
  try {
    const res = await getServiceList();
    if (res.code === 200) apiServiceList.value = res.data || [];
  } catch { apiServiceList.value = []; }
}

async function loadApis() {
  const params: Record<string, any> = { search: apiSearch.value, pageSize: 99999 };
  if (apiServiceFilter.value) {
    params.service_id = apiServiceFilter.value;
  }
  const res = await getApiList(params);
  apiOptions.value = res.data?.list || [];
}

function onServiceFilterChange() {
  loadApis();
}

function searchApis() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadApis, 300);
}

function confirmImportApis() {
  selectedApis.value.forEach((api) => {
    const params = api.parameters || {};

    // Query 参数：数组格式 [{key,value,description}]
    const queryParams = Array.isArray(params.query)
      ? params.query.filter((r) => r.key).map((r) => ({ key: r.key, value: r.value || '', description: r.description || '' }))
      : [];

    // Header 参数
    const headers = Array.isArray(params.header)
      ? params.header.filter((r) => r.key).map((r) => ({ key: r.key, value: r.value || '', description: r.description || '' }))
      : [];

    // Body：json 类型转为 {"key": ""} 格式字符串，其他类型直接序列化
    let body = '';
    const bodyConfig = params.body;
    if (bodyConfig && bodyConfig.type === 'json' && Array.isArray(bodyConfig.content)) {
      const bodyObj = {};
      bodyConfig.content.forEach((field) => {
        if (field.key) bodyObj[field.key] = '';
      });
      body = JSON.stringify(bodyObj, null, 2);
    } else if (bodyConfig && bodyConfig.type === 'form' && Array.isArray(bodyConfig.content)) {
      const bodyObj = {};
      bodyConfig.content.forEach((field) => {
        if (field.key) bodyObj[field.key] = field.value || '';
      });
      body = JSON.stringify(bodyObj, null, 2);
    } else if (bodyConfig && bodyConfig.type === 'raw') {
      body = typeof bodyConfig.content === 'string' ? bodyConfig.content : '';
    }

    form.value.steps.push({
      name: api.name,
      api: api.id,
      method: api.method,
      path: api.path,
      query_params: queryParams,
      headers,
      body,
      bodyError: '',
      assertions: [{ field: 'status_code', operator: 'eq', expected: '200' }],
      extractions: [],
      pre_hooks: [],
      post_hooks: [],
    });
  });
  apiPickerVisible.value = false;
  selectedApis.value = [];
  activeTab.value = 'steps';
}

// 供父组件调用
function getData() {
  // 校验所有步骤的 body
  let hasBodyError = false;
  form.value.steps.forEach((s) => {
    if (!validateBodyStr(s.body)) hasBodyError = true;
  });
  if (hasBodyError) return null;

  const steps = form.value.steps.map((s, i) => {
    const parameters = {};
    const qp = s.query_params?.filter((r) => r.key);
    if (qp?.length) parameters.query = Object.fromEntries(qp.map((r) => [r.key, r.value]));
    const hp = s.headers?.filter((r) => r.key);
    if (hp?.length) parameters.header = Object.fromEntries(hp.map((r) => [r.key, r.value]));
    if (s.body?.trim()) {
      // body 保持字符串存储，后端执行时再解析
      parameters.body = s.body;
    }
    return {
      order: i,
      name: s.name,
      api: s.api || null,
      method: s.method,
      path: s.path,
      parameters,
      assertions: s.assertions || [],
      extractions: s.extractions || [],
      pre_hooks: s.pre_hooks || [],
      post_hooks: s.post_hooks || [],
    };
  });
  return {
    name: form.value.name,
    description: form.value.description,
    variables: form.value.variables.filter((v) => v.key),
    steps,
  };
}

defineExpose({ getData });
</script>

<style scoped lang="scss">
.scene-editor { min-height: 400px; }
.steps-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.steps-empty { padding: 20px 0; }
.step-title {
  display: flex;
  align-items: center;
  flex: 1;
  .step-actions {
    margin-left: auto;
    display: flex;
    gap: 4px;
  }
}

.api-picker-filter {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;

  .api-picker-search {
    flex: 1;
  }

  .api-picker-service {
    width: 180px;
    flex-shrink: 0;
  }
}
</style>
