import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Backup } from '../../../common/types'

export const useBackupStore = defineStore('backup', () => {
  // 当前文件的备份列表
  const backups = ref<Backup[]>([])

  // 是否正在加载
  const loading = ref(false)

  // 设置备份列表
  function setBackups(list: Backup[]): void {
    backups.value = list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  // 添加备份
  function addBackup(backup: Backup): void {
    backups.value.unshift(backup)
  }

  // 移除备份
  function removeBackup(backupId: string): void {
    const index = backups.value.findIndex((b) => b.id === backupId)
    if (index > -1) {
      backups.value.splice(index, 1)
    }
  }

  // 设置加载状态
  function setLoading(value: boolean): void {
    loading.value = value
  }

  // 清空状态
  function clear(): void {
    backups.value = []
    loading.value = false
  }

  return {
    backups,
    loading,
    setBackups,
    addBackup,
    removeBackup,
    setLoading,
    clear
  }
})
