import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';

const getRouter = () => import('@/router').then((m) => m.default);

let kickedDialogShowing = false;

function handleKicked(message: string) {
  localStorage.removeItem('token');
  if (kickedDialogShowing) return;
  kickedDialogShowing = true;
  ElMessageBox.alert(
    message || '账号已在其他地方登录，请重新登录',
    '下线通知',
    {
      confirmButtonText: '重新登录',
      type: 'warning',
      callback: () => {
        kickedDialogShowing = false;
        getRouter().then((r) => {
          r.push(`/login?redirect=${r.currentRoute.value.fullPath}`);
        });
      },
    },
  );
}

const service = axios.create({
  baseURL: (import.meta as any).env?.VITE_BASE_API || '/api',
  timeout: 30000,
});

service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

service.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code !== 200) {
      if (res.code === 401 || res.code === 403) {
        handleKicked(res.message);
        return Promise.reject(new Error(res.message || '请重新登录'));
      }
      // 409 冲突由业务层自行处理，不弹全局错误
      if (res.code === 409) {
        const err = new Error(res.message) as any;
        err.response = { data: res };
        return Promise.reject(err);
      }
      ElMessage.error(res.message || '请求失败');
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    return res;
  },
  (error) => {
    const { status, data } = error.response || {};
    if (status === 401 || status === 403) {
      handleKicked(data?.message);
      return Promise.reject(error);
    }
    // 业务层已经弹过 ElMessage 的错误（如 code !== 200），不重复弹
    if (!error.response) {
      ElMessage.error(error.message || '网络错误');
    }
    return Promise.reject(error);
  },
);

export default service;
