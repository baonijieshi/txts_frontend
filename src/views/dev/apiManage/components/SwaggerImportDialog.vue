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
});
const emit = defineEmits(['update:visible', 'import-confirm']);

const fileInputRef = ref(null);
const isDragging = ref(false);
const parseError = ref('');
const parsedApis = ref(null);

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

    parsedApis.value = extractApis(json.paths);
  };
  reader.readAsText(file);
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

function extractApis(paths) {
  const VALID_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
  const result = [];
  Object.entries(paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, operation]) => {
      if (!VALID_METHODS.includes(method.toLowerCase())) return;

      const parameters = { query: [], header: [], body: { type: 'json', content: '' } };
      const rawParams = operation?.parameters || [];
      rawParams.forEach((p) => {
        const item = { key: p.name || '', value: p.default ?? '', description: p.description || '' };
        if (p.in === 'query') parameters.query.push(item);
        else if (p.in === 'header') parameters.header.push(item);
        else if (p.in === 'body') {
          parameters.body = { type: 'json', content: schemaToFields(p.schema || {}) };
        }
      });
      const requestBody = operation?.requestBody;
      if (requestBody) {
        const jsonContent = requestBody?.content?.['application/json']?.schema;
        const formContent = requestBody?.content?.['application/x-www-form-urlencoded']?.schema;
        if (jsonContent) {
          parameters.body = { type: 'json', content: schemaToFields(jsonContent) };
        } else if (formContent) {
          const props2 = formContent.properties || {};
          parameters.body = {
            type: 'form-data',
            content: Object.entries(props2).map(([k, v]) => ({
              key: k, value: '', description: v.description || '',
            })),
          };
        }
      }

      let responseExample = '';
      const responses = operation?.responses || {};
      const resp200 = responses['200'] || responses[200];
      if (resp200) {
        const schema3 = resp200?.content?.['application/json']?.schema;
        const schema2 = resp200?.schema;
        const schema = schema3 || schema2;
        if (schema) {
          responseExample = JSON.stringify(schema, null, 2);
        } else if (resp200.description) {
          responseExample = resp200.description;
        }
      }

      result.push({
        name: operation?.summary || operation?.operationId || `${method.toUpperCase()} ${path}`,
        path,
        method: method.toUpperCase(),
        description: operation?.description || '',
        parameters,
        response_example: responseExample,
      });
    });
  });
  return result;
}

function resetParse() {
  parsedApis.value = null;
  parseError.value = '';
}

function handleCancel() {
  emit('update:visible', false);
}

function handleConfirm() {
  if (!parsedApis.value) return;
  // 把解析结果交给父组件，由父组件全权控制导入流程和关闭时机
  emit('import-confirm', parsedApis.value);
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
