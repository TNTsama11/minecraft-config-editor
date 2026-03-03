/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

import type { ConfigFile, ConfigNode, Backup, FieldMetadata, CategorizedFiles, FileTreeNode } from '../common/types'

interface ElectronAPI {
  file: {
    selectDirectory: () => Promise<string | null>
    scanConfigs: (dir: string) => Promise<ConfigFile[]>
    categorize: (files: ConfigFile[], baseDir: string) => Promise<CategorizedFiles>
    buildTree: (files: ConfigFile[], baseDir: string) => Promise<FileTreeNode[]>
    read: (path: string) => Promise<string>
    write: (path: string, content: string) => Promise<void>
    openFile: (path: string) => Promise<{ success: boolean; error?: string }>
    openInFolder: (path: string) => Promise<{ success: boolean; error?: string }>
  }
  config: {
    parse: (path: string, content: string) => Promise<ConfigNode[]>
    serialize: (type: string, data: ConfigNode[]) => Promise<string>
  }
  backup: {
    create: (filePath: string) => Promise<Backup | null>
    list: (filePath: string) => Promise<Backup[]>
    restore: (backupId: string) => Promise<void>
    delete: (backupId: string) => Promise<void>
  }
  metadata: {
    get: (filePath: string) => Promise<Record<string, FieldMetadata>>
    save: (filePath: string, metadata: Record<string, FieldMetadata>) => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
