import { ref } from 'vue';
import {
  getEnvList, createEnv, updateEnv, deleteEnv,
} from '@/api/apiManage';

const ACTIVE_KEY = 'kn_api_active_env';

// 全局单例
const envList = ref<any[]>([]);
const storedId = localStorage.getItem(ACTIVE_KEY);
const activeEnvId = ref(storedId ? Number(storedId) : null);
const activeBaseUrl = ref('');

function syncActiveUrl() {
  const env = envList.value.find((e) => e.id === activeEnvId.value);
  activeBaseUrl.value = env ? env.url : '';
}

export default function useEnv() {
  async function loadEnvs() {
    const res: any = await getEnvList();
    if (res.code === 200) {
      envList.value = res.data || [];
      // 若无激活环境，默认选第一个
      if (!activeEnvId.value && envList.value.length > 0) {
        setActive(envList.value[0].id);
      } else {
        syncActiveUrl();
      }
    }
  }

  async function addEnv(data) {
    const res: any = await createEnv(data);
    if (res.code === 200) {
      envList.value.push(res.data);
      if (envList.value.length === 1) setActive(res.data.id);
    }
    return res;
  }

  async function editEnv(id, data) {
    const res: any = await updateEnv(id, data);
    if (res.code === 200) {
      const idx = envList.value.findIndex((e) => e.id === id);
      if (idx !== -1) envList.value[idx] = res.data;
      syncActiveUrl();
    }
    return res;
  }

  async function removeEnv(id) {
    const res: any = await deleteEnv(id);
    if (res.code === 200) {
      envList.value = envList.value.filter((e) => e.id !== id);
      if (activeEnvId.value === Number(id)) {
        setActive(envList.value[0]?.id || null);
      }
    }
    return res;
  }

  function setActive(id) {
    activeEnvId.value = id ? Number(id) : null;
    localStorage.setItem(ACTIVE_KEY, id || '');
    syncActiveUrl();
  }

  return {
    envList,
    activeEnvId,
    activeBaseUrl,
    loadEnvs,
    addEnv,
    editEnv,
    removeEnv,
    setActive,
  };
}
