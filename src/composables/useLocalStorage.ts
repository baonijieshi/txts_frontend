import { ref, watch } from 'vue'

/**
 * 响应式 localStorage 封装，自动同步写入/读取
 * @param key - localStorage 键名
 * @param defaultValue - 默认值
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const stored = localStorage.getItem(key)
  let initialValue: T = defaultValue
  if (stored !== null) {
    try {
      initialValue = JSON.parse(stored) as T
    } catch {
      // 兼容旧数据：非 JSON 格式的纯字符串直接用作值
      initialValue = stored as unknown as T
    }
  }
  const val = ref<T>(initialValue)

  watch(val, (newVal) => {
    if (newVal === null || newVal === undefined || newVal === '') {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, typeof newVal === 'string' ? newVal as string : JSON.stringify(newVal))
    }
  })

  return val
}
