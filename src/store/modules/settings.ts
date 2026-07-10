import { saveTheme, fetchTheme } from '@/api/user';

/* ── 默认主题 ── */
const DEFAULTS = {
  mode: 'light' as 'light' | 'dark',
  primaryColor: '#409eff',
  sidebar: {
    name: 'default',
    color: '#2b3a4a',
    titleColor: '#1f2d3d',
    textColor: '#bfcbd9',
    activeTextColor: '#409eff',
  },
};

/* ── 从 localStorage 恢复 ── */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem('tx_theme');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { ...DEFAULTS, sidebar: { ...DEFAULTS.sidebar } };
}

function saveToStorage(config: Record<string, unknown>) {
  localStorage.setItem('tx_theme', JSON.stringify(config));
}

/* ─ 应用 CSS 变量 ── */
function applyCSS(config: Record<string, any>) {
  const root = document.documentElement;

  // 外观模式
  root.setAttribute('data-theme', config.mode || 'light');

  // 主题色
  root.style.setProperty('--color-primary', config.primaryColor);
  root.style.setProperty('--el-color-primary', config.primaryColor);

  // 侧边栏 - 根据模式选择颜色来源
  const isDark = (config.mode || 'light') === 'dark';
  if (isDark) {
    // 深色模式：清空内联样式，使用 theme.css 中定义的 CSS 变量
    root.style.removeProperty('--sidebar-bg');
    root.style.removeProperty('--sidebar-title-bg');
    root.style.removeProperty('--sidebar-text');
    root.style.removeProperty('--sidebar-active-text');
  } else {
    // 浅色模式：使用配置中的自定义颜色
    const s = config.sidebar || DEFAULTS.sidebar;
    root.style.setProperty('--sidebar-bg', s.color);
    root.style.setProperty('--sidebar-title-bg', s.titleColor);
    root.style.setProperty('--sidebar-text', s.textColor);
    root.style.setProperty('--sidebar-active-text', s.activeTextColor);
  }
}

/* ── 初始状态 ── */
const saved = loadFromStorage();
applyCSS(saved);

const state = {
  mode: saved.mode || DEFAULTS.mode,
  primaryColor: saved.primaryColor || DEFAULTS.primaryColor,
  sidebar: saved.sidebar || { ...DEFAULTS.sidebar },
};

const mutations = {
  SET_MODE(state: any, mode: string) {
    state.mode = mode;
  },
  SET_PRIMARY_COLOR(state: any, color: string) {
    state.primaryColor = color;
  },
  SET_SIDEBAR(state: any, sidebar: Record<string, string>) {
    state.sidebar = sidebar;
  },
  APPLY_ALL(state: any, config: Record<string, any>) {
    if (config.mode) state.mode = config.mode;
    if (config.primaryColor) state.primaryColor = config.primaryColor;
    if (config.sidebar) state.sidebar = { ...state.sidebar, ...config.sidebar };
    const merged = {
      mode: state.mode,
      primaryColor: state.primaryColor,
      sidebar: state.sidebar,
    };
    saveToStorage(merged);
    applyCSS(merged);
  },
  RESET_TO_DEFAULTS(state: any) {
    state.mode = DEFAULTS.mode;
    state.primaryColor = DEFAULTS.primaryColor;
    state.sidebar = { ...DEFAULTS.sidebar };
    localStorage.removeItem('tx_theme');
    applyCSS({ ...DEFAULTS, sidebar: { ...DEFAULTS.sidebar } });
  },
};

const actions = {
  /** 切换外观模式 */
  setMode({ commit, state: s }: any, mode: string) {
    commit('SET_MODE', mode);
    const config = { mode, primaryColor: s.primaryColor, sidebar: s.sidebar };
    saveToStorage(config);
    applyCSS(config);
  },

  /** 设置主题色 */
  setPrimaryColor({ commit, state: s }: any, color: string) {
    commit('SET_PRIMARY_COLOR', color);
    const config = { mode: s.mode, primaryColor: color, sidebar: s.sidebar };
    saveToStorage(config);
    applyCSS(config);
  },

  /** 设置侧边栏主题 */
  setSidebar({ commit, state: s }: any, sidebar: Record<string, string>) {
    commit('SET_SIDEBAR', sidebar);
    const config = { mode: s.mode, primaryColor: s.primaryColor, sidebar };
    saveToStorage(config);
    applyCSS(config);
  },

  /** 从后端拉取主题并覆盖本地 */
  async syncFromBackend({ commit, state: s }: any) {
    try {
      const res = await fetchTheme();
      const remote = res.data || {};
      if (remote && Object.keys(remote).length > 0) {
        commit('APPLY_ALL', remote);
        const config = {
          mode: remote.mode || s.mode,
          primaryColor: remote.primaryColor || s.primaryColor,
          sidebar: remote.sidebar || s.sidebar,
        };
        saveToStorage(config);
        applyCSS(config);
      }
    } catch { /* 后端不可用时使用本地 */ }
  },

  /** 保存主题到后端 */
  async saveToBackend({ state: s }: any) {
    try {
      await saveTheme({
        mode: s.mode,
        primaryColor: s.primaryColor,
        sidebar: s.sidebar,
      });
    } catch { /* 静默忽略 */ }
  },

  /** 重置为默认主题（切换用户/登出时调用） */
  resetToDefaults({ commit }: any) {
    commit('RESET_TO_DEFAULTS');
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
