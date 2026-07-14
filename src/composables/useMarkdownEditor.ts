import { Boot } from '@wangeditor/editor';
import markdownModule from '@wangeditor/plugin-md';

let registered = false;

/**
 * 注册 wangEditor Markdown 插件（源码视图切换 + Markdown 语法支持）
 * 需在编辑器创建前调用，仅注册一次
 */
export function useMarkdownEditor() {
  if (registered) return;
  Boot.registerModule(markdownModule);
  registered = true;
}
