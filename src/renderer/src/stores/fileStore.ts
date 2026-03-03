import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ConfigFile } from '../../../common/types'

export const useFileStore = defineStore('file', () => {
  // 当前服务端路径
  const serverPath = ref<string>('')

  // 配置文件列表
  const configFiles = ref<ConfigFile[]>([])

  // 当前选中的文件
  const selectedFile = ref<ConfigFile | null>(null)

  // 设置服务端路径
  function setServerPath(path: string): void {
    serverPath.value = path
  }

  // 设置配置文件列表
  function setConfigFiles(files: ConfigFile[]): void {
    configFiles.value = files
  }

  // 设置选中的文件
  function setSelectedFile(file: ConfigFile | null): void {
    selectedFile.value = file
  }

  // 清空状态
  function clear(): void {
    serverPath.value = ''
    configFiles.value = []
    selectedFile.value = null
  }

  return {
    serverPath,
    configFiles,
    selectedFile,
    setServerPath,
    setConfigFiles,
    setSelectedFile,
    clear
  }
})
