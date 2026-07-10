# 项目结构说明

本项目采用 vue-admin-template 标准结构，便于团队协作和代码维护。

## 目录结构详解

### `/src/api` - API 接口层
存放所有后端接口调用函数，按业务模块划分文件。

```
api/
├── user.js          # 用户相关接口
├── project.js       # 项目管理接口
├── product.js       # 产品管理接口
├── story.js         # 需求管理接口
├── task.js          # 任务管理接口
└── bug.js           # Bug管理接口
```

**规范：**
- 每个文件对应一个业务模块
- 使用统一的 request 工具发起请求
- 函数命名：get/create/update/delete + 模块名

### `/src/layout` - 布局组件
应用的整体布局结构，包含侧边栏、导航栏、主内容区。

```
layout/
├── components/
│   ├── AppMain.vue      # 主内容区
│   ├── Navbar.vue       # 顶部导航栏
│   ├── Breadcrumb.vue   # 面包屑导航
│   ├── Sidebar/         # 侧边栏
│   │   ├── index.vue
│   │   └── SidebarItem.vue
│   └── index.js         # 组件导出
└── index.vue            # 布局主文件
```

**特点：**
- 统一的布局结构
- 可复用的布局组件
- 支持响应式设计

### `/src/views` - 页面视图
所有页面级组件，按功能模块划分目录。

```
views/
├── dashboard/           # 首页
├── project/            # 项目管理
├── product/            # 产品管理
├── story/              # 需求管理
├── task/               # 任务管理
├── bug/                # Bug管理
├── testcase/           # 测试用例
├── doc/                # 文档管理
├── report/             # 统计报表
└── redirect/           # 重定向页面
```

**规范：**
- 每个模块一个文件夹
- 主页面命名为 index.vue
- 子页面按功能命名

### `/src/router` - 路由配置
Vue Router 路由配置文件。

**特点：**
- 路由懒加载
- 路由元信息配置
- 权限控制集成

### `/src/store` - 状态管理
Vuex 状态管理，采用模块化设计。

```
store/
├── modules/
│   ├── app.js          # 应用状态
│   └── user.js         # 用户状态
├── getters.js          # 全局 getters
└── index.js            # store 入口
```

**规范：**
- 按功能模块划分
- 使用 namespaced
- mutations 同步，actions 异步

### `/src/utils` - 工具函数
通用工具函数和辅助方法。

```
utils/
├── request.js          # axios 封装
├── validate.js         # 验证函数
└── index.js            # 通用工具
```

**包含：**
- HTTP 请求封装
- 表单验证
- 时间格式化
- 防抖节流等

### `/src/styles` - 全局样式
全局样式文件和变量定义。

```
styles/
├── index.scss              # 全局样式入口
└── variables.module.scss   # Sass 变量
```

**用途：**
- 全局样式重置
- 主题色变量
- 通用样式类

### `/src/components` - 公共组件
可复用的业务组件。

**规范：**
- 组件名使用 PascalCase
- 添加组件说明文档
- 提供使用示例

## 文件命名规范

### 组件文件
- 使用 PascalCase：`UserProfile.vue`
- 单文件组件：`.vue` 扩展名

### JS 文件
- 使用 camelCase：`userService.js`
- 工具函数：`utils/formatDate.js`

### 样式文件
- 使用 kebab-case：`user-profile.scss`
- 模块化：`.module.scss`

## 代码组织原则

### 1. 单一职责
每个文件、函数只做一件事，保持代码简洁。

### 2. 模块化
按功能模块划分，降低耦合度。

### 3. 可复用
提取公共逻辑，避免重复代码。

### 4. 可维护
清晰的命名，完善的注释。

## 开发流程

### 新增功能模块
1. 在 `/src/views` 创建模块文件夹
2. 在 `/src/api` 创建接口文件
3. 在 `/src/router` 添加路由配置
4. 如需状态管理，在 `/src/store/modules` 添加模块

### 新增公共组件
1. 在 `/src/components` 创建组件文件
2. 编写组件文档
3. 在需要的地方引入使用

### 新增工具函数
1. 在 `/src/utils` 相应文件添加函数
2. 添加函数注释说明
3. 导出供其他模块使用

## 最佳实践

### API 调用
```javascript
// 在组件中使用
import { getProjectList } from '@/api/project';

const fetchData = async () => {
  try {
    const res = await getProjectList({ page: 1 });
    // 处理数据
  } catch (error) {
    // 错误处理
  }
};
```

### 状态管理
```javascript
// 在组件中使用
import { useStore } from 'vuex';

const store = useStore();
const userName = computed(() => store.getters.name);
```

### 路由跳转
```javascript
import { useRouter } from 'vue-router';

const router = useRouter();
router.push('/project');
```

## 注意事项

1. **不要直接修改 state**：使用 mutations
2. **异步操作放在 actions**：不要在 mutations 中执行
3. **组件通信**：优先使用 props/emit，复杂场景用 Vuex
4. **样式作用域**：使用 scoped 避免样式污染
5. **路径别名**：使用 `@/` 代替相对路径

## 扩展阅读

- [Vue 3 官方文档](https://v3.vuejs.org/)
- [Vue Router 文档](https://router.vuejs.org/)
- [Vuex 文档](https://vuex.vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
