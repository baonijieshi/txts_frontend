<template>
  <div class="theme-page">
    <div class="theme-layout">
      <!-- ═══ 左侧：实时预览 ═══ -->
      <div class="preview-panel">
        <div class="preview-label">实时预览</div>
        <div
          class="sidebar-mockup"
          :style="{ '--mock-bg': sidebar.color, '--mock-title-bg': sidebar.titleColor }"
        >
          <div class="mock-logo" :style="{ background: sidebar.titleColor }">
            <span :style="{ color: sidebar.activeTextColor }">项目管理平台</span>
          </div>
          <div class="mock-menu" :style="{ background: sidebar.color }">
            <div
              v-for="(item, i) in mockMenuItems"
              :key="i"
              class="mock-menu-item"
              :class="{ active: i === 0 }"
              :style="{
                color: i === 0 ? sidebar.activeTextColor : sidebar.textColor,
              }"
            >
              <span class="mock-dot" :style="{
                background: i === 0 ? sidebar.activeTextColor : sidebar.textColor,
                opacity: i === 0 ? 1 : 0.6,
              }" />
              {{ item }}
            </div>
          </div>
        </div>
        <p class="preview-hint">左侧预览即时反映你的主题配置</p>
      </div>

      <!-- ═══ 右侧：配置区 ═══ -->
      <div class="config-panel">
        <el-card shadow="never">
          <!-- 外观模式 -->
          <div class="config-section">
            <h3 class="section-title">外观模式</h3>
            <p class="section-desc">切换浅色 / 深色外观，影响内容区域配色</p>
            <div class="mode-switch">
              <button
                class="mode-btn"
                :class="{ active: localMode === 'light' }"
                @click="setMode('light')"
              >
                <span class="mode-icon">☀️</span>
                <span>浅色模式</span>
              </button>
              <button
                class="mode-btn"
                :class="{ active: localMode === 'dark' }"
                @click="setMode('dark')"
              >
                <span class="mode-icon">🌙</span>
                <span>深色模式</span>
              </button>
            </div>
          </div>

          <!-- 主题色 -->
          <div class="config-section">
            <h3 class="section-title">主题色</h3>
            <p class="section-desc">应用于按钮、链接、高亮等交互元素</p>
            <div class="primary-colors">
              <button
                v-for="c in primaryPresets"
                :key="c"
                class="primary-swatch"
                :class="{ active: localPrimary === c }"
                :style="{ background: c }"
                @click="setPrimary(c)"
              >
                <el-icon v-if="localPrimary === c" :size="16" color="#fff"><Check /></el-icon>
              </button>
              <div class="primary-custom">
                <el-color-picker
                  :model-value="localPrimary"
                  @update:model-value="setPrimary"
                />
                <span class="custom-label">自定义</span>
              </div>
            </div>
          </div>

          <!-- 侧边栏配色 -->
          <div class="config-section">
            <h3 class="section-title">侧边栏配色</h3>
            <p class="section-desc">独立设置侧边栏菜单的颜色方案</p>
            <div class="sidebar-presets">
              <button
                v-for="preset in sidebarPresets"
                :key="preset.name"
                class="sidebar-preset"
                :class="{ active: sidebar.name === preset.name }"
                @click="setSidebar(preset)"
              >
                <div class="preset-preview" :style="{ background: preset.color }">
                  <span class="preset-label" :style="{ color: preset.textColor }">
                    {{ preset.label }}
                  </span>
                  <span
                    class="preset-active"
                    :style="{ color: preset.activeTextColor }"
                  >
                    菜单项
                  </span>
                </div>
                <span class="preset-name">{{ preset.label }}</span>
              </button>
            </div>
            <div class="sidebar-custom">
              <span class="custom-label">自定义侧边栏背景：</span>
              <el-color-picker
                :model-value="sidebar.color"
                @update:model-value="setSidebarCustom"
              />
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { Check } from '@element-plus/icons-vue';

const store = useStore();

/* ── 本地状态，双向绑定 store ── */
const localMode = ref(store.state.settings.mode);
const localPrimary = ref(store.state.settings.primaryColor);
const sidebar = ref({ ...store.state.settings.sidebar });

// 同步 store → 本地
watch(
  () => store.state.settings.mode,
  (v) => { localMode.value = v; },
);
watch(
  () => store.state.settings.primaryColor,
  (v) => { localPrimary.value = v; },
);
watch(
  () => store.state.settings.sidebar,
  (v) => { sidebar.value = { ...v }; },
  { deep: true },
);

/* ── 预设数据 ── */
const primaryPresets = [
  '#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316',
];

const sidebarPresets = [
  { name: 'default', label: '默认蓝', color: '#2b3a4a', titleColor: '#1f2d3d', textColor: '#bfcbd9', activeTextColor: '#409eff' },
  { name: 'dark', label: '深邃黑', color: '#1f1f1f', titleColor: '#0a0a0a', textColor: '#a8a8a8', activeTextColor: '#ffffff' },
  { name: 'green', label: '清新绿', color: '#2d5a3f', titleColor: '#1e3d2a', textColor: '#b8e6c9', activeTextColor: '#67c23a' },
  { name: 'purple', label: '优雅紫', color: '#4a3a5a', titleColor: '#342842', textColor: '#d4c5e0', activeTextColor: '#c084fc' },
  { name: 'orange', label: '活力橙', color: '#c45a3c', titleColor: '#9e4630', textColor: '#fdd9c8', activeTextColor: '#ffb088' },
  { name: 'red', label: '热情红', color: '#b8313e', titleColor: '#8b252f', textColor: '#ffd4d5', activeTextColor: '#ff9e9e' },
  { name: 'teal', label: '青色', color: '#1a6b6b', titleColor: '#145252', textColor: '#b8e6e7', activeTextColor: '#5eead4' },
  { name: 'indigo', label: '靛蓝', color: '#312e81', titleColor: '#1e1b4b', textColor: '#c7d2fe', activeTextColor: '#818cf8' },
];

const mockMenuItems = ['工作台', '需求管理', '测试管理', '系统设置'];

/* ── 操作 ── */
function setMode(mode: string) {
  localMode.value = mode;
  store.dispatch('settings/setMode', mode);
  autoSave();
}

function setPrimary(color: string) {
  localPrimary.value = color;
  store.dispatch('settings/setPrimaryColor', color);
  autoSave();
}

function setSidebar(preset: Record<string, string>) {
  sidebar.value = { ...preset };
  store.dispatch('settings/setSidebar', { ...preset });
  autoSave();
}

function setSidebarCustom(hexColor: string) {
  const hex = hexColor || '#2b3a4a';
  const titleColor = adjustBrightness(hex, -15);
  const { textColor, activeTextColor } = generateTextColors(hex);
  const custom = {
    name: 'custom',
    label: '自定义',
    color: hex,
    titleColor,
    textColor,
    activeTextColor,
  };
  setSidebar(custom);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function autoSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    store.dispatch('settings/saveToBackend');
  }, 600);
}

/* ── 颜色工具 ── */
function adjustBrightness(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  if (h.length > 6) return hex; // 含 alpha 则跳过
  const r = Math.min(255, Math.max(0, parseInt(h.substring(0, 2), 16) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, parseInt(h.substring(2, 4), 16) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, parseInt(h.substring(4, 6), 16) + Math.round(2.55 * percent)));
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generateTextColors(bg: string): { textColor: string; activeTextColor: string } {
  const h = bg.replace('#', '').substring(0, 6);
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lum = (r * 299 + g * 587 + b * 114) / 1000;

  if (lum >= 128) {
    const dr = Math.floor(r * 0.2);
    const dg = Math.floor(g * 0.2);
    const db = Math.floor(b * 0.2);
    return { textColor: `#${toHex(dr)}${toHex(dg)}${toHex(db)}`, activeTextColor: `#${toHex(Math.max(0, dr - 30))}${toHex(Math.max(0, dg - 30))}${toHex(Math.max(0, db - 30))}` };
  }
  const lr = Math.min(255, r + Math.floor((255 - r) * 0.7));
  const lg = Math.min(255, g + Math.floor((255 - g) * 0.7));
  const lb = Math.min(255, b + Math.floor((255 - b) * 0.7));
  const ar = Math.min(255, r + Math.floor((255 - r) * 0.9));
  const ag = Math.min(255, g + Math.floor((255 - g) * 0.9));
  const ab = Math.min(255, b + Math.floor((255 - b) * 0.9));
  return { textColor: `#${toHex(lr)}${toHex(lg)}${toHex(lb)}`, activeTextColor: `#${toHex(ar)}${toHex(ag)}${toHex(ab)}` };
}

function toHex(n: number): string {
  const v = Math.max(0, Math.min(255, n)).toString(16);
  return v.length === 1 ? `0${v}` : v;
}
</script>

<style lang="scss" scoped>
.theme-page {
  padding: 20px;
  height: 100%;
  box-sizing: border-box;
}

.theme-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

/* ═══ 左侧预览 ═══ */
.preview-panel {
  width: 260px;
  flex-shrink: 0;
  position: sticky;
  top: 20px;

  .preview-label {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
  }

  .sidebar-mockup {
    border-radius: 10px;
    overflow: hidden;
    box-shadow: var(--shadow-hover);
    border: 1px solid var(--border-color);
    background: var(--mock-bg);
  }

  .mock-logo {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
  }

  .mock-menu {
    padding: 8px 0;
  }

  .mock-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 12px;
    transition: all 0.2s;

    &.active {
      font-weight: 500;
    }

    .mock-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  }

  .preview-hint {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 8px;
    text-align: center;
  }
}

/* ═══ 右侧配置 ═══ */
.config-panel {
  flex: 1;
  min-width: 0;

  :deep(.el-card__body) {
    padding: 24px 28px;
  }
}

.config-section {
  margin-bottom: 28px;

  &:last-child {
    margin-bottom: 0;
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .section-desc {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 14px;
  }
}

/* ── 外观模式 ── */
.mode-switch {
  display: flex;
  gap: 10px;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-card);
  cursor: pointer;
  font-size: 14px;
  color: var(--text-regular);
  transition: all 0.2s;

  .mode-icon {
    font-size: 18px;
  }

  &:hover {
    border-color: var(--text-secondary);
  }

  &.active {
    border-color: var(--color-primary);
    background: var(--color-primary-light, #ecf5ff);
    color: var(--color-primary);
    font-weight: 500;
  }
}

/* ── 主题色 ── */
.primary-colors {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.primary-swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;

  &:hover {
    transform: scale(1.15);
  }

  &.active {
    border-color: var(--text-primary);
    box-shadow: var(--shadow-card);
    transform: scale(1.1);
  }
}

.primary-custom {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;

  .custom-label {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
  }
}

/* ── 侧边栏预设 ── */
.sidebar-presets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.sidebar-preset {
  border: 2px solid var(--border-color);
  border-radius: 10px;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: none;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-dropdown);
  }

  &.active {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px var(--color-primary);
  }

  .preset-preview {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 12px;
    min-height: 56px;
  }

  .preset-label {
    font-size: 11px;
    opacity: 0.7;
  }

  .preset-active {
    font-size: 12px;
    font-weight: 500;
  }

  .preset-name {
    display: block;
    font-size: 12px;
    color: var(--text-regular);
    padding: 6px 8px;
    border-top: 1px solid var(--border-color);
    text-align: center;
  }
}

/* ── 侧边栏自定义 ── */
.sidebar-custom {
  display: flex;
  align-items: center;
  gap: 8px;

  .custom-label {
    font-size: 13px;
    color: var(--text-regular);
  }
}
</style>
