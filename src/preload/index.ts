import { contextBridge, ipcRenderer } from 'electron'
import type { ConfigFile, ConfigNode, Backup, FieldMetadata, CategorizedFiles, FileTreeNode } from '../common/types'
import { deserializeError, AppError } from '../common/errors'

/**
 * IPC 响应类型
 */
interface IpcResponse<T> {
  success: boolean
  data?: T
  error?: ReturnType<AppError['toJSON']>
}

/**
 * 调用 IPC 并处理响应
 * 统一处理成功/失败响应，失败时抛出 AppError
 */
async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const response: IpcResponse<T> = await ipcRenderer.invoke(channel, ...args)

  if (response.success) {
    return response.data as T
  }

  // 反序列化错误并抛出
  throw deserializeError(response.error!)
}

// 暴露受保护的 API 到渲染进程
const api = {
  // 文件操作
  file: {
    selectDirectory: (): Promise<string | null> => invoke('file:selectDirectory'),
    scanConfigs: (dir: string): Promise<ConfigFile[]> => invoke('file:scanConfigs', dir),
    categorize: (files: ConfigFile[], baseDir: string): Promise<CategorizedFiles> =>
      invoke('file:categorize', files, baseDir),
    buildTree: (files: ConfigFile[], baseDir: string): Promise<FileTreeNode[]> =>
      invoke('file:buildTree', files, baseDir),
    read: (path: string): Promise<string> => invoke('file:read', path),
    write: (path: string, content: string): Promise<void> => invoke('file:write', path, content),
    openFile: (path: string): Promise<boolean> => invoke('file:openFile', path),
    openInFolder: (path: string): Promise<boolean> => invoke('file:openInFolder', path)
  },

  // 配置解析
  config: {
    parse: (path: string, content: string): Promise<ConfigNode[]> =>
      invoke('config:parse', path, content),
    serialize: (type: string, data: ConfigNode[]): Promise<string> =>
      invoke('config:serialize', type, data)
  },

  // 备份管理
  backup: {
    create: (filePath: string): Promise<Backup | null> => invoke('backup:create', filePath),
    list: (filePath: string): Promise<Backup[]> => invoke('backup:list', filePath),
    restore: (backupId: string): Promise<void> => invoke('backup:restore', backupId),
    delete: (backupId: string): Promise<void> => invoke('backup:delete', backupId)
  },

  // 元数据
  metadata: {
    get: (filePath: string): Promise<Record<string, FieldMetadata>> =>
      invoke('metadata:get', filePath),
    save: (filePath: string, metadata: Record<string, FieldMetadata>): Promise<void> =>
      invoke('metadata:save', filePath, metadata)
  }
}

// 使用 contextBridge 将 API 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', api)

// 导出类型供渲染进程使用
export type ElectronAPI = typeof api
