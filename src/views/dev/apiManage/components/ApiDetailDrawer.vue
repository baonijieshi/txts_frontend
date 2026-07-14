<template>
  <el-drawer
    :model-value="visible"
    size="680px"
    direction="rtl"
    :before-close="() => $emit('update:visible', false)"
    @update:model-value="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="drawer-header">
        <span class="header-method" :class="`method-${api?.method}`">{{ api?.method }}</span>
        <div class="header-info">
          <span class="header-name">{{ api?.name }}</span>
          <code class="header-path">{{ api?.path }}</code>
        </div>
        <el-button
          :icon="CopyDocument"
          size="small"
          text
          circle
          class="copy-btn"
          @click="copyPath"
        />
      </div>
    </template>

    <div v-if="api" class="detail-body">
      <!-- 基本信息 -->
      <div class="info-cards">
        <div class="info-item">
          <span class="info-label">所属服务</span>
          <span class="info-value">
            <span v-if="api.service_name" class="service-pill">{{ api.service_name }}</span>
            <span v-else class="empty-val">未分配</span>
          </span>
        </div>
        <div class="info-item">
          <span class="info-label">描述</span>
          <span class="info-value">{{ api.description || '暂无描述' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">创建时间</span>
          <span class="info-value">{{ api.created_at || '-' }}</span>
        </div>
      </div>

      <!-- 请求参数 -->
      <div class="section-block">
        <div class="section-title">请求参数</div>
        <el-tabs v-model="activeTab" class="param-tabs">
          <el-tab-pane name="path">
            <template #label>Path <span v-if="pathParams.length" class="tab-count">{{ pathParams.length }}</span></template>
            <div v-if="pathParams.length > 0" class="param-list">
              <div v-for="(row, i) in pathParams" :key="i" class="param-item">
                <span class="param-key">{{ row.key }}</span>
                <el-tag size="small" effect="plain" class="param-type-tag">{{ row.type || 'string' }}</el-tag>
                <span class="param-colon">:</span>
                <span class="param-val">{{ row.value || '-' }}</span>
                <el-tag v-if="row.required" size="small" type="danger" effect="plain" class="param-required">必填</el-tag>
                <span v-if="row.description" class="param-desc">// {{ row.description }}</span>
              </div>
            </div>
            <el-empty v-else description="无 Path 参数" :image-size="48" />
          </el-tab-pane>
          <el-tab-pane name="query">
            <template #label>Query <span v-if="queryParams.length" class="tab-count">{{ queryParams.length }}</span></template>
            <div v-if="queryParams.length > 0" class="param-list">
              <div v-for="(row, i) in queryParams" :key="i" class="param-item">
                <span class="param-key">{{ row.key }}</span>
                <el-tag size="small" effect="plain" class="param-type-tag">{{ row.type || 'string' }}</el-tag>
                <span v-if="row.value" class="param-eq">=</span>
                <span v-if="row.value" class="param-val">{{ row.value }}</span>
                <el-tag v-if="row.required" size="small" type="danger" effect="plain" class="param-required">必填</el-tag>
                <span v-if="row.description" class="param-desc">// {{ row.description }}</span>
              </div>
            </div>
            <el-empty v-else description="无 Query 参数" :image-size="48" />
          </el-tab-pane>
          <el-tab-pane name="header">
            <template #label>Header <span v-if="headerParams.length" class="tab-count">{{ headerParams.length }}</span></template>
            <div v-if="headerParams.length > 0" class="param-list">
              <div v-for="(row, i) in headerParams" :key="i" class="param-item">
                <span class="param-key">{{ row.key }}</span>
                <el-tag size="small" effect="plain" class="param-type-tag">{{ row.type || 'string' }}</el-tag>
                <span class="param-colon">:</span>
                <span class="param-val">{{ row.value || '-' }}</span>
                <el-tag v-if="row.required" size="small" type="danger" effect="plain" class="param-required">必填</el-tag>
                <span v-if="row.description" class="param-desc">// {{ row.description }}</span>
              </div>
            </div>
            <el-empty v-else description="无 Header 参数" :image-size="48" />
          </el-tab-pane>
          <el-tab-pane name="body">
            <template #label>Body</template>
            <div v-if="bodyType !== 'none'">
              <div class="body-type-badge">{{ bodyType }}</div>
              <!-- JSON 字段列表 -->
              <div v-if="bodyType === 'json' && jsonFields.length > 0" class="json-field-list">
                <div v-for="(f, i) in jsonFields" :key="i" class="json-field-item">
                  <span class="jf-name">{{ f.key }}</span>
                  <el-tag size="small" effect="plain" class="jf-type">{{ f.type }}</el-tag>
                  <span v-if="f.required" class="jf-required">required</span>
                  <span v-if="f.description" class="jf-desc">{{ f.description }}</span>
                </div>
              </div>
              <!-- form-data 键值对 -->
              <div v-else-if="formBodyRows.length > 0" class="param-list">
                <div v-for="(row, i) in formBodyRows" :key="i" class="param-item">
                  <span class="param-key">{{ row.key }}</span>
                  <span class="param-eq">=</span>
                  <span class="param-val">{{ row.value || '-' }}</span>
                  <span v-if="row.description" class="param-desc">// {{ row.description }}</span>
                </div>
              </div>
              <!-- 文本类型 -->
              <pre v-else-if="bodyText" class="body-text-pre">{{ bodyText }}</pre>
              <el-empty v-else description="无 Body 内容" :image-size="48" />
            </div>
            <el-empty v-else description="无 Body 参数" :image-size="48" />
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 响应示例 -->
      <div v-if="api.response_example" class="section-block">
        <div class="section-title-row">
          <span class="section-title" style="margin-bottom:0">响应示例</span>
          <el-button size="small" text type="primary" @click="copyResponse">
            <el-icon><CopyDocument /></el-icon>复制
          </el-button>
        </div>
        <pre class="response-pre" v-html="highlightJson(api.response_example)" />
      </div>

      <!-- 响应状态码 -->
      <div v-if="responseStatusList.length > 0" class="section-block">
        <div class="section-title">响应状态</div>
        <div class="resp-status-pills">
          <button
            v-for="rs in responseStatusList"
            :key="rs.code"
            class="status-pill"
            :class="{ 'is-active': selectedRespStatus === rs.code, [`status-${rs.code.charAt(0)}`]: true }"
            @click="selectedRespStatus = selectedRespStatus === rs.code ? '' : rs.code"
          >
            <span class="sp-code">{{ rs.code }}</span>
            <span class="sp-desc">{{ rs.description }}</span>
          </button>
        </div>
        <div v-if="selectedRespFields.length > 0" class="resp-fields">
          <div class="json-field-header">
            <span class="col-name">字段名</span>
            <span class="col-type">类型</span>
            <span class="col-required">必填</span>
            <span class="col-desc">描述</span>
          </div>
          <div v-for="(f, i) in selectedRespFields" :key="i" class="json-field-row">
            <span class="row-idx">{{ i + 1 }}</span>
            <span class="field-name">{{ f.key }}</span>
            <el-tag size="small" effect="plain" class="field-type">{{ f.type }}</el-tag>
            <span v-if="f.required" class="field-required">required</span>
            <span class="field-desc">{{ f.description }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <el-button :icon="Delete" type="danger" plain @click="$emit('delete', api)">删除</el-button>
        <div class="footer-right">
          <el-button :icon="VideoPlay" @click="$emit('debug', api)">调试</el-button>
          <el-button :icon="Edit" type="primary" @click="$emit('edit', api)">编辑</el-button>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, ref } from 'vue';
import {
  Edit, Delete, VideoPlay, CopyDocument,
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  visible: { type: Boolean, default: false },
  api: { type: Object, default: null },
});
defineEmits(['update:visible', 'edit', 'delete', 'debug']);

const activeTab = ref('query');

const pathParams = computed(() => {
  const p = props.api?.parameters || {};
  return Array.isArray(p.path) ? p.path : [];
});
const queryParams = computed(() => {
  const p = props.api?.parameters || {};
  return Array.isArray(p.query) ? p.query : [];
});
const headerParams = computed(() => {
  const p = props.api?.parameters || {};
  return Array.isArray(p.header) ? p.header : [];
});
const bodyType = computed(() => {
  const body = props.api?.parameters?.body;
  return body?.type || 'none';
});
const jsonFields = computed(() => {
  const body = props.api?.parameters?.body;
  if (body?.type === 'json' && Array.isArray(body.content)) return body.content;
  return [];
});
const formBodyRows = computed(() => {
  const body = props.api?.parameters?.body;
  const formTypes = ['form-data', 'x-www-form-urlencoded'];
  if (formTypes.includes(body?.type) && Array.isArray(body.content)) return body.content;
  return [];
});
const bodyText = computed(() => {
  const body = props.api?.parameters?.body;
  if (typeof body?.content === 'string') return body.content;
  return '';
});

// 响应数据：statusCode -> { description, contentType, fields }
const responseStatusList = computed(() => {
  const rd = props.api?.response_data;
  if (!rd || typeof rd !== 'object') return [];
  return Object.entries(rd).map(([code, info]) => ({
    code,
    description: info?.description || '',
    contentType: info?.contentType || '',
    fields: Array.isArray(info?.fields) ? info.fields : [],
  }));
});

const selectedRespStatus = ref('');
const selectedRespFields = computed(() => {
  if (!selectedRespStatus.value) return [];
  const entry = props.api?.response_data?.[selectedRespStatus.value];
  return Array.isArray(entry?.fields) ? entry.fields : [];
});

function copyPath() {
  const text = props.api?.path || '';
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('路径已复制');
  });
}

function copyResponse() {
  const text = props.api?.response_example || '';
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('响应示例已复制');
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
// 头部
.drawer-header {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.header-method {
  font-size: 13px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
  padding: 5px 12px;
  border-radius: 6px;
  letter-spacing: 0.5px;
  flex-shrink: 0;

  &.method-GET { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.method-POST { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.method-PUT { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.method-PATCH { background: var(--bg-hover); color: var(--text-secondary); }
  &.method-DELETE { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
}

.header-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-path {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-btn {
  flex-shrink: 0;
  color: var(--text-secondary);
  &:hover { color: var(--el-color-primary); }
}

// 基本信息卡片
.info-cards {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--bg-elevated);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: baseline;
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
  word-break: break-all;
}

.empty-val { color: var(--text-placeholder); }

.service-pill {
  display: inline-block;
  padding: 2px 10px;
  background: var(--bg-card);
  color: var(--text-regular);
  border-radius: 10px;
  font-size: 12px;
  border: 1px solid var(--border-color);
}

// Section
.section-block {
  margin-bottom: 20px;
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

// Tabs
.param-tabs {
  :deep(.el-tabs__header) { margin-bottom: 12px; }
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

// 参数列表
.param-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  flex-wrap: wrap;
}

.param-key {
  font-weight: 600;
  color: var(--el-color-primary);
}

.param-eq, .param-colon {
  color: var(--text-placeholder);
}

.param-val {
  color: var(--text-regular);
}

.param-desc {
  color: var(--text-secondary);
  font-size: 12px;
  margin-left: 4px;
}

// Body 类型
.body-type-badge {
  display: inline-block;
  padding: 3px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

// JSON 字段列表
.json-field-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.json-field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border-radius: 6px;
  font-size: 13px;
}

.jf-name {
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace;
}

.jf-type {
  flex-shrink: 0;
}

.jf-required {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  padding: 1px 6px;
  border-radius: 4px;
}

.jf-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: auto;
}

.body-text-pre {
  background: var(--bg-elevated);
  border-radius: 6px;
  padding: 12px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-primary);
  margin: 0;
}

// 响应示例
.response-pre {
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 8px;
  padding: 14px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 320px;
  overflow: auto;
  margin: 0;
  line-height: 1.6;

  :deep(.json-key) { color: #9cdcfe; }
  :deep(.json-string) { color: #ce9178; }
  :deep(.json-number) { color: #b5cea8; }
  :deep(.json-boolean) { color: #569cd6; }
  :deep(.json-null) { color: #569cd6; }
}

// 响应状态码 pills
.resp-status-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  font-size: 13px;

  &:hover {
    border-color: var(--el-color-primary);
  }

  &.is-active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }

  &.status-2.is-active {
    background: var(--el-color-success-light-9);
    border-color: var(--el-color-success);
    color: var(--el-color-success);
  }

  &.status-4.is-active {
    background: var(--el-color-warning-light-9);
    border-color: var(--el-color-warning);
    color: var(--el-color-warning);
  }

  &.status-5.is-active {
    background: var(--el-color-danger-light-9);
    border-color: var(--el-color-danger);
    color: var(--el-color-danger);
  }

  .sp-code {
    font-weight: 700;
    font-family: 'Consolas', 'Monaco', monospace;
  }

  .sp-desc {
    color: var(--text-secondary);
    font-size: 12px;
  }
}

// 响应字段列表
.resp-fields {
  margin-top: 8px;
}

.field-name {
  font-weight: 600;
  color: var(--el-color-primary);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  flex: 2;
  min-width: 0;
}

.field-type {
  flex: 0 0 auto;
}

.field-required {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  padding: 1px 6px;
  border-radius: 4px;
}

.field-desc {
  font-size: 12px;
  color: var(--text-secondary);
  flex: 2;
  min-width: 0;
}

.param-required {
  margin-left: 4px;
  flex-shrink: 0;
}

.param-type-tag {
  flex-shrink: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 10px;
}

// Footer
.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .footer-right { display: flex; gap: 8px; }
}
</style>
