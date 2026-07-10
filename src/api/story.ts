import request from '@/utils/request';

export function getStoryList(params?: Record<string, unknown>) {
  return request({ url: '/story/list', method: 'get', params });
}

export function createStory(data: Record<string, unknown>) {
  return request({ url: '/story/create', method: 'post', data });
}

export function updateStory(id: number, data: Record<string, unknown>) {
  return request({ url: `/story/${id}`, method: 'put', data });
}

export function deleteStory(id: number) {
  return request({ url: `/story/${id}`, method: 'delete' });
}

export function getStoryComments(storyId: number) {
  return request({ url: `/story/${storyId}/comments`, method: 'get' });
}

export function createStoryComment(storyId: number, data: Record<string, unknown>) {
  return request({ url: `/story/${storyId}/comments`, method: 'post', data });
}

export function deleteStoryComment(commentId: number) {
  return request({ url: `/story/comments/${commentId}`, method: 'delete' });
}

export function updateStoryComment(commentId: number, data: Record<string, unknown>) {
  return request({ url: `/story/comments/${commentId}/update`, method: 'put', data });
}

export function parseFeishuDoc(data: Record<string, unknown>) {
  return request({ url: '/story/parse-feishu-doc', method: 'post', data, timeout: 120000 });
}

export function reviewStory(id: number, data: Record<string, unknown>) {
  return request({ url: `/story/${id}/review`, method: 'post', data });
}

export function getStoryReviews(id: number) {
  return request({ url: `/story/${id}/reviews`, method: 'get' });
}
