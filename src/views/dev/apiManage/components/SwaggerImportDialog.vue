<template>
  <el-dialog
    :model-value="visible"
    title="导入 Swagger"
    width="600px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="import-body">
      <!-- 文件选择区域 -->
      <div v-if="!parsedApis && !importing" class="upload-area">
        <div
          class="drop-zone"
          :class="{ 'is-hover': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="triggerFileInput"
        >
          <el-icon class="upload-icon"><Upload /></el-icon>
          <p class="upload-hint">点击或拖拽 <strong>.json</strong> 文件到此处</p>
          <p class="upload-sub">仅支持 Swagger / OpenAPI JSON 格式</p>
        </div>
        <!-- eslint-disable-next-line vuejs-accessibility/label-has-for -->
        <label class="sr-only">
          选择 Swagger JSON 文件
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            style="display: none"
            @change="handleFileChange"
          />
        </label>

        <!-- 错误提示 -->
        <el-alert
          v-if="parseError"
          :title="parseError"
          type="error"
          show-icon
          :closable="false"
          class="parse-error"
        />
      </div>

      <!-- 解析预览 -->
      <div v-if="parsedApis && !importing" class="preview-area">
        <div class="preview-summary">
          <el-icon><CircleCheck /></el-icon>
          <span>解析成功，共检测到 <strong>{{ parsedApis.length }}</strong> 个接口</span>
        </div>
        <!-- 服务选择 -->
        <div class="service-select-row">
          <span class="service-select-label">导入到服务：</span>
          <el-select
            v-model="selectedServiceId"
            placeholder="选择服务（可选）"
            clearable
            size="small"
            style="width: 240px"
          >
            <el-option
              v-for="svc in serviceList"
              :key="svc.id"
              :label="`${svc.name}（${svc.api_count} 个接口）`"
              :value="svc.id"
            />
          </el-select>
        </div>
        <el-table :data="previewList" size="small" max-height="280" class="preview-table">
          <el-table-column label="接口名称" prop="name" min-width="140" show-overflow-tooltip />
          <el-table-column label="路径" prop="path" min-width="160" show-overflow-tooltip />
          <el-table-column label="方法" prop="method" width="80">
            <template #default="{ row }">
              <el-tag :type="methodTagType(row.method)" size="small" effect="plain">{{ row.method }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <p v-if="parsedApis.length > 10" class="more-hint">仅展示前 10 条，共 {{ parsedApis.length }} 条</p>
        <el-button link type="primary" size="small" class="reselect-btn" @click="resetParse">重新选择文件</el-button>
      </div>

      <!-- 导入进度 -->
      <div v-if="importing" class="progress-area">
        <p class="progress-label">正在导入，请稍候...</p>
        <el-progress :percentage="progress" :stroke-width="10" status="striped" striped-flow />
      </div>
    </div>

    <template #footer>
      <el-button :disabled="importing" @click="handleCancel">取消</el-button>
      <el-button
        type="primary"
        :disabled="!parsedApis || importing"
        :loading="importing"
        @click="handleConfirm"
      >
        确认导入
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, watch } from 'vue';
import { Upload, CircleCheck } from '@element-plus/icons-vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 父组件通过此 prop 驱动进度条（0-100），-1 表示不显示
  importProgress: { type: Number, default: -1 },
  serviceList: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:visible', 'import-confirm']);

const fileInputRef = ref(null);
const isDragging = ref(false);
const parseError = ref('');
const parsedApis = ref(null);
const selectedServiceId = ref(null);

// 是否正在导入：由父组件的 importProgress >= 0 驱动
const importing = computed(() => props.importProgress >= 0);
const progress = computed(() => (props.importProgress >= 0 ? props.importProgress : 0));

const METHOD_TAG_TYPE = {
  GET: 'success',
  POST: 'primary',
  PUT: 'warning',
  PATCH: 'info',
  DELETE: 'danger',
};
const methodTagType = (m) => METHOD_TAG_TYPE[(m || '').toUpperCase()] || '';

const previewList = computed(() => (parsedApis.value || []).slice(0, 10));

// 对话框关闭时重置本地状态
watch(() => props.visible, (val) => {
  if (!val) {
    parsedApis.value = null;
    parseError.value = '';
    selectedServiceId.value = null;
  }
});

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileChange(e) {
  const file = e.target.files?.[0];
  if (file) parseFile(file);
  e.target.value = '';
}

function handleDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) parseFile(file);
}

function parseFile(file) {
  parseError.value = '';
  parsedApis.value = null;

  const reader = new FileReader();
  reader.onload = (ev) => {
    let json;
    try {
      json = JSON.parse(ev.target.result);
    } catch {
      parseError.value = '文件格式错误，请上传合法的 JSON 文件';
      return;
    }

    if (!json.paths || typeof json.paths !== 'object') {
      parseError.value = '未检测到接口路径数据（paths），请确认文件格式';
      return;
    }

    const schemas = json.components?.schemas || {};
    parsedApis.value = extractApis(json.paths, schemas);
  };
  reader.readAsText(file);
}

// 解析 $ref 引用：从 "#/components/schemas/UserForm" 提取 "UserForm" 并查找 schema
function resolveRef(ref, schemas) {
  if (!ref || typeof ref !== 'string') return null;
  const prefix = '#/components/schemas/';
  if (!ref.startsWith(prefix)) return null;
  const name = ref.slice(prefix.length);
  return schemas[name] || null;
}

// 递归解析 schema（处理嵌套 $ref）
function resolveSchema(schema, schemas, depth = 0) {
  if (!schema || typeof schema !== 'object') return schema;
  if (depth > 10) return schema; // 防止循环引用
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, schemas);
    if (resolved) return resolveSchema(resolved, schemas, depth + 1);
    return schema;
  }
  // 递归解析嵌套属性中的 $ref（如 items.$ref、allOf 等）
  if (schema.properties) {
    const resolvedProps = {};
    Object.entries(schema.properties).forEach(([key, val]) => {
      resolvedProps[key] = resolveSchema(val, schemas, depth + 1);
    });
    return { ...schema, properties: resolvedProps };
  }
  if (schema.items) {
    return { ...schema, items: resolveSchema(schema.items, schemas, depth + 1) };
  }
  if (schema.allOf) {
    return resolveAllOf(schema, schemas, depth);
  }
  return schema;
}

// 解析 allOf（合并多个 schema）
function resolveAllOf(schema, schemas, depth) {
  if (!Array.isArray(schema.allOf)) return schema;
  const merged = { type: 'object', properties: {}, required: [] };
  schema.allOf.forEach((sub) => {
    const resolved = resolveSchema(sub, schemas, depth + 1);
    if (resolved) {
      if (resolved.properties) Object.assign(merged.properties, resolved.properties);
      if (resolved.required) merged.required = [...new Set([...merged.required, ...resolved.required])];
    }
  });
  return merged;
}

// 将 schema 转换为字段列表（用于 JSON body 和响应参数）
function schemaToFields(schema, schemas) {
  if (!schema || typeof schema !== 'object') return [];
  const resolved = resolveSchema(schema, schemas);
  if (!resolved) return [];
  const props = resolved.properties || {};
  const required = Array.isArray(resolved.required) ? resolved.required : [];
  return Object.entries(props).map(([k, v]) => {
    // 解析字段类型：如果是数组且有 items，显示为 "array<string>" 等
    let type = v.type || 'string';
    if (type === 'array' && v.items) {
      const itemType = v.items.type || 'string';
      type = `array<${itemType}>`;
    } else if (type === 'array' && v.items?.$ref) {
      type = 'array<object>';
    } else if (v.$ref && !v.type) {
      type = 'object';
    }
    return {
      key: k,
      type,
      required: required.includes(k),
      description: v.title || v.description || '',
    };
  });
}

// 解析响应数据：收集所有状态码的结构化响应信息
function extractResponseData(responses, schemas) {
  if (!responses || typeof responses !== 'object') return {};
  const data = {};
  Object.entries(responses).forEach(([statusCode, resp]) => {
    const entry = { description: resp.description || '', contentType: '', fields: [] };
    // 优先匹配 application/json，其次 */*
    const jsonContent = resp?.content?.['application/json']?.schema;
    const anyContent = resp?.content?.['*/*']?.schema;
    // OpenAPI 2.0 兼容：resp.schema
    const legacySchema = resp?.schema;
    const schema = jsonContent || anyContent || legacySchema;
    if (schema) {
      if (jsonContent) entry.contentType = 'application/json';
      else if (anyContent) entry.contentType = '*/*';
      entry.fields = schemaToFields(schema, schemas);
    }
    data[statusCode] = entry;
  });
  return data;
}

function extractApis(paths, schemas) {
  const VALID_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
  const result = [];
  Object.entries(paths).forEach(([path, methods]) => {
    // 从 URL 路径中提取 {xxx} 占位符
    const urlPathParams = (path.match(/\{([^}]+)\}/g) || []).map((p) => p.slice(1, -1));

    // 收集同路径下所有 method 中定义的 path 参数作为补充查找表
    const siblingPathParams = {};
    Object.values(methods).forEach((op) => {
      (op?.parameters || []).forEach((p) => {
        if (p.in === 'path' && p.name) {
          siblingPathParams[p.name] = p;
        }
      });
    });

    Object.entries(methods).forEach(([method, operation]) => {
      if (!VALID_METHODS.includes(method.toLowerCase())) return;

      const parameters = { query: [], header: [], path: [], body: { type: 'json', content: '' } };

      // 解析 operation 级别的 parameters（path / query / header）
      const rawParams = operation?.parameters || [];
      const explicitPathKeys = new Set();
      rawParams.forEach((p) => {
        const item = {
          key: p.name || '',
          value: p.example ?? p.default ?? '',
          type: p.schema?.type || 'string',
          description: p.description || '',
          required: p.required || false,
        };
        if (p.in === 'query') parameters.query.push(item);
        else if (p.in === 'header') parameters.header.push(item);
        else if (p.in === 'path') {
          parameters.path.push(item);
          explicitPathKeys.add(p.name);
        } else if (p.in === 'body') {
          parameters.body = { type: 'json', content: schemaToFields(p.schema || {}, schemas) };
        }
      });

      // 自动补全 URL 中 {xxx} 占位符：从同路径 sibling 查找定义，否则默认 string/required
      urlPathParams.forEach((paramName) => {
        if (explicitPathKeys.has(paramName)) return; // 已显式声明则跳过
        const sibling = siblingPathParams[paramName];
        parameters.path.push({
          key: paramName,
          value: sibling?.example ?? sibling?.default ?? '',
          type: sibling?.schema?.type || 'string',
          description: sibling?.description || '',
          required: true, // URL 路径参数默认必填
        });
      });

      // 解析 requestBody（OpenAPI 3.0）
      const requestBody = operation?.requestBody;
      if (requestBody) {
        const jsonContent = requestBody?.content?.['application/json']?.schema;
        const formContent = requestBody?.content?.['application/x-www-form-urlencoded']?.schema;
        const multipartContent = requestBody?.content?.['multipart/form-data']?.schema;
        if (jsonContent) {
          parameters.body = { type: 'json', content: schemaToFields(jsonContent, schemas) };
        } else if (formContent) {
          const resolved = resolveSchema(formContent, schemas);
          const props2 = resolved?.properties || {};
          parameters.body = {
            type: 'form-data',
            content: Object.entries(props2).map(([k, v]) => ({
              key: k, value: '', description: v.description || '',
            })),
          };
        } else if (multipartContent) {
          const resolved = resolveSchema(multipartContent, schemas);
          const props2 = resolved?.properties || {};
          parameters.body = {
            type: 'form-data',
            content: Object.entries(props2).map(([k, v]) => ({
              key: k, value: '', description: v.description || '',
            })),
          };
        }
      }

      // 解析响应：200 响应体作为 response_example（带解析），所有状态码存入 response_data
      let responseExample = '';
      const responses = operation?.responses || {};
      const resp200 = responses['200'] || responses[200];
      if (resp200) {
        const jsonSchema = resp200?.content?.['application/json']?.schema;
        const anySchema = resp200?.content?.['*/*']?.schema;
        const legacySchema = resp200?.schema;
        const schema = jsonSchema || anySchema || legacySchema;
        if (schema) {
          const resolved = resolveSchema(schema, schemas);
          if (resolved) {
            responseExample = JSON.stringify(resolved, null, 2);
          }
        } else if (resp200.description) {
          responseExample = resp200.description;
        }
      }

      // 响应数据（所有状态码的结构化信息）
      const responseData = extractResponseData(responses, schemas);

      result.push({
        name: operation?.summary || operation?.operationId || `${method.toUpperCase()} ${path}`,
        path,
        method: method.toUpperCase(),
        description: operation?.description || '',
        parameters,
        response_example: responseExample,
        response_data: responseData,
      });
    });
  });
  return result;
}

function resetParse() {
  parsedApis.value = null;
  parseError.value = '';
  selectedServiceId.value = null;
}

function handleCancel() {
  emit('update:visible', false);
}

function handleConfirm() {
  if (!parsedApis.value) return;
  // 把解析结果和服务 ID 交给父组件
  emit('import-confirm', { apis: parsedApis.value, serviceId: selectedServiceId.value });
}
</script>

<style scoped lang="scss">
.import-body {
  min-height: 200px;
}

.upload-area {
  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px dashed var(--border-color);
    border-radius: 12px;
    padding: 48px 20px;
    cursor: pointer;
    transition: border-color 0.2s, background-color 0.2s, transform 0.2s;

    &:hover,
    &.is-hover {
      border-color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
      transform: scale(1.01);
    }

    &.is-hover {
      animation: drop-pulse 1s ease infinite;
    }

    @keyframes drop-pulse {
      0%, 100% { border-color: var(--el-color-primary); }
      50% { border-color: var(--el-color-primary-light-7); }
    }

    .upload-icon {
      font-size: 44px;
      color: var(--text-placeholder);
      margin-bottom: 14px;
      transition: transform 0.2s;
    }

    &:hover .upload-icon {
      transform: translateY(-2px);
    }

    .upload-hint {
      font-size: 15px;
      color: var(--text-regular);
      margin: 0 0 6px;
    }

    .upload-sub {
      font-size: 12px;
      color: var(--text-secondary);
      margin: 0;
    }
  }

  .parse-error {
    margin-top: 16px;
  }
}

.preview-area {
  .preview-summary {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--el-color-success);
    margin-bottom: 14px;
    padding: 10px 14px;
    background: var(--el-color-success-light-9);
    border-radius: 8px;
    border: 1px solid var(--el-color-success-light-8);

    .el-icon {
      font-size: 18px;
    }
  }

  .service-select-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;

    .service-select-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-regular);
      white-space: nowrap;
    }
  }

  .preview-table {
    border-radius: 8px;
    :deep(.el-table__header th) {
      background: var(--bg-elevated);
    }
  }

  .more-hint {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 8px 0 0;
    text-align: right;
  }

  .reselect-btn {
    margin-top: 10px;
    padding: 0;
  }
}

.progress-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;

  .progress-label {
    font-size: 14px;
    color: var(--text-regular);
    margin-bottom: 20px;
    font-weight: 500;
  }

  .el-progress {
    width: 100%;
    max-width: 400px;
  }
}
</style>
