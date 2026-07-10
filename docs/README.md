# 项目文档

欢迎来到项目管理系统文档中心！

## 📚 文档导航

### 快速开始
- [项目结构说明](./PROJECT_STRUCTURE.md) - 了解项目目录结构和组织方式
- [开发指南](./DEVELOPMENT_GUIDE.md) - 开发规范和最佳实践

### 核心概念

#### 1. 布局系统
项目采用经典的后台管理系统布局：
- 左侧固定侧边栏导航
- 顶部面包屑和用户信息
- 中间主内容区域

#### 2. 路由管理
- 基于 Vue Router 4
- 支持路由懒加载
- 嵌套路由结构
- 路由权限控制

#### 3. 状态管理
- 使用 Vuex 4 模块化管理
- 按功能划分 modules
- 统一的 getters 访问

#### 4. API 管理
- 统一的请求封装
- 按模块划分接口文件
- 请求/响应拦截器
- 错误统一处理

## 🎯 功能模块

### 1. 首页（Dashboard）
- 数据统计卡片
- 待办任务列表
- 最新 Bug 列表
- 快速入口

### 2. 项目管理（Project）
- 项目列表展示
- 项目创建/编辑
- 项目进度跟踪
- 项目状态管理

### 3. 产品管理（Product）
- 产品列表
- 产品线管理
- 产品负责人
- 产品信息维护

### 4. 需求管理（Story）
- 需求列表
- 需求优先级
- 需求状态流转
- 需求关联

### 5. 任务管理（Task）
- 任务分配
- 任务状态
- 截止日期
- 任务完成度

### 6. Bug 管理（Bug）
- Bug 提交
- 严重程度分级
- Bug 状态跟踪
- Bug 指派

### 7. 测试用例（TestCase）
- 用例管理
- 测试执行
- 测试结果
- 用例分类

### 8. 文档管理（Doc）
- 文档库
- 文档分类
- 文档版本
- 文档搜索

### 9. 统计报表（Report）
- 项目统计
- Bug 趋势
- 任务完成率
- 数据可视化

## 🛠 技术栈

### 核心框架
- **Vue 3.2** - 渐进式 JavaScript 框架
- **Vue Router 4** - 官方路由管理器
- **Vuex 4** - 状态管理模式
- **Element Plus** - Vue 3 组件库

### 开发工具
- **Vue CLI 5** - 标准工具链
- **Sass** - CSS 预处理器
- **Axios** - HTTP 客户端
- **NProgress** - 进度条

### 代码规范
- **ESLint** - 代码检查
- **Airbnb Style** - 代码风格

## 📦 项目结构

```
project-management-system/
├── docs/                    # 文档目录
│   ├── README.md
│   ├── PROJECT_STRUCTURE.md
│   └── DEVELOPMENT_GUIDE.md
├── public/                  # 静态资源
├── src/
│   ├── api/                # API 接口
│   ├── assets/             # 资源文件
│   ├── components/         # 公共组件
│   ├── layout/             # 布局组件
│   ├── router/             # 路由配置
│   ├── store/              # 状态管理
│   ├── styles/             # 全局样式
│   ├── utils/              # 工具函数
│   ├── views/              # 页面视图
│   ├── App.vue             # 根组件
│   ├── main.js             # 入口文件
│   ├── permission.js       # 权限控制
│   └── settings.js         # 全局配置
├── .env.development        # 开发环境变量
├── .env.production         # 生产环境变量
├── vue.config.js           # Vue CLI 配置
├── package.json            # 项目依赖
└── README.md               # 项目说明
```

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd project-management-system
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 启动开发服务器
```bash
pnpm run serve
```

### 4. 构建生产版本
```bash
pnpm run build
```

## 📝 开发规范

### 命名规范
- **组件文件**：PascalCase（如 `UserProfile.vue`）
- **JS 文件**：camelCase（如 `userService.js`）
- **样式文件**：kebab-case（如 `user-profile.scss`）

### 代码风格
- 使用 ES6+ 语法
- 使用 Composition API
- 使用 `<script setup>` 语法
- 添加必要的注释

### Git 提交规范
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```

## 🔧 配置说明

### 环境变量
- `.env.development` - 开发环境配置
- `.env.production` - 生产环境配置

### 代理配置
在 `vue.config.js` 中配置开发服务器代理，解决跨域问题。

### 路径别名
- `@` - 指向 `src` 目录
- 使用绝对路径导入，避免相对路径混乱

## 📖 学习资源

### 官方文档
- [Vue 3 官方文档](https://v3.vuejs.org/)
- [Vue Router 文档](https://router.vuejs.org/)
- [Vuex 文档](https://vuex.vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)

### 推荐阅读
- [Vue 3 迁移指南](https://v3-migration.vuejs.org/)
- [Composition API RFC](https://github.com/vuejs/rfcs/blob/master/active-rfcs/0013-composition-api.md)
- [Vue 3 设计理念](https://vue3js.cn/vue-composition/)

## 🤝 贡献指南

### 提交 Issue
- 清晰描述问题
- 提供复现步骤
- 附上相关截图

### 提交 PR
1. Fork 项目
2. 创建特性分支
3. 提交代码
4. 发起 Pull Request

## 📄 许可证

MIT License

## 💬 联系方式

如有问题，请通过以下方式联系：
- 提交 Issue
- 发送邮件
- 项目讨论区

---

**祝你开发愉快！** 🎉
