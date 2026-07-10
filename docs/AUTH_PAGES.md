# 认证页面说明

## 页面列表

### 1. 登录页面 (`/login`)
**路径**: `src/views/login/index.vue`

**功能**:
- 用户名和密码登录
- 记住密码选项
- 显示/隐藏密码
- 跳转到注册页面
- 跳转到忘记密码页面
- 登录成功后跳转到首页或原访问页面

**默认账号**:
- 用户名: `admin`
- 密码: `123456`

**特点**:
- 渐变背景设计
- 表单验证
- Loading 状态
- 美观的卡片式布局

---

### 2. 注册页面 (`/register`)
**路径**: `src/views/register/index.vue`

**功能**:
- 用户名注册（3-20个字符）
- 邮箱验证
- 手机号验证（中国大陆格式）
- 密码设置（最少6位）
- 确认密码
- 用户协议和隐私政策同意
- 注册成功后跳转到登录页

**表单验证**:
- 用户名：必填，3-20个字符
- 邮箱：必填，邮箱格式验证
- 手机号：必填，11位手机号格式
- 密码：必填，最少6位
- 确认密码：必填，需与密码一致
- 协议：必须勾选

---

### 3. 忘记密码页面 (`/forgot-password`)
**路径**: `src/views/forgot-password/index.vue`

**功能**:
- 通过邮箱或手机号找回密码
- 发送验证码（60秒倒计时）
- 设置新密码
- 确认新密码
- 重置成功后跳转到登录页

**流程**:
1. 输入邮箱或手机号
2. 点击发送验证码
3. 输入收到的验证码
4. 设置新密码
5. 确认新密码
6. 提交重置

---

## 路由配置

在 `src/router/index.js` 中已配置：

```javascript
{
  path: '/login',
  component: () => import('@/views/login/version.vue'),
  hidden: true,
},
{
  path: '/register',
  component: () => import('@/views/register/version.vue'),
  hidden: true,
},
{
  path: '/forgot-password',
  component: () => import('@/views/forgot-password/version.vue'),
  hidden: true,
}
```

## 权限控制

在 `src/permission.js` 中配置了路由守卫：

```javascript
const whiteList = ['/login', '/register', '/forgot-password'];
```

**规则**:
- 未登录用户只能访问白名单页面
- 已登录用户访问登录页会自动跳转到首页
- 访问需要登录的页面会自动跳转到登录页

## 状态管理

### 登录流程
1. 用户提交登录表单
2. 调用 `store.dispatch('user/login', loginForm)`
3. 存储 token 到 localStorage
4. 跳转到首页或原访问页面

### 退出流程
1. 用户点击退出按钮
2. 弹出确认对话框
3. 调用 `store.dispatch('user/logout')`
4. 清除 token
5. 跳转到登录页

## API 接口

需要对接的后端接口：

### 登录接口
```javascript
POST /user/login
{
  username: string,
  password: string
}
```

### 注册接口
```javascript
POST /user/register
{
  username: string,
  email: string,
  phone: string,
  password: string
}
```

### 发送验证码接口
```javascript
POST /user/send-code
{
  account: string  // 邮箱或手机号
}
```

### 重置密码接口
```javascript
POST /user/reset-password
{
  account: string,
  code: string,
  newPassword: string
}
```

## 样式设计

所有认证页面采用统一的设计风格：

- **背景**: 紫色渐变 (`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`)
- **卡片**: 白色背景，圆角 10px，阴影效果
- **表单**: Element Plus 组件
- **按钮**: 主题色，全宽度
- **链接**: 蓝色，悬停下划线

## 使用示例

### 访问登录页
```
http://localhost:8080/login
```

### 访问注册页
```
http://localhost:8080/register
```

### 访问忘记密码页
```
http://localhost:8080/forgot-password
```

## 开发建议

### 1. 对接后端 API
将页面中的模拟 API 调用替换为真实的后端接口：

```javascript
// 登录
import { login } from '@/api/user';
await login(loginForm);

// 注册
import { register } from '@/api/user';
await register(registerForm);
```

### 2. 完善验证规则
根据实际业务需求调整表单验证规则。

### 3. 添加第三方登录
可以添加微信、QQ、GitHub 等第三方登录方式。

### 4. 增强安全性
- 添加图形验证码
- 添加滑动验证
- 限制登录尝试次数
- 添加设备指纹识别

### 5. 优化用户体验
- 添加登录状态保持
- 记住用户名功能
- 自动填充功能
- 密码强度提示

## 注意事项

1. **Token 管理**: 当前 token 存储在 localStorage，生产环境建议使用更安全的方式
2. **密码安全**: 前端传输密码时应该加密
3. **验证码**: 需要后端配合实现真实的验证码发送功能
4. **错误处理**: 完善各种错误情况的提示信息
5. **响应式**: 页面已支持移动端，但可以进一步优化

## 测试账号

开发环境默认账号：
- 用户名: `admin`
- 密码: `123456`

注意：这只是开发测试用，生产环境需要删除或修改。
