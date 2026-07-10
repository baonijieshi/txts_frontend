# 深色模式适配指南

## 📋 快速检查清单

### ✅ 已完成的全局适配（无需手动修改）

以下样式已通过 `theme.css` 自动覆盖，**所有页面自动生效**：

- [x] Element Plus 所有基础组件（Table、Form、Dialog、Drawer、Select、Input等）
- [x] 通用卡片背景（`.el-card`, `.card`, `[class*="__card"]`）
- [x] 通用头部背景（`.header`, `[class*="__header"]`, `.toolbar`）
- [x] 标题文字颜色（h1-h6）
- [x] 段落和标签文字颜色（p, span, label）
- [x] 边框和分隔线颜色
- [x] 阴影效果
- [x] 输入框和选择器
- [x] 下拉选项
- [x] 对话框和抽屉
- [x] 消息提示和通知
- [x] 加载状态
- [x] 滚动条样式

### ⚠️ 需要手动检查的场景

如果以下情况出现颜色异常，需要针对性修复：

#### 1. **内联样式硬编码**
```vue
<!-- ❌ 错误 -->
<div style="background: #fff; color: #303133">

<!-- ✅ 正确 -->
<div style="background: var(--bg-card); color: var(--text-primary)">
```

#### 2. **JavaScript 动态颜色**
```js
// ❌ 错误 - 返回硬编码颜色
const getColor = () => '#409eff'

// ✅ 正确 - 使用 CSS 类或 CSS 变量
const getColor = () => 'var(--color-primary)'
// 或者在模板中使用 :class 绑定
```

#### 3. **特殊业务组件的自定义样式**
某些复杂组件可能有独特的视觉设计，需要在组件 scoped 样式中单独处理。

---

## 🔧 修复步骤

### 方法一：使用 CSS 变量（推荐）

将所有硬编码颜色替换为对应的 CSS 变量：

| 原颜色 | 替换为 | 说明 |
|--------|--------|------|
| `#fff` / `#ffffff` | `var(--bg-card)` | 白色背景 → 卡片背景 |
| `#f5f7fa` / `#fafafa` | `var(--bg-elevated)` | 浅灰背景 → 浮层背景 |
| `#f0f2f5` | `var(--bg-page)` | 页面背景 |
| `#303133` | `var(--text-primary)` | 主要文字 |
| `#606266` | `var(--text-regular)` | 常规文字 |
| `#909399` | `var(--text-secondary)` | 次要文字 |
| `#c0c4cc` | `var(--text-placeholder)` | 占位符文字 |
| `#dcdfe6` | `var(--border-color)` | 边框颜色 |
| `#e4e7ed` | `var(--border-light)` | 浅色边框 |

### 方法二：添加组件级深色覆盖

如果某个组件有特殊需求，可以在其 `<style scoped>` 中添加：

```scss
<style scoped lang="scss">
/* 浅色模式默认样式 */
.my-component {
  background: #fff;
  color: #303133;
}

/* 深色模式覆盖 */
[data-theme='dark'] .my-component {
  background: var(--bg-card);
  color: var(--text-primary);
}
</style>
```

---

## 🎨 CSS 变量完整列表

### 背景色
```css
--bg-page: #f5f7fa;           /* 页面背景（浅色）/ #0f0f0f（深色）*/
--bg-card: #ffffff;           /* 卡片背景（浅色）/ #1a1a1a（深色）*/
--bg-elevated: #f5f7fa;       /* 浮层背景（浅色）/ #242424（深色）*/
--bg-hover: #f5f7fa;          /* 悬停背景（浅色）/ #2a2a2a（深色）*/
--bg-active: #ecf5ff;         /* 选中背景（浅色）/ #1a3a5c（深色）*/
```

### 文字色
```css
--text-primary: #303133;      /* 主要文字（浅色）/ #e8e8e8（深色）*/
--text-regular: #606266;      /* 常规文字（浅色）/ #b0b0b0（深色）*/
--text-secondary: #909399;    /* 次要文字（浅色）/ #808080（深色）*/
--text-placeholder: #c0c4cc;  /* 占位符（浅色）/ #555555（深色）*/
--text-inverse: #ffffff;      /* 反色文字（浅色）/ #0f0f0f（深色）*/
```

### 边框色
```css
--border-color: #dcdfe6;      /* 边框（浅色）/ #333333（深色）*/
--border-light: #e4e7ed;      /* 浅色边框（浅色）/ #2a2a2a（深色）*/
--border-heavy: #dcdfe6;      /* 深色边框（浅色）/ #404040（深色）*/
```

### 阴影
```css
--shadow-card: 0 2px 12px rgba(0, 0, 0, 0.06);   /* 卡片阴影 */
--shadow-dropdown: 0 4px 16px rgba(0, 0, 0, 0.08); /* 下拉阴影 */
```

### 导航栏
```css
--navbar-bg: #ffffff;         /* 导航栏背景（浅色）/ #1a1a1a（深色）*/
--navbar-border: #dcdfe6;     /* 导航栏边框（浅色）/ #2a2a2a（深色）*/
```

### 侧边栏（深色模式自动使用 CSS 变量）
```css
--sidebar-bg: #2b3a4a;        /* 侧边栏背景（浅色固定值）*/
--sidebar-title-bg: #1f2d3d;  /* 侧边栏标题背景（浅色固定值）*/
--sidebar-text: #bfcbd9;      /* 侧边栏文字（浅色固定值）*/
--sidebar-active-text: #409eff; /* 侧边栏激活文字（浅色固定值）*/
--sidebar-hover-bg: #263445;  /* 侧边栏悬停背景（浅色固定值）*/
```

---

## 🚀 批量修复工具（可选）

如果需要批量修复多个文件，可以使用以下正则表达式搜索：

### VS Code 搜索替换

1. **搜索硬编码背景色**：
   ```regex
   (background|background-color):\s*#[0-9a-fA-F]{3,6}
   ```

2. **搜索硬编码文字色**：
   ```regex
   color:\s*#[0-9a-fA-F]{3,6}(?!\s*;)
   ```

3. **搜索硬编码边框色**：
   ```regex
   border(-color)?:\s*#[0-9a-fA-F]{3,6}
   ```

---

## 📊 适配进度追踪

### 核心 Layout 组件
- [x] AppMain.vue - 页面容器背景
- [x] Navbar.vue - 顶部导航栏
- [x] Sidebar/index.vue - 侧边栏
- [x] Breadcrumb.vue - 面包屑
- [x] NotificationPanel.vue - 通知面板
- [x] NotificationBell.vue - 通知铃铛

### 业务页面（示例）
- [x] project/version.vue - 版本管理页
- [ ] okr/index.vue - OKR 主页（待检查）
- [ ] story/index.vue - 需求管理页（待检查）
- [ ] task/index.vue - 任务管理页（待检查）
- [ ] bug/index.vue - Bug 管理页（待检查）

---

## 💡 最佳实践建议

1. **优先使用 CSS 变量**：所有新代码都应使用 CSS 变量而非硬编码颜色
2. **避免内联样式**：尽量在 `<style>` 中定义样式，便于统一管理
3. **测试深色模式**：开发时随时切换主题查看效果
4. **使用语义化命名**：如 `--text-primary` 而非 `--text-black`

---

## 🆘 常见问题

### Q1: 为什么有些组件在深色模式下还是白色？
**A**: 可能是使用了内联样式或 JavaScript 动态设置颜色。检查是否有 `style="..."` 或 `element.style.color = '...'`。

### Q2: 如何调试深色模式问题？
**A**: 
1. 打开浏览器开发者工具
2. 切换到 Elements 标签
3. 查看元素的 Computed 样式
4. 检查是否有硬编码颜色覆盖了 CSS 变量

### Q3: 深色模式下文字看不清怎么办？
**A**: 确保文字颜色使用的是 `--text-primary`（高对比度），而不是 `--text-secondary`（低对比度）。

---

##  联系方式

如有问题，请联系前端团队或查阅项目文档。

最后更新：2026-07-01
