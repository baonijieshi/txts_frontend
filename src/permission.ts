import NProgress from 'nprogress';
import router from './router';
import store from './store';
import 'nprogress/nprogress.css';
import type { RouteLocationNormalized } from 'vue-router';

NProgress.configure({ showSpinner: false });

const whiteList = ['/login', '/register', '/forgot-password'];

router.beforeEach(async (to: RouteLocationNormalized, _from: RouteLocationNormalized, next: any) => {
  NProgress.start();

  const hasToken = localStorage.getItem('token');

  if (hasToken) {
    if (to.path === '/login') {
      next({ path: '/' });
      NProgress.done();
      return;
    }

    const hasRoles = store.getters.roles && store.getters.roles.length > 0;

    if (hasRoles) {
      // 已有用户信息，但动态路由可能还没加（比如刷新页面后 store 被清空）
      if (!store.state.user.routesAdded) {
        try {
          await store.dispatch('user/fetchMenus');
          // 动态路由刚加完，必须重新导航让 router 重新匹配
          next({ ...to, replace: true });
        } catch {
          await store.dispatch('user/resetToken');
          next(`/login?redirect=${to.path}`);
          NProgress.done();
        }
      } else {
        next();
      }
    } else {
      try {
        await store.dispatch('user/getInfo');
        await store.dispatch('user/fetchMenus');
        // 动态路由刚加完，必须重新导航
        next({ ...to, replace: true });
      } catch {
        await store.dispatch('user/resetToken');
        next(`/login?redirect=${to.path}`);
        NProgress.done();
      }
    }
  } else if (whiteList.includes(to.path)) {
    next();
  } else {
    next(`/login?redirect=${to.path}`);
    NProgress.done();
  }
});

router.afterEach(() => {
  NProgress.done();
});
