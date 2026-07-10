import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import Layout from '@/layout/index.vue';

// 不需要登录/权限的基础路由
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/views/login/index.vue'),
    meta: { hidden: true },
  },
  {
    path: '/register',
    component: () => import('@/views/register/index.vue'),
    meta: { hidden: true },
  },
  {
    path: '/forgot-password',
    component: () => import('@/views/forgot-password/index.vue'),
    meta: { hidden: true },
  },
  {
    path: '/redirect',
    component: Layout,
    meta: { hidden: true },
    children: [
      {
        path: '/redirect/:path(.*)',
        component: () => import('@/views/redirect/index.vue'),
      },
    ],
  },
  // dashboard 固定存在，不走权限
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '首页', icon: 'HomeFilled', affix: true },
      },
    ],
  },
  // 404 兜底，必须放最后（动态路由加完后也在最后）
  {
    path: '/:pathMatch(.*)*',
    meta: { hidden: true },
    component: { template: '<div style="text-align:center;padding:80px 0"><h1 style="font-size:72px;color:var(--border-color);margin:0">404</h1><p style="color:var(--text-secondary)">页面不存在</p></div>' },
  },
];

const router = createRouter({
  history: createWebHistory('/'),
  scrollBehavior: () => ({ top: 0 }),
  routes: constantRoutes,
});

// 重置路由（退出登录时调用）
export function resetRouter() {
  const newRouter = createRouter({
    history: createWebHistory('/'),
    scrollBehavior: () => ({ top: 0 }),
    routes: constantRoutes,
  });
  (router as any).matcher = (newRouter as any).matcher;
}

export default router;
