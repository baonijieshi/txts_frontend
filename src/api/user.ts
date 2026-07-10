import request from '@/utils/request';

export function login(data: { username: string; password: string }) {
  return request({
    url: '/user/login',
    method: 'post',
    data,
  });
}

export function getInfo(token: string) {
  return request({
    url: '/user/info',
    method: 'get',
    params: { token },
  });
}

export function getMenus() {
  return request({ url: '/user/menus', method: 'get' });
}

export function logout() {
  return request({
    url: '/user/logout',
    method: 'post',
  });
}

export function getUserList() {
  return request({
    url: '/user/list',
    method: 'get',
  });
}

export function updateAvatar(avatar: string) {
  return request({
    url: '/user/avatar',
    method: 'patch',
    data: { avatar },
  });
}

export function feishuLogin(data: { code: string; redirect_uri: string }) {
  return request({ url: '/user/feishu-login', method: 'post', data });
}

export function feishuCompleteRegister(data: Record<string, unknown>) {
  return request({ url: '/user/feishu-complete-register', method: 'post', data });
}

export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return request({
    url: '/user/change-password',
    method: 'post',
    data,
  });
}

export function saveTheme(data: Record<string, unknown>) {
  return request({ url: '/user/theme', method: 'put', data });
}

export function fetchTheme() {
  return request({ url: '/user/theme', method: 'get' });
}
