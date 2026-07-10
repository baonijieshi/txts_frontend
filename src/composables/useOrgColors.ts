/**
 * 组织架构页面装饰色工具
 *
 * 根据名称哈希值分配徽章/头像背景色，用于区分不同部门/成员。
 * 颜色均为 CSS 变量，兼容深色模式。
 */

const BADGE_COLORS = [
  'var(--el-color-primary)',
  'var(--el-color-success)',
  'var(--el-color-warning)',
  'var(--el-color-danger)',
  'var(--el-color-info)',
  'var(--color-badge-purple)',
  'var(--color-badge-teal)',
  'var(--color-badge-indigo)',
] as const

/** 简易字符串哈希 */
function hashStr(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

/** 根据名称返回一个稳定的 CSS 变量装饰色 */
export function badgeColor(name: string): string {
  return BADGE_COLORS[hashStr(name) % BADGE_COLORS.length]
}

/** @alias badgeColor — 用于头像背景 */
export const avatarColor = badgeColor
