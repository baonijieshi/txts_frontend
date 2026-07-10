/**
 * perm_id → component 映射表
 * 用 perm_id 而非 path 作为 key，path 可在后台随意修改而不影响组件绑定
 */
import type { Router, RouteRecordRaw } from 'vue-router';
import Layout from '@/layout/index.vue';

const views: Record<string, () => Promise<any>> = {
  dashboard: () => import('@/views/dashboard/index.vue'),
  project: () => import('@/views/project/project.vue'),
  'project-list': () => import('@/views/project/project.vue'),
  'project-versions': () => import('@/views/project/index.vue'),
  product: () => import('@/views/product/index.vue'),
  story: () => import('@/views/story/index.vue'),
  task: () => import('@/views/task/index.vue'),
  'test-testcase': () => import('@/views/testcase/index.vue'),
  'test-testplan': () => import('@/views/testcase/plan.vue'),
  'test-bug': () => import('@/views/bug/index.vue'),
  'test-autotest': () => import('@/views/autotest/index.vue'),
  'test-autotest-report': () => import('@/views/autotest/report.vue'),
  'dev-api-manage': () => import('@/views/dev/apiManage/index.vue'),
  'delivery-ticket': () => import('@/views/ticket/index.vue'),
  'mock-center': () => import('@/views/mock/index.vue'),
  'settings-theme': () => import('@/views/settings/theme.vue'),
  'settings-organization': () => import('@/views/settings/organization.vue'),
  // 兼容旧路由映射
  'settings-members': () => import('@/views/settings/organization.vue'),
  'settings-departments': () => import('@/views/settings/organization.vue'),
  'settings-roles': () => import('@/views/settings/roles.vue'),

  'settings-modules': () => import('@/views/settings/modules.vue'),
  'settings-menus': () => import('@/views/settings/menus.vue'),
  okr: () => import('@/views/okr/index.vue'),
};

export { Layout };

interface MenuItem {
  perm_id: string;
  path: string;
  title: string;
  icon?: string;
  children?: MenuItem[];
}

/**
 * 根据后端菜单树生成 vue-router 路由配置
 * 后端菜单结构: [{ perm_id, path, title, icon, children? }]
 */
export function buildRoutes(menuTree: MenuItem[]): RouteRecordRaw[] {
  return menuTree.reduce<RouteRecordRaw[]>((routes, item) => {
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      const children = buildRoutes(item.children!);
      if (children.length > 0) {
        const parentRoute: RouteRecordRaw = {
          path: item.path,
          component: Layout,
          meta: { title: item.title, icon: item.icon },
          children,
        };
        // 如果父级菜单自身有对应的页面组件，将其作为默认子路由
        if (views[item.perm_id]) {
          parentRoute.children = [
            { path: '', component: views[item.perm_id], meta: { title: item.title, icon: item.icon } },
            ...children,
          ];
          delete parentRoute.redirect;
        } else {
          parentRoute.redirect = children[0].path;
        }
        routes.push(parentRoute);
      }
    } else {
      const component = views[item.perm_id];
      if (component) {
        const segments = item.path.replace(/^\//, '').split('/');
        if (segments.length === 1) {
          routes.push({
            path: item.path,
            component: Layout,
            meta: { title: item.title, icon: item.icon },
            children: [{ path: '', component, meta: { title: item.title, icon: item.icon } }],
          });
        } else {
          routes.push({
            path: item.path,
            component,
            meta: { title: item.title, icon: item.icon },
          });
        }
      }
    }

    return routes;
  }, []);
}

/**
 * 添加测试计划详情页路由（不在侧边栏菜单中显示）
 */
export function addTestPlanDetailRoute(router: Router) {
  router.addRoute({
    path: '/test/testplan/:id',
    component: Layout,
    meta: { title: '测试计划详情', hidden: true },
    children: [{
      path: '',
      component: () => import('@/views/testcase/planDetail.vue'),
      meta: { title: '测试计划详情' },
    }],
  });
}

/**
 * 添加测试用例评审视图路由（全屏，无侧边栏，不在菜单中显示）
 */
export function addTestPlanReviewRoute(router: Router) {
  router.addRoute({
    path: '/test/review/:id',
    component: () => import('@/views/testcase/review.vue'),
    meta: { title: '用例评审', hidden: true },
  });
}
