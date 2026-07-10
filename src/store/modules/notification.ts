import {
  getUnreadCount, markAsRead, markAllAsRead, clearAll as clearAllApi, deleteNotification,
} from '@/api/notification';

const state = {
  unreadCount: 0,
  pollTimer: null as ReturnType<typeof setInterval> | null,
};

const mutations = {
  SET_UNREAD_COUNT: (state: any, count: number) => { state.unreadCount = count; },
  SET_POLL_TIMER: (state: any, timer: ReturnType<typeof setInterval> | null) => { state.pollTimer = timer; },
};

let visibilityHandler: (() => void) | null = null;

const actions = {
  fetchUnreadCount({ commit }: any) {
    // 未登录时跳过，避免在登录页持续发送无效请求
    if (!localStorage.getItem('token')) {
      return;
    }
    return getUnreadCount()
      .then((res: any) => {
        commit('SET_UNREAD_COUNT', res.data.count);
      })
      .catch(() => {
        // 静默忽略，下次轮询重试
      });
  },

  startPolling({ dispatch, commit, state }: any) {
    // 防止重复启动
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
    }

    // 立即请求一次
    dispatch('fetchUnreadCount');

    // 30 秒定时轮询
    const timer = setInterval(() => {
      dispatch('fetchUnreadCount');
    }, 30000);
    commit('SET_POLL_TIMER', timer);

    // visibilitychange 监听：页面隐藏时暂停，可见时立即请求并恢复
    visibilityHandler = () => {
      if (document.hidden) {
        // 页面隐藏，暂停轮询
        if (state.pollTimer) {
          clearInterval(state.pollTimer);
          commit('SET_POLL_TIMER', null);
        }
      } else {
        // 页面可见，立即请求并恢复轮询
        dispatch('fetchUnreadCount');
        const newTimer = setInterval(() => {
          dispatch('fetchUnreadCount');
        }, 30000);
        commit('SET_POLL_TIMER', newTimer);
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  },

  stopPolling({ commit, state }: any) {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      commit('SET_POLL_TIMER', null);
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
  },

  markRead({ dispatch }: any, id: number) {
    return markAsRead(id).then(() => {
      dispatch('fetchUnreadCount');
    });
  },

  markAllRead({ commit }: any) {
    return markAllAsRead().then(() => {
      commit('SET_UNREAD_COUNT', 0);
    });
  },

  clearAll({ commit }: any) {
    return clearAllApi().then(() => {
      commit('SET_UNREAD_COUNT', 0);
    });
  },

  deleteOne({ dispatch }: any, id: number) {
    return deleteNotification(id).then(() => {
      dispatch('fetchUnreadCount');
    });
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
