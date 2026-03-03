import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConfigNode, FieldMetadata } from '../../../common/types'

export const useConfigStore = defineStore('config', () => {
  // 当前配置数据
  const configData = ref<ConfigNode[]>([])

  // 原始配置数据（用于检测更改）
  const originalData = ref<string>('')

  // 当前文件的元数据
  const metadata = ref<Record<string, FieldMetadata>>({})

  // 是否有未保存的更改
  const hasChanges = computed(() => {
    if (!originalData.value) return false
    return JSON.stringify(configData.value) !== originalData.value
  })

  // 设置配置数据
  function setConfigData(data: ConfigNode[]): void {
    configData.value = data
    originalData.value = JSON.stringify(data)
  }

  // 更新配置节点
  function updateConfigNode(path: string, value: unknown): void {
    const updateNode = (nodes: ConfigNode[]): boolean => {
      for (const node of nodes) {
        if (node.path === path) {
          node.value = value as ConfigNode['value']
          node.modified = true
          return true
        }
        if (node.children && updateNode(node.children)) {
          return true
        }
      }
      return false
    }
    updateNode(configData.value)
  }

  // 设置元数据
  function setMetadata(data: Record<string, FieldMetadata>): void {
    metadata.value = data
  }

  // 清空状态
  function clear(): void {
    configData.value = []
    originalData.value = ''
    metadata.value = {}
  }

  return {
    configData,
    metadata,
    hasChanges,
    setConfigData,
    updateConfigNode,
    setMetadata,
    clear
  }
})
