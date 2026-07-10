<template>
  <div class="sidebar-wrapper">
    <div class="sidebar-logo-container" :style="{ background: themeTitleColor }">
      <div class="sidebar-logo-link">
        <div class="brand-mark">
          <span class="brand-icon">旭</span>
        </div>
        <div class="brand-text">
          <span class="brand-name">旭辉</span>
          <span class="brand-sub">项目管理平台</span>
        </div>
      </div>
    </div>
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <el-menu
        :default-active="activeMenu"
        :background-color="themeColor"
        :text-color="menuTextColor"
        :active-text-color="menuActiveTextColor"
        mode="vertical"
        router
        class="sidebar-menu"
      >
        <sidebar-item
          v-for="r in filteredRoutes"
          :key="r.path"
          :item="r"
          :base-path="r.path"
        />
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import SidebarItem from './SidebarItem.vue';

const route = useRoute();
const store = useStore();

// 后端返回的菜单树，格式：[{ path, title, icon, children? }]
// 转换为 SidebarItem 期望的 { path, meta: { title, icon }, children? } 格式
function toRouteShape(items) {
  return items.map((item) => {
    const node = {
      path: item.path,
      meta: { title: item.title, icon: item.icon },
    };
    if (item.children?.length) {
      node.children = toRouteShape(item.children);
    }
    return node;
  });
}

const filteredRoutes = computed(() => toRouteShape(store.getters.menus || []));

const activeMenu = computed(() => route.path);

const themeColor = computed(() => store.state.settings.sidebar.color);
const themeTitleColor = computed(() => store.state.settings.sidebar.titleColor);
const menuTextColor = computed(() => store.state.settings.sidebar.textColor);
const menuActiveTextColor = computed(() => store.state.settings.sidebar.activeTextColor);
</script>

<style lang="scss" scoped>
.sidebar-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-logo-container {
  position: relative;
  width: 100%;
  height: 52px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;

  .sidebar-logo-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    width: 100%;

    .brand-mark {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      backdrop-filter: blur(4px);

      .brand-icon {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
        line-height: 1;
      }
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.2;

      .brand-name {
        font-size: 15px;
        font-weight: 700;
        color: var(--text-inverse);
        letter-spacing: 1px;
      }

      .brand-sub {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.55);
        font-weight: 400;
        letter-spacing: 0.5px;
      }
    }
  }
}

.el-scrollbar {
  height: calc(100% - 52px);
}

:deep(.scrollbar-wrapper) {
  overflow-x: hidden !important;
}

:deep(.el-scrollbar__view) {
  height: 100%;
}

.sidebar-menu {
  border: none;
  height: 100%;
  width: 100% !important;

  // 菜单项现代化
  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    height: 40px;
    line-height: 40px;
    margin: 2px 8px;
    border-radius: 8px;
    padding: 0 12px !important;
    transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);

    &:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      transform: translateX(2px);
    }
  }

  :deep(.el-menu-item.is-active) {
    background: rgba(255, 255, 255, 0.12) !important;
    font-weight: 600;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 2px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 18px;
      border-radius: 2px;
      background: var(--el-color-primary);
    }
  }

  // 子菜单标题
  :deep(.el-sub-menu) {
    .el-sub-menu__title {
      margin: 2px 8px;
      border-radius: 8px;

      .el-sub-menu__icon-arrow {
        right: 12px;
        margin-top: -5px;
      }
    }

    // 子菜单列表
    .el-menu {
      background: transparent !important;

      .el-menu-item {
        padding-left: 40px !important;
        font-size: 13px;
        height: 36px;
        line-height: 36px;
      }
    }
  }

  // 图标间距
  :deep(.el-icon) {
    margin-right: 8px;
    font-size: 17px;
  }
}

// 深色侧边栏 logo 区微调
[data-theme='dark'] .sidebar-logo-container .brand-mark {
  background: rgba(255, 255, 255, 0.12);
}
</style>
