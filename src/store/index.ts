import { createStore } from 'vuex';
import getters from './getters';
import app from './modules/app';
import user from './modules/user';
import settings from './modules/settings';
import notification from './modules/notification';

const store = createStore({
  modules: {
    app,
    user,
    settings,
    notification,
  },
  getters,
});

export default store;
