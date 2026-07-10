const getters = {
  sidebar: (state: any) => state.app.sidebar,
  device: (state: any) => state.app.device,
  token: (state: any) => state.user.token,
  avatar: (state: any) => state.user.avatar,
  name: (state: any) => state.user.name,
  userId: (state: any) => state.user.id,
  roles: (state: any) => state.user.roles,
  permissions: (state: any) => state.user.permissions,
  isDepartmentLeader: (state: any) => state.user.isDepartmentLeader,
  menus: (state: any) => state.user.menus,
  unreadCount: (state: any) => state.notification.unreadCount,
};

export default getters;
