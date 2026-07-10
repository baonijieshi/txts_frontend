<template>
  <div v-if="!item.hidden">
    <!-- 有子菜单：标题区域可点击导航到父级页面，右侧箭头展开子菜单 -->
    <el-sub-menu v-if="item.children && item.children.length > 0" :index="resolvePath(item.path)">
      <template #title>
        <span class="sub-menu-title-link" @click.stop="navigateTo(resolvePath(item.path))">
          <el-icon v-if="item.meta && item.meta.icon">
            <component :is="item.meta.icon" />
          </el-icon>
          <span>{{ item.meta.title }}</span>
        </span>
      </template>
      <sidebar-item
        v-for="child in item.children"
        :key="child.path"
        :item="child"
        :base-path="resolvePath(item.path)"
      />
    </el-sub-menu>

    <!-- 无子菜单 -->
    <el-menu-item v-else :index="resolvePath(item.path)">
      <el-icon v-if="item.meta && item.meta.icon">
        <component :is="item.meta.icon" />
      </el-icon>
      <template #title>
        <span>{{ item.meta.title }}</span>
      </template>
    </el-menu-item>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { useRouter } from 'vue-router';
import path from 'path-browserify';

const router = useRouter();

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  basePath: {
    type: String,
    default: '',
  },
});

const resolvePath = (routePath) => {
  if (routePath.startsWith('/')) {
    return routePath;
  }
  return path.resolve(props.basePath, routePath);
};

const navigateTo = (routePath: string) => {
  router.push(routePath);
};
</script>

<style scoped>
.sub-menu-title-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
</style>
