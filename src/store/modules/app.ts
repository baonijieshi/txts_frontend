const state = {
  sidebar: {
    opened: true,
  },
  device: 'desktop',
};

const mutations = {
  TOGGLE_SIDEBAR: (state: any) => {
    state.sidebar.opened = !state.sidebar.opened;
  },
  CLOSE_SIDEBAR: (state: any) => {
    state.sidebar.opened = false;
  },
  TOGGLE_DEVICE: (state: any, device: string) => {
    state.device = device;
  },
};

const actions = {
  toggleSideBar({ commit }: any) {
    commit('TOGGLE_SIDEBAR');
  },
  closeSideBar({ commit }: any) {
    commit('CLOSE_SIDEBAR');
  },
  toggleDevice({ commit }: any, device: string) {
    commit('TOGGLE_DEVICE', device);
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
