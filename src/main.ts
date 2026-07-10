import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import App from './App.vue';
import router from './router';
import store from './store';

import '@/styles/index.scss';
import '@/styles/theme.css';
import '@/permission';

const app = createApp(App);

// 注册所有图标
Object.keys(ElementPlusIconsVue).forEach((key) => {
  app.component(key, (ElementPlusIconsVue as any)[key]);
});

app.use(store)
  .use(router)
  .use(ElementPlus, { locale: zhCn })
  .mount('#app');
