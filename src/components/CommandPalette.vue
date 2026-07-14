<template>
  <Teleport to="body">
    <Transition name="cmd-fade">
      <div
        v-if="visible"
        class="cmd-overlay"
        @click.self="close"
        @keydown.esc="close"
      >
        <div class="cmd-panel" @click.stop>
          <!-- 搜索框 -->
          <div class="cmd-search-bar">
            <el-icon class="cmd-search-icon" :size="18"><Search /></el-icon>
            <input
              ref="inputRef"
              v-model="query"
              class="cmd-input"
              placeholder="搜索或输入命令..."
              @keydown="onKeydown"
              @input="onInput"
            />
            <kbd class="cmd-hint" v-if="!query">esc</kbd>
          </div>

          <!-- 分隔线 -->
          <div class="cmd-divider" v-if="query && filteredResults.length > 0" />

          <!-- 搜索结果 -->
          <div class="cmd-results" v-if="query && filteredResults.length > 0" ref="resultsRef">
            <div class="cmd-group-label">搜索结果</div>
            <button
              v-for="(item, idx) in filteredResults"
              :key="item.id"
              class="cmd-item"
              :class="{ 'cmd-item--active': activeIdx === idx }"
              @click="execute(item)"
              @mouseenter="activeIdx = idx"
            >
              <el-icon class="cmd-item-icon" :size="16"><component :is="item.icon" /></el-icon>
              <span class="cmd-item-text">{{ item.label }}</span>
              <span class="cmd-item-meta">{{ item.meta }}</span>
            </button>
          </div>

          <!-- 无结果 -->
          <div class="cmd-empty" v-if="query && filteredResults.length === 0 && !isSearching">
            <span>未找到结果</span>
          </div>

          <!-- 快捷操作（无输入时显示）-->
          <div class="cmd-sections" v-if="!query">
            <!-- 快速创建 -->
            <div class="cmd-group" v-if="quickActions.length">
              <div class="cmd-group-label">快速创建</div>
              <button
                v-for="(item, idx) in quickActions"
                :key="'qa-' + idx"
                class="cmd-item"
                :class="{ 'cmd-item--active': activeIdx === idx }"
                @click="execute(item)"
                @mouseenter="activeIdx = idx"
              >
                <el-icon class="cmd-item-icon cmd-item-icon--accent" :size="16"><component :is="item.icon" /></el-icon>
                <span class="cmd-item-text">{{ item.label }}</span>
                <kbd class="cmd-item-shortcut" v-if="item.shortcut">{{ item.shortcut }}</kbd>
              </button>
            </div>

            <!-- 页面导航 -->
            <div class="cmd-divider" />
            <div class="cmd-group" v-if="navItems.length">
              <div class="cmd-group-label">页面导航</div>
              <button
                v-for="(item, idx) in navItems"
                :key="'nav-' + idx"
                class="cmd-item"
                :class="{ 'cmd-item--active': activeIdx === quickActions.length + idx }"
                @click="execute(item)"
                @mouseenter="activeIdx = quickActions.length + idx"
              >
                <el-icon class="cmd-item-icon" :size="16"><component :is="item.icon" /></el-icon>
                <span class="cmd-item-text">{{ item.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import {
  Search, Plus, Warning, List, Document, Tickets,
  FolderOpened, TrendCharts, Setting, Monitor,
  DataBoard, Folder, DocumentChecked, EditPen,
  OfficeBuilding, User, Collection,
} from '@element-plus/icons-vue';

const router = useRouter();
const store = useStore();

const visible = ref(false);
const query = ref('');
const activeIdx = ref(0);
const isSearching = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const resultsRef = ref<HTMLElement | null>(null);

const iconMap: Record<string, any> = {
  HomeFilled: DataBoard,
  Collection,
  Document,
  List,
  FolderOpened,
  Warning,
  DocumentChecked,
  Tickets,
  Monitor,
  TrendCharts,
  Setting,
  OfficeBuilding,
  User,
};

function getIcon(iconName: string) {
  return iconMap[iconName] || Folder;
}

// 快速创建操作
const quickActions = [
  { label: '新建任务', icon: List, action: 'createTask', shortcut: '' },
  { label: '提交 Bug', icon: Warning, action: 'createBug', shortcut: '' },
  { label: '创建需求', icon: Document, action: 'createStory', shortcut: '' },
  { label: '新建线上问题', icon: Tickets, action: 'createTicket', shortcut: '' },
  { label: '新建版本', icon: FolderOpened, action: 'createVersion', shortcut: '' },
];

// 从菜单构建导航项
const navItems = computed(() => {
  const menus = store.getters.menus || [];
  const flat: { label: string; icon: any; action: string; path: string }[] = [];
  function walk(items: any[]) {
    items.forEach((item: any) => {
      flat.push({
        label: item.title,
        icon: getIcon(item.icon),
        action: 'navigate',
        path: item.path,
      });
      if (item.children?.length) walk(item.children);
    });
  }
  walk(menus);
  return flat;
});

// 合并所有可搜索项
const allSearchable = computed(() => {
  const items: { id: string; label: string; icon: any; meta: string; action: string; path?: string }[] = [];
  quickActions.forEach((qa) => {
    items.push({ id: 'qa-' + qa.action, label: qa.label, icon: qa.icon, meta: '操作', action: qa.action });
  });
  navItems.value.forEach((ni) => {
    items.push({ id: 'nav-' + ni.path, label: ni.label, icon: ni.icon, meta: '页面', action: 'navigate', path: ni.path });
  });
  return items;
});

const filteredResults = computed(() => {
  if (!query.value) return [];
  const q = query.value.toLowerCase();
  return allSearchable.value.filter(
    (item) => item.label.toLowerCase().includes(q) || item.meta.toLowerCase().includes(q)
  );
});

const allVisibleItems = computed(() => {
  if (query.value) return filteredResults.value;
  return [...quickActions, ...navItems.value.map((n) => ({ ...n, id: 'nav-' + n.path }))];
});

function onInput() {
  activeIdx.value = 0;
}

function onKeydown(e: KeyboardEvent) {
  const items = allVisibleItems.value;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIdx.value = activeIdx.value < items.length - 1 ? activeIdx.value + 1 : 0;
    scrollToActive();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIdx.value = activeIdx.value > 0 ? activeIdx.value - 1 : items.length - 1;
    scrollToActive();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (items[activeIdx.value]) execute(items[activeIdx.value]);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    close();
  }
}

function scrollToActive() {
  nextTick(() => {
    const el = resultsRef.value?.querySelector('.cmd-item--active');
    el?.scrollIntoView({ block: 'nearest' });
  });
}

function execute(item: any) {
  close();
  const action = item.action;
  if (action === 'createTask' || action === 'createBug' || action === 'createStory' || action === 'createTicket' || action === 'createVersion') {
    const routeMap: Record<string, { path: string; query?: Record<string, string> }> = {
      createTask: { path: '/project/versions' },
      createBug: { path: '/test/bug', query: { create: '1' } },
      createStory: { path: '/story', query: { create: '1' } },
      createTicket: { path: '/delivery/ticket', query: { create: '1' } },
      createVersion: { path: '/project/versions' },
    };
    const target = routeMap[action] || { path: '/' };
    router.push(target);
  } else if (action === 'navigate' && item.path) {
    router.push(item.path);
  }
}

function open() {
  query.value = '';
  activeIdx.value = 0;
  visible.value = true;
  nextTick(() => {
    inputRef.value?.focus();
  });
}

function close() {
  visible.value = false;
}

function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    open();
  }
}

watch(visible, (val) => {
  if (!val) {
    query.value = '';
    activeIdx.value = 0;
  }
});

onMounted(() => {
  document.addEventListener('keydown', onGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onGlobalKeydown);
});
</script>

<style scoped lang="scss">
/* ── 遮罩层 ── */
.cmd-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  padding-top: 16vh;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.cmd-panel {
  width: 520px;
  max-height: 60vh;
  background: var(--bg-card);
  border-radius: 16px;
  box-shadow: 0 0 0 1px var(--border-color), 0 20px 60px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-self: flex-start;
}

/* ── 搜索栏 ── */
.cmd-search-bar {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 10px;
  flex-shrink: 0;
}
.cmd-search-icon {
  color: var(--text-placeholder);
  flex-shrink: 0;
}
.cmd-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--text-primary);
  font-family: inherit;
  &::placeholder {
    color: var(--text-placeholder);
  }
}
.cmd-hint {
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid var(--border-color);
  color: var(--text-placeholder);
  background: var(--bg-elevated);
  letter-spacing: 0.3px;
}

/* ── 分隔线 ── */
.cmd-divider {
  height: 1px;
  background: var(--border-light);
  flex-shrink: 0;
}

/* ── 结果区 ── */
.cmd-results {
  overflow-y: auto;
  padding: 6px;
  flex: 1;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
  }
}

.cmd-sections {
  overflow-y: auto;
  padding: 6px;
  flex: 1;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
  }
}

.cmd-group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-placeholder);
  padding: 6px 12px 2px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.cmd-group {
  padding-bottom: 2px;
}

/* ── 选项 ── */
.cmd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  color: var(--text-primary);
  text-align: left;
  transition: background 0.1s ease;

  &:hover,
  &.cmd-item--active {
    background: var(--bg-hover);
  }
}

.cmd-item-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
  &--accent {
    color: var(--el-color-primary);
  }
}

.cmd-item-text {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cmd-item-meta {
  font-size: 11px;
  color: var(--text-placeholder);
  font-weight: 400;
  flex-shrink: 0;
}

.cmd-item-shortcut {
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  color: var(--text-placeholder);
  background: var(--bg-elevated);
}

.cmd-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px 16px;
  font-size: 13px;
  color: var(--text-placeholder);
}

/* ── 过渡动效 ── */
.cmd-fade-enter-active {
  transition: opacity 0.15s ease;
  .cmd-panel { transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s; }
}
.cmd-fade-leave-active {
  transition: opacity 0.1s ease;
  .cmd-panel { transition: transform 0.1s ease, opacity 0.1s; }
}
.cmd-fade-enter-from {
  opacity: 0;
  .cmd-panel { transform: scale(0.96) translateY(-8px); opacity: 0; }
}
.cmd-fade-leave-to {
  opacity: 0;
  .cmd-panel { transform: scale(0.98); opacity: 0; }
}

/* ── 深色模式 ── */
[data-theme='dark'] {
  .cmd-overlay {
    background: rgba(0, 0, 0, 0.55);
  }
  .cmd-panel {
    box-shadow: 0 0 0 1px var(--border-color), 0 20px 60px rgba(0, 0, 0, 0.45);
  }
}
</style>
