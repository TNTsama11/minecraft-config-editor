import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConfigFile } from '../../../common/types'

export interface RecentServer {
  name: string
  path: string
  lastOpened: string
}

const RECENT_SERVERS_KEY = 'mc-config-recent-servers'
const MAX_RECENT = 10

function loadRecentFromStorage(): RecentServer[] {
  try {
    const data = localStorage.getItem(RECENT_SERVERS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export const useFileStore = defineStore('file', () => {
  const serverPath = ref<string>('')
  const configFiles = ref<ConfigFile[]>([])
  const selectedFile = ref<ConfigFile | null>(null)
  const recentServers = ref<RecentServer[]>(loadRecentFromStorage())

  const serverName = computed(() => {
    if (!serverPath.value) return 'Minecraft'
    const parts = serverPath.value.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || 'Minecraft'
  })

  function setServerPath(path: string): void {
    serverPath.value = path
    addRecentServer(path)
  }

  function setConfigFiles(files: ConfigFile[]): void {
    configFiles.value = files
  }

  function setSelectedFile(file: ConfigFile | null): void {
    selectedFile.value = file
  }

  function persistRecent(): void {
    localStorage.setItem(RECENT_SERVERS_KEY, JSON.stringify(recentServers.value))
  }

  function addRecentServer(dirPath: string): void {
    const name = dirPath.replace(/\\/g, '/').split('/').pop() || 'Minecraft'
    const existing = recentServers.value.findIndex((s) => s.path === dirPath)
    if (existing !== -1) {
      recentServers.value.splice(existing, 1)
    }
    recentServers.value.unshift({
      name,
      path: dirPath,
      lastOpened: new Date().toISOString()
    })
    if (recentServers.value.length > MAX_RECENT) {
      recentServers.value = recentServers.value.slice(0, MAX_RECENT)
    }
    persistRecent()
  }

  function removeRecentServer(dirPath: string): void {
    recentServers.value = recentServers.value.filter((s) => s.path !== dirPath)
    persistRecent()
  }

  function clear(): void {
    serverPath.value = ''
    configFiles.value = []
    selectedFile.value = null
  }

  return {
    serverPath,
    serverName,
    configFiles,
    selectedFile,
    recentServers,
    setServerPath,
    setConfigFiles,
    setSelectedFile,
    addRecentServer,
    removeRecentServer,
    clear
  }
})
