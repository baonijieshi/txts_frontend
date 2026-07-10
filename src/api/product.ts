import request from '@/utils/request';

export function getProductList(params?: Record<string, unknown>) {
  return request({ url: '/product/list', method: 'get', params });
}

export function createProduct(data: Record<string, unknown>) {
  return request({ url: '/product/create', method: 'post', data });
}

export function updateProduct(id: number, data: Record<string, unknown>) {
  return request({ url: `/product/${id}`, method: 'put', data });
}

export function deleteProduct(id: number) {
  return request({ url: `/product/${id}`, method: 'delete' });
}
