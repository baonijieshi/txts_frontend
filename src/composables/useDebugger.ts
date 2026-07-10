import { ref, reactive } from 'vue';
import { proxyRequest } from '@/api/apiManage';

export default function useDebugger() {
  const method = ref('GET');
  const url = ref('');
  const baseUrl = ref('');
  const queryParams = ref([{ key: '', value: '' }]);
  const headerParams = ref([{ key: '', value: '' }]);
  const bodyType = ref('json');
  const bodyJson = ref('');
  const bodyFormData = ref([{ key: '', value: '' }]);
  const loading = ref(false);
  const response = reactive({
    status_code: null,
    elapsed_ms: null,
    body: null,
  });
  const error = ref('');

  function addParam(type) {
    const item = { key: '', value: '' };
    if (type === 'query') queryParams.value.push(item);
    else if (type === 'header') headerParams.value.push(item);
    else if (type === 'body') bodyFormData.value.push(item);
  }

  function removeParam(type, index) {
    if (type === 'query') queryParams.value.splice(index, 1);
    else if (type === 'header') headerParams.value.splice(index, 1);
    else if (type === 'body') bodyFormData.value.splice(index, 1);
  }

  async function sendRequest() {
    error.value = '';
    response.status_code = null;
    response.elapsed_ms = null;
    response.body = null;

    const fullUrl = baseUrl.value ? baseUrl.value.replace(/\/$/, '') + url.value : url.value;

    // 构建 query params（过滤空 key）
    const params = {};
    queryParams.value.forEach(({ key, value }) => {
      if (key) params[key] = value;
    });

    // 构建 headers（过滤空 key）
    const headers = {};
    headerParams.value.forEach(({ key, value }) => {
      if (key) headers[key] = value;
    });

    // 构建 body
    let body = null;
    if (bodyType.value !== 'none' && ['POST', 'PUT', 'PATCH'].includes(method.value.toUpperCase())) {
      if (['form-data', 'x-www-form-urlencoded'].includes(bodyType.value)) {
        const formData = {};
        bodyFormData.value.forEach(({ key, value }) => {
          if (key) formData[key] = value;
        });
        body = Object.keys(formData).length ? formData : null;
      } else {
        // json / xml / text / binary：直接传文本
        body = bodyJson.value || null;
      }
    }

    const payload = {
      url: fullUrl,
      method: method.value.toUpperCase(),
      headers,
      params,
      body,
    };

    loading.value = true;
    try {
      const res: any = await proxyRequest(payload);
      if (res.code === 200) {
        response.status_code = res.data.status_code;
        response.elapsed_ms = res.data.elapsed_ms;
        response.body = res.data.body;
      } else {
        error.value = res.message || '请求失败';
      }
    } catch (e) {
      error.value = e?.message || '请求失败';
    } finally {
      loading.value = false;
    }
  }

  return {
    method,
    url,
    baseUrl,
    queryParams,
    headerParams,
    bodyType,
    bodyJson,
    bodyFormData,
    loading,
    response,
    error,
    sendRequest,
    addParam,
    removeParam,
  };
}
