/**
 * 页面动态标题共享状态
 * 详情页在加载数据后设置 route.path → 动态标题 的映射，
 * 便签栏等其他组件读取展示。
 */
import { reactive } from 'vue';

export const pageTitles = reactive<Record<string, string>>({});

/** 设置某个路径的动态标题 */
export function setPageTitle(path: string, title: string) {
  pageTitles[path] = title;
}
