<template>
  <el-dialog
    :model-value="visible"
    title="Faker 变量选择器"
    width="820px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
    @open="onOpen"
  >
    <div class="faker-dialog-body">
      <!-- 左侧分类 -->
      <div class="faker-sidebar">
        <div
          v-for="g in groups"
          :key="g.group"
          class="faker-cat"
          :class="{ active: activeGroup === g.group }"
          @click="activeGroup = g.group"
        >
          <span class="cat-name">{{ g.group }}</span>
          <span class="cat-count">{{ g.items.length }}</span>
        </div>
      </div>

      <!-- 右侧内容 -->
      <div class="faker-main">
        <div class="faker-search">
          <el-input
            v-model="searchText"
            placeholder="搜索 Faker 方法..."
            size="small"
            clearable
            prefix-icon="Search"
          />
        </div>

        <div v-if="filteredGroups.length === 0" class="faker-empty">
          <span>未找到匹配的 Faker 方法</span>
        </div>

        <div v-else class="faker-grid-wrapper">
          <template v-for="g in filteredGroups" :key="g.group">
            <div class="faker-group-name">{{ g.group }}</div>
            <div class="faker-grid">
              <div
                v-for="item in g.items"
                :key="item.key"
                class="faker-card"
                :class="{ selected: selectedKey === item.key }"
                @click="selectMethod(item)"
              >
                <div class="fc-header">
                  <code class="fc-key">{{ item.key }}{{ hasParams(item) ? '(...)' : '' }}</code>
                  <span class="fc-label">{{ item.label }}</span>
                </div>
                <div class="fc-desc">{{ item.description || item.label }}</div>
                <div class="fc-example">
                  <span class="fc-ex-label">示例：</span>{{ item.example }}
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- 参数配置面板 -->
        <div v-if="selectedItem" class="faker-config">
          <div class="config-divider" />
          <div class="config-header">
            <span class="config-title">{{ selectedItem.label }}</span>
            <code class="config-key">{{ selectedItem.key }}</code>
          </div>
          <div class="config-desc">{{ selectedItem.description }}</div>

          <div v-if="hasParams(selectedItem)" class="config-params">
            <div
              v-for="param in selectedItem.params"
              :key="param.name"
              class="config-param-row"
            >
              <label class="param-label">{{ param.label }}</label>
              <!-- 数字类型 -->
              <el-input-number
                v-if="param.type === 'number'"
                v-model="paramValues[param.name]"
                :min="param.min"
                :max="param.max"
                :step="1"
                size="small"
                controls-position="right"
                style="width:100%"
              />
              <!-- 下拉选择 -->
              <el-select
                v-else-if="param.type === 'select'"
                v-model="paramValues[param.name]"
                size="small"
                style="width:100%"
              >
                <el-option
                  v-for="opt in param.options"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <!-- 文本输入 -->
              <el-input
                v-else
                v-model="paramValues[param.name]"
                size="small"
                :placeholder="param.placeholder || ''"
              />
            </div>
          </div>

          <div class="config-preview">
            <span class="preview-label">生成的模板语法：</span>
            <code class="preview-code">{{ templateSyntax }}</code>
          </div>

          <div class="config-actions">
            <el-button size="small" @click="$emit('update:visible', false)">取消</el-button>
            <el-button size="small" type="primary" @click="insert">插入</el-button>
          </div>
        </div>

        <!-- 底部提示 -->
        <div v-if="!selectedItem && filteredGroups.length > 0" class="faker-footer-hint">
          点击上方方法卡片以选择并配置参数
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, reactive, computed, watch } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { getFakerVars } from '@/api/autotest';

const props = defineProps({
  visible: Boolean,
});
const emit = defineEmits(['update:visible', 'insert']);

const groups = ref([]);
const searchText = ref('');
const activeGroup = ref('');
const selectedKey = ref('');
const paramValues = reactive({});

let allGroups = [];

const hasParams = (item) => item.params && item.params.length > 0;

function initParamDefaults(item) {
  if (!item || !item.params) return;
  item.params.forEach((p) => {
    if (!(p.name in paramValues)) {
      paramValues[p.name] = p.default !== undefined ? p.default : '';
    }
  });
}

const filteredGroups = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  const active = activeGroup.value;

  return allGroups
    .filter((g) => (active ? g.group === active : true))
    .map((g) => {
      if (!q) return g;
      return {
        ...g,
        items: g.items.filter(
          (item) => item.key.toLowerCase().includes(q)
            || item.label.toLowerCase().includes(q)
            || (item.description || '').toLowerCase().includes(q),
        ),
      };
    })
    .filter((g) => g.items.length > 0);
});

const selectedItem = computed(() => {
  if (!selectedKey.value) return null;
  for (const g of allGroups) {
    const found = g.items.find((item) => item.key === selectedKey.value);
    if (found) return found;
  }
  return null;
});

const templateSyntax = computed(() => {
  if (!selectedItem.value) return '';
  const item = selectedItem.value;
  if (!hasParams(item)) return `\${${item.key}}`;

  const vals = item.params
    .map((p) => {
      const v = paramValues[p.name];
      if (v === undefined || v === '') return null;
      if (p.type === 'number') return String(v);
      return `'${v}'`;
    })
    .filter((v) => v !== null);

  return vals.length > 0
    ? `\${${item.key}(${vals.join(', ')})}`
    : `\${${item.key}}`;
});

function selectMethod(item) {
  selectedKey.value = item.key;
  if (item.params) {
    item.params.forEach((p) => {
      paramValues[p.name] = p.default !== undefined ? p.default : '';
    });
  }
}

function insert() {
  emit('insert', templateSyntax.value);
  emit('update:visible', false);
}

async function onOpen() {
  searchText.value = '';
  selectedKey.value = '';
  if (!allGroups.length) {
    try {
      const res = await getFakerVars();
      allGroups = res.data || [];
    } catch {
      /* ignore */
    }
  }
  groups.value = allGroups;
  if (allGroups.length && !activeGroup.value) {
    activeGroup.value = allGroups[0].group;
  }
}

// 搜索时重置分类选择
watch(searchText, (val) => {
  if (val) activeGroup.value = '';
});
</script>

<style scoped lang="scss">
.faker-dialog-body {
  display: flex;
  gap: 0;
  height: 500px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  overflow: hidden;
}

// 左侧分类
.faker-sidebar {
  width: 130px;
  flex-shrink: 0;
  background: var(--el-fill-color-extra-light);
  border-right: 1px solid var(--el-border-color-light);
  padding: 6px 0;
  overflow-y: auto;
}

.faker-cat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.15s;

  &:hover {
    background: var(--el-fill-color-light);
    color: var(--text-primary);
  }

  &.active {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 600;
  }

  .cat-count {
    font-size: 11px;
    background: var(--el-fill-color);
    color: var(--text-placeholder);
    padding: 1px 6px;
    border-radius: 10px;
    min-width: 20px;
    text-align: center;
  }

  &.active .cat-count {
    background: var(--el-color-primary-light-7);
    color: var(--el-color-primary);
  }
}

// 右侧主区域
.faker-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-card);
}

.faker-search {
  padding: 10px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.faker-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-placeholder);
  font-size: 13px;
}

.faker-grid-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 6px 14px 10px;
}

.faker-group-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-placeholder);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 0 4px;
}

.faker-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.faker-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--bg-card);

  &:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
  }

  &.selected {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    box-shadow: 0 0 0 1px var(--el-color-primary);
  }
}

.fc-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.fc-key {
  font-size: 11px;
  font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  padding: 1px 5px;
  border-radius: 3px;
  white-space: nowrap;
}

.fc-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.fc-desc {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fc-example {
  font-size: 11px;
  color: var(--text-placeholder);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  .fc-ex-label {
    color: var(--text-secondary);
  }
}

// 参数配置面板
.faker-config {
  border-top: 1px solid var(--el-border-color-light);
  padding: 12px 14px;
  background: var(--el-fill-color-extra-light);
}

.config-divider {
  display: none;
}

.config-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.config-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.config-key {
  font-size: 11px;
  font-family: monospace;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  padding: 1px 6px;
  border-radius: 3px;
}

.config-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.config-params {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.config-param-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 180px;

  .param-label {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    min-width: 56px;
  }
}

.config-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--bg-card);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
  margin-bottom: 10px;

  .preview-label {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .preview-code {
    font-size: 13px;
    font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
    color: var(--el-color-primary);
    word-break: break-all;
  }
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.faker-footer-hint {
  padding: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--text-placeholder);
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
