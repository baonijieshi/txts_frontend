import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getApiList,
  createApi as apiCreate,
  updateApi as apiUpdate,
  deleteApi as apiDelete,
} from '@/api/apiManage';

export default function useApiManage() {
  const apiList = ref([]);
  const total = ref(0);
  const methodCounts = ref({ GET: 0, POST: 0, PUT: 0, PATCH: 0, DELETE: 0 });
  const loading = ref(false);
  const searchKeyword = ref('');
  const filterMethod = ref('');
  const serviceId = ref(null);
  const page = ref(1);
  const pageSize = ref(20);

  async function fetchList() {
    loading.value = true;
    try {
      const params: Record<string, any> = { page: page.value, pageSize: pageSize.value };
      if (searchKeyword.value) params.search = searchKeyword.value;
      if (filterMethod.value) params.method = filterMethod.value;
      if (serviceId.value !== null) params.service_id = serviceId.value;

      const res: any = await getApiList(params);
      if (res.code === 200) {
        apiList.value = res.data.list || res.data.results || res.data || [];
        total.value = res.data.total ?? res.data.count ?? apiList.value.length;
        if (res.data.method_counts) {
          methodCounts.value = res.data.method_counts;
        }
      } else {
        ElMessage.error(res.message || '获取接口列表失败');
      }
    } catch (e) {
      ElMessage.error(e?.message || '获取接口列表失败');
    } finally {
      loading.value = false;
    }
  }

  async function createApi(data) {
    try {
      const res: any = await apiCreate(data);
      if (res.code === 200) {
        ElMessage.success('接口已保存');
        await fetchList();
      } else {
        ElMessage.error(res.message || '保存失败');
      }
    } catch (e) {
      ElMessage.error(e?.message || '保存失败');
    }
  }

  async function updateApi(id, data) {
    try {
      const res: any = await apiUpdate(id, data);
      if (res.code === 200) {
        ElMessage.success('接口已更新');
        await fetchList();
      } else {
        ElMessage.error(res.message || '更新失败');
      }
    } catch (e) {
      ElMessage.error(e?.message || '更新失败');
    }
  }

  async function deleteApi(id) {
    try {
      const res: any = await apiDelete(id);
      if (res.code === 200) {
        ElMessage.success('接口已删除');
        await fetchList();
      } else {
        ElMessage.error(res.message || '删除失败');
      }
    } catch (e) {
      ElMessage.error(e?.message || '删除失败');
    }
  }

  return {
    apiList,
    total,
    methodCounts,
    loading,
    searchKeyword,
    filterMethod,
    serviceId,
    page,
    pageSize,
    fetchList,
    createApi,
    updateApi,
    deleteApi,
  };
}
