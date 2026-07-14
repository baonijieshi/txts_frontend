import { marked } from 'marked';

let initialized = false;
function ensureInit() {
  if (initialized) return;
  marked.setOptions({
    breaks: true,   // 换行符 → <br>
    gfm: true,      // 启用 GFM 表格/任务列表
  });
  initialized = true;
}

/**
 * 将 Markdown 字符串转换为 HTML
 * 用于 AI 生成内容在赋值给 wangEditor 前进行转换
 */
export function markdownToHtml(md: string): string {
  if (!md) return '';
  ensureInit();
  return marked.parse(md) as string;
}
