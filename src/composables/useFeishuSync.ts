import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { SyncCountResult } from '@/types/organization'
import { syncFeishuUsers } from '@/api/member'
import { syncFeishuDepts } from '@/api/department'
import { useLocalStorage } from './useLocalStorage'

export function useFeishuSync(onSuccess?: () => void) {
  const syncing = ref(false)
  const lastSyncTime = useLocalStorage<string>('org_lastSyncTime', '')

  /** 同步部门 + 成员 */
  async function handleSyncAll() {
    syncing.value = true
    try {
      // 先同步部门
      const deptRes = await syncFeishuDepts()
      const dd = deptRes.data as SyncCountResult
      const deptParts: string[] = []
      if (dd.created) deptParts.push(`新增 ${dd.created} 个部门`)
      if (dd.updated) deptParts.push(`更新 ${dd.updated} 个部门`)

      // 再同步成员
      const userRes = await syncFeishuUsers()
      const ud = userRes.data as SyncCountResult
      const userParts: string[] = []
      if (ud.created) userParts.push(`新增 ${ud.created} 人`)
      if (ud.updated) userParts.push(`更新 ${ud.updated} 人`)
      if (ud.skipped) userParts.push(`跳过 ${ud.skipped} 人`)

      const allParts = [...deptParts, ...userParts]
      if (dd.errors?.length) allParts.push(`部门 ${dd.errors.length} 个错误`)
      if (ud.errors?.length) allParts.push(`成员 ${ud.errors.length} 个错误`)

      ElMessage.success(`同步完成：${allParts.join('，')}`)
      lastSyncTime.value = new Date().toLocaleString('zh-CN')
      onSuccess?.()
    } catch {
      ElMessage.error('同步失败，请检查飞书应用配置')
    } finally {
      syncing.value = false
    }
  }

  /** 仅同步部门 */
  async function handleSyncDeptsOnly() {
    syncing.value = true
    try {
      const res = await syncFeishuDepts()
      const d = res.data as SyncCountResult
      const parts: string[] = []
      if (d.created) parts.push(`新增 ${d.created} 个`)
      if (d.updated) parts.push(`更新 ${d.updated} 个`)
      if (d.skipped) parts.push(`跳过 ${d.skipped} 个`)
      if (d.errors?.length) parts.push(`${d.errors.length} 个错误`)
      ElMessage.success(`部门同步完成：${parts.join('，')}`)
      lastSyncTime.value = new Date().toLocaleString('zh-CN')
      onSuccess?.()
    } catch {
      ElMessage.error('同步失败，请检查飞书应用配置')
    } finally {
      syncing.value = false
    }
  }

  return {
    syncing,
    lastSyncTime,
    handleSyncAll,
    handleSyncDeptsOnly,
  }
}
