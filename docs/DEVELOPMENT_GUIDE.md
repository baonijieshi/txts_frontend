# 开发指南

## 快速开始

### 环境要求
- Node.js >= 14.x
- pnpm >= 6.x

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
pnpm run serve
```

访问 http://localhost:8080

## 开发规范

### Vue 3 Composition API

推荐使用 `<script setup>` 语法：

```vue
<template>
  <div>{{ message }}</div>
</template>

<script setup>
import { ref } from 'vue';

const message = ref('Hello World');
</script>
```

### 组件开发

#### 1. Props 定义
```vue
<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
});
</script>
```

#### 2. Emits 定义
```vue
<script setup>
const emit = defineEmits(['update', 'delete']);

const handleUpdate = () => {
  emit('update', data);
};
</script>
```

#### 3. 响应式数据
```javascript
import { ref, reactive, computed } from 'vue';

// ref - 基本类型
const count = ref(0);

// reactive - 对象类型
const state = reactive({
  name: '',
  age: 0,
});

// computed - 计算属性
const fullName = computed(() => {
  return `${state.firstName} ${state.lastName}`;
});
```

### API 调用规范

#### 1. 定义接口
```javascript
// src/api/project.js
import request from '@/utils/request';

export function getProjectList(params) {
  return request({
    url: '/project/list',
    method: 'get',
    params,
  });
}
```

#### 2. 组件中使用
```vue
<script setup>
import { ref, onMounted } from 'vue';
import { getProjectList } from '@/api/project';
import { ElMessage } from 'element-plus';

const loading = ref(false);
const list = ref([]);

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getProjectList({ page: 1 });
    list.value = res.data;
  } catch (error) {
    ElMessage.error('获取数据失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>
```

### 状态管理

#### 1. 定义 Store 模块
```javascript
// src/store/modules/project.js
const state = {
  list: [],
  current: null,
};

const mutations = {
  SET_LIST(state, list) {
    state.list = list;
  },
};

const actions = {
  async fetchList({ commit }) {
    const res = await getProjectList();
    commit('SET_LIST', res.data);
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
```

#### 2. 组件中使用
```vue
<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

// 读取状态
const projectList = computed(() => store.state.project.list);

// 调用 action
const fetchData = () => {
  store.dispatch('project/fetchList');
};
</script>
```

### 路由开发

#### 1. 添加路由
```javascript
// src/router/index.js
{
  path: '/example',
  component: Layout,
  children: [
    {
      path: '',
      name: 'Example',
      component: () => import('@/views/example/version.vue'),
      meta: { title: '示例', icon: 'Document' },
    },
  ],
}
```

#### 2. 路由跳转
```vue
<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

// 编程式导航
const goToProject = () => {
  router.push('/project');
};

// 带参数
const goToDetail = (id) => {
  router.push({
    path: '/project/detail',
    query: { id },
  });
};
</script>
```

### 表单开发

#### 1. 表单验证
```vue
<template>
  <el-form ref="formRef" :model="form" :rules="rules">
    <el-form-item label="项目名称" prop="name">
      <el-input v-model="form.name" />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="submitForm">提交</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { ref, reactive } from 'vue';

const formRef = ref(null);
const form = reactive({
  name: '',
});

const rules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
  ],
};

const submitForm = async () => {
  await formRef.value.validate();
  // 提交逻辑
};
</script>
```

### 表格开发

```vue
<template>
  <el-table :data="tableData" v-loading="loading">
    <el-table-column prop="name" label="名称" />
    <el-table-column prop="status" label="状态">
      <template #default="{ row }">
        <el-tag :type="getStatusType(row.status)">
          {{ row.status }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="200">
      <template #default="{ row }">
        <el-button size="small" @click="handleEdit(row)">编辑</el-button>
        <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </el-table-column>
  </el-table>
  
  <el-pagination
    v-model:current-page="page"
    v-model:page-size="pageSize"
    :total="total"
    @current-change="fetchData"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue';

const loading = ref(false);
const tableData = ref([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const fetchData = async () => {
  loading.value = true;
  try {
    // 获取数据
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>
```

## 常用功能

### 1. 消息提示
```javascript
import { ElMessage, ElMessageBox } from 'element-plus';

// 成功提示
ElMessage.success('操作成功');

// 错误提示
ElMessage.error('操作失败');

// 确认对话框
ElMessageBox.confirm('确定要删除吗？', '提示', {
  confirmButtonText: '确定',
  cancelButtonText: '取消',
  type: 'warning',
}).then(() => {
  // 确认操作
}).catch(() => {
  // 取消操作
});
```

### 2. Loading 加载
```vue
<template>
  <div v-loading="loading">
    <!-- 内容 -->
  </div>
</template>

<script setup>
import { ref } from 'vue';

const loading = ref(false);

const fetchData = async () => {
  loading.value = true;
  try {
    // 请求数据
  } finally {
    loading.value = false;
  }
};
</script>
```

### 3. 日期格式化
```javascript
import { parseTime } from '@/utils';

const formattedDate = parseTime(new Date(), '{y}-{m}-{d} {h}:{i}:{s}');
```

### 4. 防抖节流
```javascript
import { debounce } from '@/utils';

const handleSearch = debounce((keyword) => {
  // 搜索逻辑
}, 300);
```

## 调试技巧

### 1. Vue DevTools
安装 Vue DevTools 浏览器插件，方便调试组件状态。

### 2. Console 调试
```javascript
console.log('数据:', data);
console.table(list); // 表格形式展示数组
console.time('性能测试');
// 代码
console.timeEnd('性能测试');
```

### 3. 网络请求调试
在浏览器开发者工具的 Network 面板查看请求详情。

## 性能优化

### 1. 路由懒加载
```javascript
component: () => import('@/views/example/version.vue')
```

### 2. 组件懒加载
```vue
<script setup>
import { defineAsyncComponent } from 'vue';

const HeavyComponent = defineAsyncComponent(() =>
  import('./HeavyComponent.vue')
);
</script>
```

### 3. 列表优化
- 使用虚拟滚动处理大数据量
- 合理使用分页
- 避免不必要的重新渲染

### 4. 图片优化
- 使用合适的图片格式
- 图片懒加载
- 压缩图片大小

## 常见问题

### 1. 跨域问题
在 `vue.config.js` 配置代理：
```javascript
devServer: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

### 2. 样式不生效
- 检查是否使用了 `scoped`
- 检查样式优先级
- 使用 `/deep/` 或 `::v-deep` 穿透

### 3. 组件通信
- 父子组件：props/emit
- 跨层级：provide/inject
- 全局状态：Vuex

## 部署上线

### 1. 构建生产版本
```bash
pnpm run build
```

### 2. 预览构建结果
```bash
pnpm run preview
```

### 3. 部署到服务器
将 `dist` 目录上传到服务器，配置 Nginx：

```nginx
server {
  listen 80;
  server_name your-domain.com;
  
  location / {
    root /path/to/dist;
    try_files $uri $uri/ /index.html;
  }
  
  location /api {
    proxy_pass http://backend-server;
  }
}
```

## 参考资源

- [Vue 3 文档](https://v3.vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [Vue Router 文档](https://router.vuejs.org/)
- [Vuex 文档](https://vuex.vuejs.org/)
