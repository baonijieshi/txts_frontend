/**
 * 解析时间
 * @param time
 * @param cFormat
 * @returns {string | null}
 */
export function parseTime(time: any, cFormat?: string): string | null {
  if (arguments.length === 0 || !time) {
    return null;
  }
  const format = cFormat || '{y}-{m}-{d} {h}:{i}:{s}';
  let date: Date;
  if (typeof time === 'object') {
    date = time;
  } else {
    if (typeof time === 'string') {
      if (/^[0-9]+$/.test(time)) {
        time = parseInt(time);
      } else {
        time = time.replace(new RegExp(/-/gm), '/');
      }
    }

    if (typeof time === 'number' && time.toString().length === 10) {
      time *= 1000;
    }
    date = new Date(time);
  }
  const formatObj: Record<string, number> = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay(),
  };
  const timeStr = format.replace(/{([ymdhisa])+}/g, (_result: string, key: string) => {
    const value = formatObj[key];
    if (key === 'a') { return ['日', '一', '二', '三', '四', '五', '六'][value]; }
    return value.toString().padStart(2, '0');
  });
  return timeStr;
}

/**
 * 格式化时间
 * @param time
 * @param option
 * @returns {string}
 */
export function formatTime(time: any, option?: string): string {
  if (('' + time).length === 10) {
    time = parseInt(time) * 1000;
  } else {
    time = +time;
  }
  const d = new Date(time);
  const now = Date.now();

  const diff = (now - d.getTime()) / 1000;

  if (diff < 30) {
    return '刚刚';
  } if (diff < 3600) {
    return Math.ceil(diff / 60) + '分钟前';
  } if (diff < 3600 * 24) {
    return Math.ceil(diff / 3600) + '小时前';
  } if (diff < 3600 * 24 * 2) {
    return '1天前';
  }
  if (option) {
    return parseTime(time, option)!;
  }
  return (
    d.getMonth()
      + 1
      + '月'
      + d.getDate()
      + '日'
      + d.getHours()
      + '时'
      + d.getMinutes()
      + '分'
  );
}

/**
 * 防抖函数
 */
export function debounce(func: Function, wait: number, immediate?: boolean) {
  let timeout: ReturnType<typeof setTimeout> | null;
  return function (this: any) {
    const context = this;
    const args = arguments;
    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * 深拷贝
 */
export function deepClone(source: any): any {
  if (!source && typeof source !== 'object') {
    throw new Error('error arguments');
  }
  const targetObj: any = source.constructor === Array ? [] : {};
  Object.keys(source).forEach((keys) => {
    if (source[keys] && typeof source[keys] === 'object') {
      targetObj[keys] = deepClone(source[keys]);
    } else {
      targetObj[keys] = source[keys];
    }
  });
  return targetObj;
}
