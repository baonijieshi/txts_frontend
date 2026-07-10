<template>
  <el-drawer
    :model-value="visible"
    title="Mock 详情"
    size="580px"
    @update:model-value="$emit('update:visible', $event)"
  >
    <template v-if="mock">
      <!-- 基本信息 -->
      <div class="info-cards">
        <div class="info-item">
          <span class="info-label">Snow ID</span>
          <span class="info-value"><code class="snow-id-tag">{{ mock.snow_id }}</code></span>
        </div>
        <div class="info-item">
          <span class="info-label">应用名称</span>
          <span class="info-value">{{ mock.app_name }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">接口地址</span>
          <span class="info-value"><code class="path-code">{{ mock.path }}</code></span>
        </div>
        <div class="info-item">
          <span class="info-label">创建人</span>
          <span class="info-value">{{ mock.creator || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">创建时间</span>
          <span class="info-value">{{ mock.create_time }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">更新时间</span>
          <span class="info-value">{{ mock.update_time }}</span>
        </div>
      </div>

      <!-- 调用说明 -->
      <div class="usage-section">
        <div class="usage-header">
          <el-icon><InfoFilled /></el-icon>
          <span>如何使用此 Mock</span>
        </div>
        <p class="usage-desc">
          将请求发送到平台地址，在 Header 中携带 <code>x-auth-mockid</code> 即可返回 Mock 数据。
        </p>
        <el-tabs v-model="exampleTab" class="example-tabs">
          <el-tab-pane label="cURL" name="curl">
            <pre class="code-block">{{ curlExample }}</pre>
          </el-tab-pane>
          <el-tab-pane label="Python" name="python">
            <pre class="code-block">{{ pythonExample }}</pre>
          </el-tab-pane>
          <el-tab-pane label="JavaScript" name="js">
            <pre class="code-block">{{ jsExample }}</pre>
          </el-tab-pane>
        </el-tabs>
        <div class="copy-row">
          <el-button size="small" type="primary" plain @click="copyCurrentExample">
            <el-icon><CopyDocument /></el-icon>复制代码
          </el-button>
        </div>
      </div>

      <!-- 返回值 JSON -->
      <div class="json-section">
        <div class="json-header">
          <span class="json-title">返回值 JSON</span>
          <el-button size="small" text type="primary" @click="copyJson">
            <el-icon><CopyDocument /></el-icon>复制
          </el-button>
        </div>
        <pre class="json-preview" v-html="highlightJson(mock.re_data)" />
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { InfoFilled, CopyDocument } from '@element-plus/icons-vue';

const props = defineProps({
  visible: Boolean,
  mock: { type: Object, default: null },
});

defineEmits(['update:visible']);

const exampleTab = ref('curl');
const baseUrl = computed(() => process.env.VUE_APP_MOCK_SERVER || window.location.origin);

const curlExample = computed(() => {
  if (!props.mock) return '';
  const path = props.mock.path || '/your/api/path';
  return `curl -X GET "${baseUrl.value}${path}" \\
  -H "x-auth-mockid: ${props.mock.snow_id}"`;
});

const pythonExample = computed(() => {
  if (!props.mock) return '';
  const path = props.mock.path || '/your/api/path';
  return `import requests

response = requests.get(
    "${baseUrl.value}${path}",
    headers={"x-auth-mockid": "${props.mock.snow_id}"}
)
print(response.json())`;
});

const jsExample = computed(() => {
  if (!props.mock) return '';
  const path = props.mock.path || '/your/api/path';
  return `fetch("${baseUrl.value}${path}", {
  headers: { "x-auth-mockid": "${props.mock.snow_id}" }
})
  .then(res => res.json())
  .then(data => console.log(data));`;
});

const formattedJson = computed(() => {
  if (!props.mock?.re_data) return '';
  try {
    return JSON.stringify(JSON.parse(props.mock.re_data), null, 2);
  } catch {
    return props.mock.re_data;
  }
});

function copyText(text) {
  if (!text) return;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      ElMessage.success('已复制到剪贴板');
    });
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    ElMessage.success('已复制到剪贴板');
  }
}

function copyCurrentExample() {
  const map = { curl: curlExample, python: pythonExample, js: jsExample };
  copyText(map[exampleTab.value]?.value || '');
}

function copyJson() { copyText(formattedJson.value); }

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightJson(data) {
  if (!data) return '';
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
// 基本信息卡片
.info-cards {
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
  &:last-child { border-bottom: none; }
}

.info-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  width: 80px;
  flex-shrink: 0;
}

.info-value {
  font-size: 13px;
  color: var(--text-primary);
}

.snow-id-tag {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  background: var(--bg-card);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  color: var(--text-regular);
}

.path-code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  background: var(--bg-card);
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

// 调用说明
.usage-section {
  background: var(--el-color-success-light-9);
  border: 1px solid var(--el-color-success-light-7);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}

.usage-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-success);
  margin-bottom: 8px;
}

.usage-desc {
  font-size: 13px;
  color: var(--text-regular);
  line-height: 1.6;
  margin: 0 0 12px;

  code {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    padding: 1px 5px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 12px;
    color: var(--el-color-warning);
  }
}

.example-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
  :deep(.el-tabs__item) {
    font-size: 12px;
    height: 32px;
    line-height: 32px;
  }
  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }
}

.code-block {
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 0 0 8px 8px;
  padding: 14px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.copy-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

// JSON 区域
.json-section {
  margin-bottom: 8px;
}

.json-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.json-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.json-preview {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 14px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  overflow: auto;
  max-height: 400px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;

  :deep(.json-key) { color: #9cdcfe; }
  :deep(.json-string) { color: #ce9178; }
  :deep(.json-number) { color: #b5cea8; }
  :deep(.json-boolean) { color: #569cd6; }
  :deep(.json-null) { color: #569cd6; }
}
</style>
