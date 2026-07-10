/**
 * 前端图片压缩工具（Canvas API）
 * 在上传前对图片进行尺寸缩放 + 质量压缩，减少传输与存储开销
 */

export interface CompressOptions {
  /** 最大宽度，超出等比缩小，默认 1920 */
  maxWidth?: number;
  /** 最大高度，超出等比缩小，默认 1920 */
  maxHeight?: number;
  /** JPEG 压缩质量 0~1，默认 0.85 */
  quality?: number;
  /** 文件体积阈值（字节），小于此值跳过压缩，默认 200KB */
  threshold?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  threshold: 200 * 1024,
};

/**
 * 压缩图片文件
 * @returns 压缩后的 File 对象；若原图小于阈值则原样返回
 */
export function compressImage(file: File, options?: CompressOptions): Promise<File> {
  const opts = { ...DEFAULTS, ...options };

  // 小于阈值或 GIF 动图（Canvas 无法保留动画），跳过压缩
  if (file.size <= opts.threshold || file.type === 'image/gif') {
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // 计算缩放后的尺寸
      let { width, height } = img;
      const scaleX = Math.min(1, opts.maxWidth / width);
      const scaleY = Math.min(1, opts.maxHeight / height);
      const scale = Math.min(scaleX, scaleY);

      if (scale < 1) {
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      // 绘制到 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // 导出为 Blob → File
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // 压缩后反而更大或失败，返回原文件
            resolve(file);
          } else {
            const ext = file.name.toLowerCase().endsWith('.png') ? '.png' : '.jpg';
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ext), { type: 'image/jpeg' }));
          }
        },
        'image/jpeg',
        opts.quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // 加载失败，返回原文件
    };

    img.src = url;
  });
}
