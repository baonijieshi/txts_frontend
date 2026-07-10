import request from '@/utils/request';
import { compressImage, type CompressOptions } from '@/utils/compressImage';

export interface UploadOptions {
  /** 是否启用前端压缩，默认 false */
  compress?: boolean;
  /** 压缩参数，compress 为 true 时生效 */
  compressOptions?: CompressOptions;
}

export function uploadImage(file: File, options?: UploadOptions) {
  const shouldCompress = options?.compress ?? false;

  const upload = (f: File) => {
    const formData = new FormData();
    formData.append('file', f);
    return request({
      url: '/upload/image',
      method: 'post',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  if (shouldCompress) {
    return compressImage(file, options?.compressOptions).then(upload);
  }
  return upload(file);
}
