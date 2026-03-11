import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConfigNode, ConfigValue, FieldMetadata } from '../../../common/types'
import { getFieldType } from '../../../common/types'

const MAX_HISTORY = 50

export const useConfigStore = defineStore('config', () => {
  const configData = ref<ConfigNode[]>([])
  const originalData = ref<string>('')
  const metadata = ref<Record<string, FieldMetadata>>({})

  // 撤销/重做栈
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])

  const hasChanges = computed(() => {
    if (!originalData.value) return false
    return JSON.stringify(configData.value) !== originalData.value
  })

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function setConfigData(data: ConfigNode[]): void {
    configData.value = data
    originalData.value = JSON.stringify(data)
    undoStack.value = []
    redoStack.value = []
  }

  function updateConfigNode(path: string, value: ConfigValue): void {
    // 保存当前状态到撤销栈
    undoStack.value.push(JSON.stringify(configData.value))
    if (undoStack.value.length > MAX_HISTORY) {
      undoStack.value.shift()
    }
    redoStack.value = []

    const doUpdate = (nodes: ConfigNode[]): boolean => {
      for (const node of nodes) {
        if (node.path === path) {
          node.value = value
          node.modified = true

          // 列表类型：同步重建 children 以保持 UI 一致
          if (node.type === 'list' && Array.isArray(value)) {
            node.children = value.map((v, i) => ({
              key: String(i),
              path: `${path}[${i}]`,
              value: v as ConfigValue,
              type: getFieldType(v as ConfigValue),
              modified: true
            }))
          }

          return true
        }
        if (node.children && doUpdate(node.children)) {
          return true
        }
      }
      return false
    }
    doUpdate(configData.value)
  }

  function undo(): void {
    if (undoStack.value.length === 0) return
    redoStack.value.push(JSON.stringify(configData.value))
    const prev = undoStack.value.pop()!
    configData.value = JSON.parse(prev)
  }

  function redo(): void {
    if (redoStack.value.length === 0) return
    undoStack.value.push(JSON.stringify(configData.value))
    const next = redoStack.value.pop()!
    configData.value = JSON.parse(next)
  }

  function markSaved(): void {
    originalData.value = JSON.stringify(configData.value)
  }

  function setMetadata(data: Record<string, FieldMetadata>): void {
    metadata.value = data
  }

  function clear(): void {
    configData.value = []
    originalData.value = ''
    metadata.value = {}
    undoStack.value = []
    redoStack.value = []
  }

  return {
    configData,
    metadata,
    hasChanges,
    canUndo,
    canRedo,
    setConfigData,
    updateConfigNode,
    undo,
    redo,
    markSaved,
    setMetadata,
    clear
  }
})
