<template>
  <div
    v-if="visible"
    class="page-tabs"
    :class="{ 'has-scroll-left': hasScrollLeft, 'has-scroll-right': hasScrollRight }"
  >
    <div ref="trackRef" class="tabs-track" @scroll="updateScrollShadow">
      <button
        v-for="p in pinnedPages"
        :key="p.path"
        :class="['tab-item', { active: isActive(p.path) }]"
        @click="navigate(p.path)"
        :title="getDisplayTitle(p)"
      >
        <el-icon class="tab-icon" :size="14">
          <component :is="p.icon || 'Document'" />
        </el-icon>
        <span class="tab-label">{{ getDisplayTitle(p) }}</span>
        <span class="tab-close" @click.stop="unpin(p.path)">
          <el-icon :size="10"><Close /></el-icon>
        </span>
      </button>

      <!-- 当前页（未钉选时显示为可钉选态） -->
      <button
        v-if="showCurrentPage && !isPinned"
        class="tab-item tab-item--ghost"
        @click="pinCurrent"
        :title="`钉选: ${displayCurrentTitle}`"
      >
        <el-icon class="tab-icon" :size="14">
          <component :is="currentMeta?.icon || 'Document'" />
        </el-icon>
        <span class="tab-label">{{ displayCurrentTitle }}</span>
        <span class="tab-pin-hint">
          <el-icon :size="10"><Plus /></el-icon>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { Close, Plus } from '@element-plus/icons-vue';
import { pageTitles } from '@/composables/usePageTitle';

const router = useRouter();
const route = useRoute();
const store = useStore();

const STORAGE_KEY = 'tx_pinned_pages';

const pinnedPages = ref([]);

const loadPins = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) pinnedPages.value = JSON.parse(raw);
  } catch { /* ignore */ }
};

const savePins = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedPages.value));
};

const flattenMenu = (items) => {
  const result = [];
  const walk = (list) => {
    list.forEach((item) => {
      result.push({ path: item.path, title: item.title, icon: item.icon });
      if (item.children) walk(item.children);
    });
  };
  walk(items);
  return result;
};

const menuFlat = computed(() => flattenMenu(store.getters.menus || []));

const findPageMeta = (targetPath) => {
  let found = menuFlat.value.find((m) => m.path === targetPath);
  if (!found) {
    found = menuFlat.value.find((m) => {
      const pattern = m.path.replace(/:\w+/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(targetPath);
    });
  }
  return found || { title: targetPath.split('/').pop() || targetPath, icon: '' };
};

const currentMeta = computed(() => {
  const meta = route.meta;
  return { title: meta?.title || '', icon: meta?.icon || '' };
});

const currentTitle = computed(() => currentMeta.value.title || route.path);
const isPinned = computed(() => pinnedPages.value.some((p) => p.path === route.path));

const showCurrentPage = computed(() => {
  const p = route.path;
  return p !== '/' && p !== '/dashboard' && !isPinned.value;
});

const visible = computed(() => pinnedPages.value.length > 0 || showCurrentPage.value);

const isActive = (path) => route.path === path;

// ── 滚动渐隐遮罩 ──
const trackRef = ref(null);
const hasScrollLeft = ref(false);
const hasScrollRight = ref(false);

const updateScrollShadow = () => {
  const el = trackRef.value;
  if (!el) return;
  hasScrollLeft.value = el.scrollLeft > 4;
  hasScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
};

const navigate = (path) => {
  if (path !== route.path) router.push(path);
};

const pinCurrent = () => {
  const menuMeta = findPageMeta(route.path);
  // 路由 meta 优先（含隐藏路由），菜单仅作兜底
  const title = currentMeta.value.title || menuMeta.title || route.path;
  const icon = currentMeta.value.icon || menuMeta.icon || '';
  if (pinnedPages.value.some((p) => p.path === route.path)) return;
  if (pinnedPages.value.length >= 6) pinnedPages.value.shift();
  pinnedPages.value.push({
    path: route.path,
    title,
    icon,
  });
  savePins();
};

const unpin = (path) => {
  pinnedPages.value = pinnedPages.value.filter((p) => p.path !== path);
  savePins();
};

const cleanupPins = () => {
  const validPaths = new Set(menuFlat.value.map((m) => m.path));
  let changed = false;
  pinnedPages.value = pinnedPages.value.filter((p) => {
    const keep = validPaths.has(p.path) || p.path.includes('/');
    if (!keep) changed = true;
    return keep;
  });
  if (changed) savePins();
};

onMounted(() => {
  loadPins();
  cleanupPins();
  nextTick(() => updateScrollShadow());
});

watch(() => store.getters.menus, () => {
  cleanupPins();
  nextTick(() => updateScrollShadow());
}, { deep: true });

watch(pinnedPages, () => {
  nextTick(() => updateScrollShadow());
}, { deep: true });

const getDisplayTitle = (pinnedPage) => {
  return pageTitles[pinnedPage.path] || pinnedPage.title;
};

const displayCurrentTitle = computed(() => {
  return pageTitles[route.path] || currentTitle.value;
});

</script>

<style lang="scss" scoped>
.page-tabs {
  flex-shrink: 0;
  height: 44px;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(10px) saturate(1.3);
  -webkit-backdrop-filter: blur(10px) saturate(1.3);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  padding: 0 20px;
  overflow: hidden;
  position: relative;
  z-index: 9;

  // 左侧滚动渐隐遮罩
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 32px;
    z-index: 2;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  &::before {
    left: 0;
    background: linear-gradient(to right, rgba(255,255,255,0.55), transparent);
  }
  &::after {
    right: 0;
    background: linear-gradient(to left, rgba(255,255,255,0.55), transparent);
  }

  &.has-scroll-left::before,
  &.has-scroll-right::after {
    opacity: 1;
  }
}

.tabs-track {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
  scrollbar-width: none;
  flex: 1;
  min-width: 0;
  padding: 0 2px;
  position: relative;
  z-index: 1;

  &::-webkit-scrollbar { display: none; }
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 9px 0 11px;
  border-radius: 9px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 450;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.2s ease;
  line-height: 1;
  position: relative;

  // 激活态底部指示条
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 60%;
    height: 2.5px;
    border-radius: 2px;
    background: var(--el-color-primary);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    opacity: 0;
  }

  .tab-icon {
    flex-shrink: 0;
    color: var(--text-placeholder);
    transition: color 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .tab-label {
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tab-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    opacity: 0;
    transform: scale(0.7);
    transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    margin-left: -3px;
    margin-right: -5px;
    color: var(--text-secondary);
    font-size: 10px;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
      color: var(--el-color-danger);
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.9);
    }
  }

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-light);

    .tab-close {
      opacity: 1;
      transform: scale(1);
    }

    .tab-icon {
      color: var(--text-regular);
    }
  }

  &.active {
    background: var(--bg-active);
    color: var(--text-primary);
    font-weight: 550;
    border-color: rgba(64, 158, 255, 0.15);
    box-shadow: 0 1px 3px rgba(64, 158, 255, 0.06);

    &::after {
      transform: translateX(-50%) scaleX(1);
      opacity: 1;
    }

    .tab-icon {
      color: var(--el-color-primary);
    }

    .tab-close {
      opacity: 0.5;
      transform: scale(1);
      &:hover {
        opacity: 1;
        background: var(--el-color-danger-light-9);
        color: var(--el-color-danger);
        transform: scale(1.1);
      }
    }
  }

  &:not(.active):active {
    transform: scale(0.95);
  }
}

.tab-item--ghost {
  border: 1px dashed var(--border-heavy);
  opacity: 0.5;
  animation: ghost-breathe 3s ease-in-out infinite;

  .tab-pin-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    color: var(--text-placeholder);
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    margin-left: -3px;
    margin-right: -5px;
  }

  &:hover {
    opacity: 1;
    border-color: var(--el-color-primary);
    border-style: solid;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    animation: none;

    .tab-icon { color: var(--el-color-primary); }

    .tab-pin-hint {
      background: var(--el-color-primary);
      color: #fff;
      transform: scale(1.05);
    }
  }
}

@keyframes ghost-breathe {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.65; }
}

// ── 暗色模式 ──
[data-theme='dark'] .page-tabs {
  background: rgba(26, 26, 26, 0.55);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &::before {
    background: linear-gradient(to right, rgba(26,26,26,0.55), transparent);
  }
  &::after {
    background: linear-gradient(to left, rgba(26,26,26,0.55), transparent);
  }
}</style>
