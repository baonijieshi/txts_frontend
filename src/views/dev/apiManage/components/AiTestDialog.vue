<template>
  <el-dialog
    :model-value="visible"
    title="AI 生成接口测试用例"
    width="780px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="ai-test-body">
      <!-- 阶段一：初始状态 -->
      <div v-if="!generating && !result" class="phase-init">
        <div class="phase-header">
          <el-icon class="phase-icon"><MagicStick /></el-icon>
          <span>已选择 <strong>{{ selectedApis.length }}</strong> 个接口</span>
        </div>
        <div class="api-preview-list">
          <div v-for="api in selectedApis" :key="api.id" class="api-preview-item">
            <el-tag
              :type="methodTagType(api.method)"
              size="small"
              effect="plain"
              class="api-method-tag"
            >
              {{ api.method }}
            </el-tag>
            <span class="api-preview-name" :title="api.name">{{ api.name }}</span>
            <code class="api-preview-path">{{ api.path }}</code>
          </div>
        </div>
        <div class="phase-hint">
          <el-icon><InfoFilled /></el-icon>
          <span>将调用 AI 分析接口结构，自动生成测试场景（含断言、参数填充）</span>
        </div>
      </div>

      <!-- 阶段二：生成中 -->
      <div v-if="generating" class="phase-generating">
        <div class="generating-animation">
          <el-icon class="generating-icon pulse"><MagicStick /></el-icon>
        </div>
        <p class="generating-title">AI 正在分析接口结构，生成测试用例...</p>
        <p class="generating-progress">
          正在处理第 <strong>{{ currentApiIndex + 1 }}</strong> / <strong>{{ selectedApis.length }}</strong> 个接口
        </p>
        <el-progress
          :percentage="Math.round((currentApiIndex / selectedApis.length) * 100)"
          :stroke-width="6"
          :show-text="false"
          style="max-width: 400px; margin: 16px auto 0"
        />
        <p class="generating-api-name">
          {{ selectedApis[currentApiIndex]?.method }} {{ selectedApis[currentApiIndex]?.path }}
        </p>
      </div>

      <!-- 阶段三：预览结果 -->
      <div v-if="result" class="phase-result">
        <div class="result-toolbar">
          <span class="result-summary">
            已生成 <strong>{{ generatedScenes.length }}</strong> 个测试场景，共 <strong>{{ totalSteps }}</strong> 个步骤
          </span>
          <div class="result-actions">
            <el-button size="small" link @click="toggleAllSteps">
              {{ allExpanded ? '全部折叠' : '全部展开' }}
            </el-button>
            <el-button size="small" link type="primary" :loading="generating" @click="handleRegenerate">
              <el-icon><Refresh /></el-icon>重新生成
            </el-button>
          </div>
        </div>

        <div
          v-for="(scene, si) in generatedScenes"
          :key="scene.id"
          class="scene-card"
        >
          <div class="scene-card-header">
            <div class="scene-info">
              <span class="scene-index">#{{ si + 1 }}</span>
              <el-input
                v-model="scene.sceneName"
                size="small"
                class="scene-name-input"
                placeholder="场景名称"
              />
              <el-tag
                :type="methodTagType(selectedApis[si]?.method)"
                size="small"
                effect="plain"
              >
                {{ selectedApis[si]?.method }}
              </el-tag>
              <code class="scene-path">{{ selectedApis[si]?.path }}</code>
            </div>
            <el-button
              size="small"
              link
              type="danger"
              @click="removeScene(si)"
              :disabled="generatedScenes.length <= 1"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>

          <el-collapse v-model="expandedSteps[si]" class="steps-collapse">
            <el-collapse-item
              v-for="(step, sti) in scene.steps"
              :key="sti"
              :name="sti"
            >
              <template #title>
                <div class="step-title-bar">
                  <el-tag size="small" type="info" class="step-order">{{ sti + 1 }}</el-tag>
                  <el-tag
                    :type="methodTagType(step.method)"
                    size="small"
                    effect="plain"
                    class="step-method"
                  >
                    {{ step.method }}
                  </el-tag>
                  <span class="step-name-text">{{ step.name || '未命名步骤' }}</span>
                </div>
              </template>

              <el-form :model="step" label-width="80px" size="small" class="step-form">
                <el-row :gutter="12">
                  <el-col :span="10">
                    <el-form-item label="步骤名称">
                      <el-input v-model="step.name" placeholder="步骤描述" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="方法">
                      <el-select v-model="step.method" style="width:100%">
                        <el-option
                          v-for="m in HTTP_METHODS"
                          :key="m"
                          :label="m"
                          :value="m"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="路径">
                      <el-input v-model="step.path" placeholder="/api/xxx" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <!-- Query 参数 -->
                <el-form-item v-if="step.query_params && step.query_params.length > 0" label="Query">
                  <KvEditor v-model="step.query_params" placeholder-key="参数名" placeholder-val="参数值" />
                </el-form-item>

                <!-- Header -->
                <el-form-item v-if="step.headers && step.headers.length > 0" label="Header">
                  <KvEditor v-model="step.headers" placeholder-key="Header名" placeholder-val="Header值" />
                </el-form-item>

                <!-- Body -->
                <el-form-item v-if="step.body" label="Body">
                  <el-input
                    v-model="step.body"
                    type="textarea"
                    :rows="4"
                    class="body-textarea"
                    placeholder='{"key": "value"}'
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
              </el-form>
            </el-collapse-item>
          </el-collapse>

          <div v-if="!scene.steps || scene.steps.length === 0" class="steps-empty">
            暂无步骤
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <!-- 阶段一底部 -->
      <template v-if="!generating && !result">
        <el-button @click="$emit('update:visible', false)">取消</el-button>
        <el-button type="primary" :disabled="selectedApis.length === 0" @click="handleGenerate">
          <el-icon><MagicStick /></el-icon>开始生成
        </el-button>
      </template>

      <!-- 阶段二底部 -->
      <template v-if="generating">
        <el-button @click="handleCancelGenerate">取消</el-button>
        <el-button type="primary" loading disabled>生成中...</el-button>
      </template>

      <!-- 阶段三底部 -->
      <template v-if="result">
        <el-button @click="$emit('update:visible', false)">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          确认保存
        </el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  MagicStick, InfoFilled, Refresh, Delete,
} from '@element-plus/icons-vue';
import { useAi } from '@/composables/useAi';
import { createScene } from '@/api/autotest';
import AssertionEditor from '@/views/autotest/components/AssertionEditor.vue';
import ExtractionEditor from '@/views/autotest/components/ExtractionEditor.vue';
import KvEditor from '@/views/autotest/components/KvEditor.vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  selectedApis: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:visible', 'saved']);

const ai = useAi();
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const METHOD_TAG: Record<string, string> = {
  GET: 'success', POST: 'primary', PUT: 'warning', PATCH: 'info', DELETE: 'danger',
};

const generating = ref(false);
const currentApiIndex = ref(0);
const result = ref(false);
const saving = ref(false);
const generatedScenes = ref<any[]>([]);
const expandedSteps = ref<Record<number, number[]>>({});
const allExpanded = ref(false);

let abortController: AbortController | null = null;

const totalSteps = computed(() =>
  generatedScenes.value.reduce((sum, s) => sum + (s.steps?.length || 0), 0)
);

function methodTagType(m: string): string {
  return METHOD_TAG[(m || '').toUpperCase()] || '';
}

// 关闭弹窗时重置
watch(() => props.visible, (val) => {
  if (!val) {
    generatedScenes.value = [];
    result.value = false;
    generating.value = false;
    currentApiIndex.value = 0;
    expandedSteps.value = {};
    allExpanded.value = false;
  }
});

// ── Prompt 构造 ─────────────────────────────────────────────

function buildPrompt(api: any): string {
  // 提取接口核心数据
  const apiData: any = {
    name: api.name || '',
    method: (api.method || '').toUpperCase(),
    path: api.path || '',
    description: api.description || '',
  };

  // 解析 parameters（可能是 string 或 object）
  let params = api.parameters;
  if (typeof params === 'string') {
    try { params = JSON.parse(params); } catch { params = {}; }
  }
  apiData.parameters = params || {};

  // 解析 response_data
  let respData = api.response_data;
  if (typeof respData === 'string') {
    try { respData = JSON.parse(respData); } catch { respData = {}; }
  }
  apiData.response_data = respData || {};

  // 解析 response_example
  if (api.response_example) {
    apiData.response_example = typeof api.response_example === 'string'
      ? api.response_example.substring(0, 1500)
      : JSON.stringify(api.response_example).substring(0, 1500);
  }

  const prompt = [
    '你是一个专业的软件测试工程师。请根据以下接口定义，为这个接口生成自动化接口测试用例。',
    '',
    '## 接口信息',
    '```json',
    JSON.stringify(apiData, null, 2),
    '```',
    '',
    '## 输出要求',
    '请返回一个纯 JSON 对象（不要用 markdown 代码块包裹），结构如下：',
    '```',
    '{',
    '  "scene_name": "场景名称（如：获取用户详情 - 接口测试）",',
    '  "steps": [',
    '    {',
    '      "name": "步骤描述（如：正常获取用户详情）",',
    '      "method": "HTTP方法（从接口信息中获取）",',
    '      "path": "接口路径（从接口信息中获取）",',
    '      "query_params": [{"key": "参数名", "value": "示例值"}],',
    '      "headers": [{"key": "Content-Type", "value": "application/json"}],',
    '      "body": "请求体JSON字符串（POST/PUT时提供，GET/DELETE时为空字符串）",',
    '      "assertions": [',
    '        {"field": "status_code", "operator": "eq", "expected": "200"}',
    '      ],',
    '      "extractions": []',
    '    }',
    '  ]',
    '}',
    '```',
    '',
    '## 重要约束',
    '1. operator 只能是以下之一：eq、ne、contains、not_contains、gt、lt',
    '2. assertions 的 field 值优先使用 response_data 中实际存在的字段路径（如 data.id、data.name、message 等）',
    '3. **必须**为接口生成 2-4 个步骤：正常场景（1-2步，验证200响应和关键字段）+ 异常场景（1-2步，如缺少必填参数→400、不存在的ID→404、未授权→401）',
    '4. GET/DELETE 请求的 body 字段留空字符串，query_params 从 parameters.query 中提取',
    '5. POST/PUT 请求的 body 根据 parameters.body 中的字段构造合法的 JSON 字符串',
    '6. path 参数值（如 {id}）填入合理的示例值（如 "1"、123 等）',
    '7. **禁止编造不存在的响应字段**，只使用 response_data 中实际出现的字段名',
    '8. 异常场景的 expected status_code 参考：缺少参数→400、未授权→401、无权限→403、不存在→404、参数校验失败→422',
    '9. **直接返回 JSON 对象，不要用 ```json 包裹，不要有任何额外文字说明**',
  ].join('\n');

  return prompt;
}

// ── JSON 解析（多重策略）───────────────────────────────────

function parseAiResponse(raw: string): any {
  const trimmed = raw.trim();

  // 策略1：直接解析
  try {
    return JSON.parse(trimmed);
  } catch { /* continue */ }

  // 策略2：提取 markdown 代码块中的 JSON
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch { /* continue */ }
  }

  // 策略3：尝试找到第一个 { 和最后一个 } 之间的内容
  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch { /* continue */ }
  }

  return null;
}

// ── 将 AI 返回数据映射为内部结构 ──────────────────────────

function mapToScene(apiRecord: any, aiResult: any): any {
  const sceneName = aiResult.scene_name || `${apiRecord.name || apiRecord.method} - 接口测试`;

  const steps = (aiResult.steps || []).map((step: any) => {
    // 确保基础字段
    const queryParams = Array.isArray(step.query_params)
      ? step.query_params.filter((q: any) => q.key)
      : [];

    const headers = Array.isArray(step.headers)
      ? step.headers.filter((h: any) => h.key)
      : [];

    // 确保 assertions 格式正确
    const assertions = (step.assertions || []).map((a: any) => ({
      field: a.field || 'status_code',
      operator: ['eq', 'ne', 'contains', 'not_contains', 'gt', 'lt'].includes(a.operator) ? a.operator : 'eq',
      expected: String(a.expected ?? '200'),
    }));

    // 如果断言为空，添加默认状态码断言
    if (assertions.length === 0) {
      assertions.push({ field: 'status_code', operator: 'eq', expected: '200' });
    }

    return {
      name: step.name || `步骤 ${apiRecord.method} ${apiRecord.path}`,
      method: (step.method || apiRecord.method || 'GET').toUpperCase(),
      path: step.path || apiRecord.path || '/',
      query_params: queryParams,
      headers,
      body: typeof step.body === 'string' ? step.body : (step.body ? JSON.stringify(step.body, null, 2) : ''),
      assertions,
      extractions: Array.isArray(step.extractions) ? step.extractions : [],
    };
  });

  // 如果 AI 没有返回步骤，生成默认步骤
  if (steps.length === 0) {
    const defaultParams = apiRecord.parameters || {};
    const queryParams = Array.isArray(defaultParams.query)
      ? defaultParams.query.filter((p: any) => p.key).map((p: any) => ({ key: p.key, value: p.value || '' }))
      : [];
    const headerParams = Array.isArray(defaultParams.header)
      ? defaultParams.header.filter((p: any) => p.key).map((p: any) => ({ key: p.key, value: p.value || '' }))
      : [];

    // 构造 body
    let body = '';
    const bodyConfig = defaultParams.body;
    if (bodyConfig && bodyConfig.type === 'json' && Array.isArray(bodyConfig.content)) {
      const bodyObj: Record<string, string> = {};
      bodyConfig.content.forEach((field: any) => {
        if (field.key) bodyObj[field.key] = field.type === 'number' ? '0' : '';
      });
      body = JSON.stringify(bodyObj, null, 2);
    }

    steps.push({
      name: `正常请求 - ${apiRecord.method} ${apiRecord.path}`,
      method: (apiRecord.method || 'GET').toUpperCase(),
      path: apiRecord.path || '/',
      query_params: queryParams,
      headers: headerParams,
      body,
      assertions: [{ field: 'status_code', operator: 'eq', expected: '200' }],
      extractions: [],
    });
  }

  return {
    id: `scene-${apiRecord.id}-${Date.now()}`,
    apiId: apiRecord.id,
    sceneName,
    steps,
  };
}

// ── AI 生成 ───────────────────────────────────────────────

function handleGenerate() {
  generateTests();
}

function handleRegenerate() {
  generatedScenes.value = [];
  result.value = false;
  expandedSteps.value = {};
  allExpanded.value = false;
  generateTests();
}

async function generateTests() {
  if (!ai.isAvailable.value) {
    ElMessage.warning('请先在设置中配置 AI API Key');
    return;
  }

  if (props.selectedApis.length === 0) {
    ElMessage.warning('请先选择接口');
    return;
  }

  generating.value = true;
  result.value = false;
  currentApiIndex.value = 0;
  generatedScenes.value = [];
  abortController = new AbortController();

  const failedApis: any[] = [];

  for (let i = 0; i < props.selectedApis.length; i++) {
    currentApiIndex.value = i;
    const api = props.selectedApis[i];

    try {
      const prompt = buildPrompt(api);
      const rawResponse = await ai.complete(prompt, {
        maxTokens: 4096,
        temperature: 0.3,
        signal: abortController.signal,
      });

      const parsed = parseAiResponse(rawResponse);

      if (parsed) {
        const scene = mapToScene(api, parsed);
        generatedScenes.value.push(scene);
      } else {
        // 解析失败，生成默认场景
        ElMessage.warning(`接口「${api.name}」的 AI 返回无法解析，已生成默认测试用例`);
        const scene = mapToScene(api, {});
        scene.sceneName = `${api.name || api.path} - 接口测试（手动编辑）`;
        generatedScenes.value.push(scene);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        break;
      }
      console.error(`AI generation failed for api ${api.id}:`, e);
      failedApis.push(api);
      // 失败时也生成默认场景
      const scene = mapToScene(api, {});
      scene.sceneName = `${api.name || api.path} - 接口测试（AI 生成失败）`;
      generatedScenes.value.push(scene);
    }
  }

  generating.value = false;
  result.value = true;
  abortController = null;

  if (failedApis.length > 0) {
    ElMessage.warning(`${failedApis.length} 个接口生成失败，已使用默认测试用例`);
  } else if (generatedScenes.value.length > 0) {
    ElMessage.success(`已生成 ${generatedScenes.value.length} 个测试场景`);
  }
}

function handleCancelGenerate() {
  if (abortController) {
    abortController.abort();
  }
  generating.value = false;
}

// ── 预览编辑辅助 ──────────────────────────────────────────

function toggleAllSteps() {
  const newState: Record<number, number[]> = {};
  if (!allExpanded.value) {
    // 全部展开
    generatedScenes.value.forEach((scene, si) => {
      newState[si] = scene.steps.map((_: any, sti: number) => sti);
    });
  } else {
    // 全部折叠
    generatedScenes.value.forEach((_, si) => {
      newState[si] = [];
    });
  }
  expandedSteps.value = newState;
  allExpanded.value = !allExpanded.value;
}

function removeScene(index: number) {
  generatedScenes.value.splice(index, 1);
}

// ── 保存 ─────────────────────────────────────────────────

async function handleSave() {
  if (generatedScenes.value.length === 0) {
    ElMessage.warning('没有可保存的测试场景');
    return;
  }

  saving.value = true;
  let savedCount = 0;
  const errors: string[] = [];

  try {
    for (const scene of generatedScenes.value) {
      try {
        const steps = scene.steps.map((s: any, i: number) => {
          const parameters: any = {};
          const qp = s.query_params?.filter((r: any) => r.key);
          if (qp?.length) {
            parameters.query = Object.fromEntries(qp.map((r: any) => [r.key, r.value]));
          }
          const hp = s.headers?.filter((r: any) => r.key);
          if (hp?.length) {
            parameters.header = Object.fromEntries(hp.map((r: any) => [r.key, r.value]));
          }
          if (s.body?.trim()) {
            parameters.body = s.body.trim();
          }

          return {
            order: i,
            name: s.name,
            api: scene.apiId,
            method: s.method,
            path: s.path,
            parameters,
            assertions: s.assertions || [],
            extractions: s.extractions || [],
            pre_hooks: [],
            post_hooks: [],
          };
        });

        await createScene({
          name: scene.sceneName,
          description: `AI 自动生成 - 基于接口 ${scene.apiId}`,
          variables: [],
          steps,
        });
        savedCount++;
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || '未知错误';
        errors.push(`「${scene.sceneName}」保存失败: ${msg}`);
      }
    }
  } finally {
    saving.value = false;
  }

  if (errors.length > 0) {
    ElMessage.error(errors.join('；'));
  }
  if (savedCount > 0) {
    ElMessage.success(`已保存 ${savedCount} 个测试场景`);
    emit('saved');
    emit('update:visible', false);
  }
}
</script>

<style scoped lang="scss">
.ai-test-body {
  min-height: 240px;
}

// ── 阶段一：初始 ──────────────────────────────────────────
.phase-init {
  .phase-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 14px;

    .phase-icon {
      font-size: 18px;
      color: var(--el-color-primary);
    }

    strong {
      color: var(--el-color-primary);
      font-weight: 600;
    }
  }
}

.api-preview-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 14px;
}

.api-preview-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--bg-hover);
  border-radius: 8px;
  border: 1px solid var(--border-light);

  .api-method-tag {
    flex-shrink: 0;
    min-width: 60px;
    text-align: center;
  }

  .api-preview-name {
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }

  .api-preview-path {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--bg-elevated);
    padding: 2px 8px;
    border-radius: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
}

.phase-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
  border: 1px solid var(--el-color-primary-light-8);
  font-size: 13px;
  color: var(--el-color-primary);

  .el-icon {
    font-size: 15px;
    flex-shrink: 0;
  }
}

// ── 阶段二：生成中 ──────────────────────────────────────
.phase-generating {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.generating-animation {
  margin-bottom: 20px;
}

.generating-icon {
  font-size: 48px;
  color: var(--el-color-primary);

  &.pulse {
    animation: icon-pulse 1.5s ease-in-out infinite;
  }

  @keyframes icon-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.1); }
  }
}

.generating-title {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
  margin: 0 0 8px;
}

.generating-progress {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;

  strong {
    color: var(--el-color-primary);
    font-weight: 600;
  }
}

.generating-api-name {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--text-placeholder);
  margin: 12px 0 0;
}

// ── 阶段三：预览 ─────────────────────────────────────────
.phase-result {
  .result-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    padding: 10px 14px;
    background: var(--el-color-success-light-9);
    border-radius: 8px;
    border: 1px solid var(--el-color-success-light-8);

    .result-summary {
      font-size: 13px;
      color: var(--el-color-success);

      strong {
        font-weight: 600;
      }
    }

    .result-actions {
      display: flex;
      gap: 8px;
    }
  }
}

.scene-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;

  &:last-child {
    margin-bottom: 0;
  }
}

.scene-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-light);

  .scene-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;

    .scene-index {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-secondary);
      flex-shrink: 0;
    }

    .scene-name-input {
      max-width: 280px;
      flex-shrink: 0;
    }

    .scene-path {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 11px;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }
  }
}

.steps-collapse {
  border: none;

  :deep(.el-collapse-item__header) {
    padding: 10px 14px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border-light);
    font-size: 13px;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: 1px solid var(--border-light);
  }

  :deep(.el-collapse-item__content) {
    padding: 14px 18px;
    background: var(--bg-hover);
  }
}

.step-title-bar {
  display: flex;
  align-items: center;
  gap: 8px;

  .step-order {
    flex-shrink: 0;
  }

  .step-method {
    flex-shrink: 0;
    min-width: 52px;
    text-align: center;
  }

  .step-name-text {
    font-size: 13px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.step-form {
  .body-textarea {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
  }
}

.steps-empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-placeholder);
}
</style>
