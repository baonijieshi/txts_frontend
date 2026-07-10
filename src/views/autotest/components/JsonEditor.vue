<template>
  <div class="json-editor" :class="{ 'has-error': !!errorMsg }">
    <div class="editor-toolbar">
      <span class="editor-label">JSON</span>
      <div class="toolbar-actions">
        <el-popover
          placement="bottom-end"
          :width="320"
          trigger="click"
          popper-class="faker-popover"
          @show="loadFakerVars"
        >
          <template #reference>
            <el-button size="small" link type="info">插入变量</el-button>
          </template>
          <div class="faker-panel">
            <div class="faker-search">
              <el-input v-model="fakerSearch" placeholder="搜索变量..." size="small" clearable />
            </div>
            <div v-if="fakerGroups.length === 0" class="faker-loading">加载中...</div>
            <div v-else class="faker-groups">
              <template v-for="group in filteredFakerGroups" :key="group.group">
                <div class="faker-group-title">{{ group.group }}</div>
                <div
                  v-for="item in group.items"
                  :key="item.key"
                  class="faker-item"
                  @click="insertFakerVar(item.key)"
                >
                  <span class="faker-key">${{ '{' + item.key + '}' }}</span>
                  <span class="faker-label">{{ item.label }}</span>
                  <span class="faker-example">{{ item.example }}</span>
                </div>
              </template>
              <div v-if="filteredFakerGroups.length === 0" class="faker-empty">无匹配结果</div>
            </div>
          </div>
        </el-popover>
        <el-button size="small" link type="primary" @click="format">美化</el-button>
      </div>
    </div>
    <div class="editor-body">
      <div ref="gutterRef" class="gutter" aria-hidden="true">
        <div v-for="n in lineCount" :key="n" class="line-num">{{ n }}</div>
      </div>
      <!-- eslint-disable-next-line vuejs-accessibility/label-has-for -->
      <label :for="uid" class="sr-only">JSON 编辑器</label>
      <textarea
        :id="uid"
        ref="textareaRef"
        v-model="inner"
        class="code-area"
        spellcheck="false"
        :placeholder="placeholder"
        @input="onInput"
        @blur="onBlur"
        @scroll="syncScroll"
        @keydown.tab.prevent="insertTab"
      />
    </div>
    <div v-if="errorMsg" class="error-bar">
      <el-icon><WarningFilled /></el-icon>{{ errorMsg }}
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, computed, watch, nextTick,
} from 'vue';
import { WarningFilled } from '@element-plus/icons-vue';
import { getFakerVars } from '@/api/autotest';

// 每个实例唯一 id，避免多步骤时 id 冲突导致校验失效
let uidCounter = 0;
const uid = `json-editor-${(uidCounter += 1)}`;

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: {
    type: String,
    // eslint-disable-next-line no-template-curly-in-string
    default: 'JSON 字符串，支持 ${变量名} 和 ${faker.xxx} 占位符',
  },
});
const emit = defineEmits(['update:modelValue', 'valid-change']);

const inner = ref(props.modelValue || '');
const errorMsg = ref('');
const textareaRef = ref(null);
const gutterRef = ref(null);

// ── faker 变量面板 ──────────────────────────────────────────
const fakerGroups = ref([]);
const fakerSearch = ref('');
let fakerLoaded = false;

const filteredFakerGroups = computed(() => {
  const q = fakerSearch.value.trim().toLowerCase();
  if (!q) return fakerGroups.value;
  return fakerGroups.value
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => item.key.includes(q) || item.label.includes(q)),
    }))
    .filter((g) => g.items.length > 0);
});

async function loadFakerVars() {
  if (fakerLoaded) return;
  try {
    const res = await getFakerVars();
    fakerGroups.value = res.data || [];
    fakerLoaded = true;
  } catch { /* ignore */ }
}

function insertFakerVar(key) {
  const el = textareaRef.value;
  if (!el) return;
  const tpl = `\${${key}}`;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  inner.value = inner.value.substring(0, start) + tpl + inner.value.substring(end);
  emit('update:modelValue', inner.value);
  nextTick(() => {
    el.focus();
    el.selectionStart = start + tpl.length;
    el.selectionEnd = start + tpl.length;
    syncGutterHeight();
  });
}

// ── 核心编辑逻辑 ────────────────────────────────────────────
watch(() => props.modelValue, (val) => {
  if (val !== inner.value) inner.value = val || '';
});

const lineCount = computed(() => Math.max(inner.value.split('\n').length, 1));

function onInput() {
  emit('update:modelValue', inner.value);
  errorMsg.value = '';
  nextTick(syncGutterHeight);
}

function onBlur() { validate(); }

function syncScroll() {
  if (gutterRef.value && textareaRef.value) {
    gutterRef.value.scrollTop = textareaRef.value.scrollTop;
  }
}

function syncGutterHeight() {
  if (gutterRef.value && textareaRef.value) {
    gutterRef.value.scrollTop = textareaRef.value.scrollTop;
  }
}

function insertTab(e) {
  const el = e.target;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  inner.value = `${inner.value.substring(0, start)}  ${inner.value.substring(end)}`;
  emit('update:modelValue', inner.value);
  nextTick(() => {
    el.selectionStart = start + 2;
    el.selectionEnd = start + 2;
  });
}

function sanitizeForJson(raw) {
  // 两步替换：
  // 1. 已在 JSON 字符串内的变量（引号内）：替换为普通占位文本，不加引号
  // 2. 作为独立 JSON 值的变量（引号外）：替换为带引号的字符串
  return raw
    .replace(/"([^"]*)\$\{[^}]+\}([^"]*)"/g, (_, pre, post) => `"${pre}__VAR__${post}"`)
    .replace(/\$\{[^}]+\}/g, '"__VAR__"');
}

function validate() {
  const raw = inner.value.trim();
  if (!raw) { errorMsg.value = ''; emit('valid-change', true); return true; }
  const sanitized = sanitizeForJson(raw);
  try {
    JSON.parse(sanitized);
    errorMsg.value = '';
    emit('valid-change', true);
    return true;
  } catch (e) {
    const match = e.message.match(/position (\d+)/);
    let hint = e.message;
    if (match) {
      const pos = parseInt(match[1], 10);
      const before = sanitized.substring(0, pos);
      const line = before.split('\n').length;
      const col = pos - before.lastIndexOf('\n');
      hint = `第 ${line} 行，第 ${col} 列：${e.message}`;
    }
    errorMsg.value = hint;
    emit('valid-change', false);
    return false;
  }
}

function format() {
  const raw = inner.value.trim();
  if (!raw) return;
  const placeholders = [];

  // 先处理字符串内的变量：保留引号，只替换变量部分
  let sanitized = raw.replace(/"([^"]*)(\$\{[^}]+\})([^"]*)"/g, (_, pre, ph, post) => {
    const idx = placeholders.length;
    placeholders.push({
      ph, inString: true, pre, post,
    });
    return `"${pre}__PH_${idx}__${post}"`;
  });
  // 再处理独立值变量
  sanitized = sanitized.replace(/\$\{[^}]+\}/g, (ph) => {
    const idx = placeholders.length;
    placeholders.push({ ph, inString: false });
    return `"__PH_${idx}__"`;
  });

  try {
    let pretty = JSON.stringify(JSON.parse(sanitized), null, 2);
    // 还原：从后往前替换避免索引错位
    for (let i = placeholders.length - 1; i >= 0; i -= 1) {
      const { ph, inString } = placeholders[i];
      if (inString) {
        pretty = pretty.replace(`__PH_${i}__`, ph);
      } else {
        pretty = pretty.replace(`"__PH_${i}__"`, ph);
      }
    }
    inner.value = pretty;
    emit('update:modelValue', pretty);
    errorMsg.value = '';
  } catch { validate(); }
}

defineExpose({ validate, format });
</script>

<style scoped lang="scss">
.json-editor {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.2s;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;

  &:focus-within { border-color: var(--el-color-primary); }
  &.has-error {
    border-color: var(--el-color-danger);
    &:focus-within { border-color: var(--el-color-danger); }
  }
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 8px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-color);

  .editor-label { font-size: 11px; color: var(--text-secondary); }
  .toolbar-actions { display: flex; gap: 4px; align-items: center; }
}

.editor-body {
  display: flex;
  height: 200px;
  overflow: hidden;
}

.gutter {
  min-width: 36px;
  background: var(--bg-elevated);
  border-right: 1px solid var(--border-color);
  overflow: hidden;
  user-select: none;
  padding: 8px 0;
  text-align: right;

  .line-num {
    padding: 0 6px;
    line-height: 1.6;
    color: var(--text-secondary);
    font-size: 12px;
    white-space: nowrap;
  }
}

.code-area {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  padding: 8px;
  line-height: 1.6;
  background: var(--bg-card);
  color: var(--text-primary);
  overflow: auto;
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;

  &::placeholder { color: var(--text-secondary); }
}

.error-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  font-size: 12px;
  border-top: 1px solid var(--el-color-danger-light-5);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

<style lang="scss">
/* faker 面板全局样式（不 scoped，因为在 popper 里渲染） */
.faker-panel {
  font-size: 13px;

  .faker-search { margin-bottom: 8px; }

  .faker-loading,
  .faker-empty {
    text-align: center;
    color: var(--text-secondary);
    padding: 12px 0;
    font-size: 12px;
  }

  .faker-groups { max-height: 320px; overflow-y: auto; }

  .faker-group-title {
    font-size: 11px;
    color: var(--text-secondary);
    font-weight: 600;
    padding: 6px 4px 2px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .faker-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover { background: var(--el-color-primary-light-9); }

    .faker-key {
      font-family: 'Consolas', monospace;
      font-size: 12px;
      color: var(--el-color-primary);
      min-width: 130px;
      flex-shrink: 0;
    }

    .faker-label {
      color: var(--text-primary);
      flex: 1;
      font-size: 12px;
    }

    .faker-example {
      color: var(--text-placeholder);
      font-size: 11px;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
