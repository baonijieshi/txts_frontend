import {
  login as loginApi,
  getInfo as getInfoApi,
  logout as logoutApi,
  updateAvatar as updateAvatarApi,
  getMenus as getMenusApi,
} from '@/api/user';
import router from '@/router';
import { buildRoutes, addTestPlanDetailRoute, addTestPlanReviewRoute } from '@/router/routeComponents';

const state = {
  token: localStorage.getItem('token') || '',
  id: null as number | null,
  name: '',
  avatar: '',
  roles: [] as string[],
  permissions: [] as string[],
  isDepartmentLeader: false,
  menus: [] as any[],
  routesAdded: false,
};

const mutations = {
  SET_TOKEN: (state: any, token: string) => { state.token = token; },
  SET_ID: (state: any, id: number | null) => { state.id = id; },
  SET_NAME: (state: any, name: string) => { state.name = name; },
  SET_AVATAR: (state: any, avatar: string) => { state.avatar = avatar; },
  SET_ROLES: (state: any, roles: string[]) => { state.roles = roles; },
  SET_PERMISSIONS: (state: any, permissions: string[]) => { state.permissions = permissions; },
  SET_IS_DEPARTMENT_LEADER: (state: any, val: boolean) => { state.isDepartmentLeader = val; },
  SET_MENUS: (state: any, menus: any[]) => { state.menus = menus; },
  SET_ROUTES_ADDED: (state: any, val: boolean) => { state.routesAdded = val; },
};

const actions = {
  login({ commit }: any, userInfo: { username: string; password: string }) {
    const { username, password } = userInfo;
    return loginApi({ username: username.trim(), password })
      .then((res: any) => {
        const { token } = res.data;
        commit('SET_TOKEN', token);
        localStorage.setItem('token', token);
      });
  },

  getInfo({ commit, state }: any) {
    return getInfoApi(state.token).then((res: any) => {
      const { data } = res;
      commit('SET_ID', data.id);
      commit('SET_NAME', data.first_name || data.username);
      commit('SET_AVATAR', data.avatar);
      commit('SET_ROLES', data.roles || ['dev']);
      commit('SET_PERMISSIONS', data.permissions || []);
      commit('SET_IS_DEPARTMENT_LEADER', data.is_department_leader || false);
      // 从后端同步主题配置
      if (data.theme_config && Object.keys(data.theme_config).length > 0) {
        commit('settings/APPLY_ALL', data.theme_config, { root: true });
      } else {
        // 新用户无主题配置时，重置为默认主题
        commit('settings/RESET_TO_DEFAULTS', null, { root: true });
      }
      return data;
    });
  },

  fetchMenus({ commit, state }: any) {
    return getMenusApi().then((res: any) => {
      const menus = res.data || [];
      commit('SET_MENUS', menus);

      // 只添加一次动态路由
      if (!state.routesAdded) {
        const dynamicRoutes = buildRoutes(menus);
        dynamicRoutes.forEach((route: any) => router.addRoute(route));
        // 添加不在菜单中的隐藏路由
        addTestPlanDetailRoute(router);
        addTestPlanReviewRoute(router);
        commit('SET_ROUTES_ADDED', true);
      }
    });
  },

  logout({ commit }: any) {
    return logoutApi().then(() => {
      commit('SET_TOKEN', '');
      commit('SET_ROLES', []);
      commit('SET_MENUS', []);
      commit('SET_ROUTES_ADDED', false);
      localStorage.removeItem('token');
      localStorage.removeItem('tx_pinned_pages');
      // 清除主题配置，避免影响下一个用户的登录页显示
      commit('settings/RESET_TO_DEFAULTS', null, { root: true });
    });
  },

  resetToken({ commit }: any) {
    return new Promise<void>((resolve) => {
      commit('SET_TOKEN', '');
      commit('SET_ROLES', []);
      commit('SET_MENUS', []);
      commit('SET_ROUTES_ADDED', false);
      localStorage.removeItem('token');
      localStorage.removeItem('tx_pinned_pages');
      // 清除主题配置，避免影响下一个用户的登录页显示
      commit('settings/RESET_TO_DEFAULTS', null, { root: true });
      resolve();
    });
  },

  updateAvatar({ commit }: any, avatar: string) {
    return updateAvatarApi(avatar).then(() => {
      commit('SET_AVATAR', avatar);
    });
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
