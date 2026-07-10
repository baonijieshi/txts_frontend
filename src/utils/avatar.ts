/** 头像渐变配色方案 */
export const avatarGradients = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
];

/** 根据用户名取色，返回内联样式对象 */
export function avatarGradientStyle(name: string): { background: string; color: string } {
  if (!name) return { background: avatarGradients[0], color: '#fff' };
  const idx = name.charCodeAt(0) % avatarGradients.length;
  return { background: avatarGradients[idx], color: '#fff' };
}
