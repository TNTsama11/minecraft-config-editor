import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { FileService } from './services/FileService'
import { ConfigService } from './services/ConfigService'
import { BackupService } from './services/BackupService'
import { MetadataService } from './services/MetadataService'
import { AppError, toAppError, ErrorCode } from '../common/errors'

// 导出类型供 preload 使用
export type { CategorizedFiles, FileTreeNode } from './services/FileService'

/**
 * IPC 处理程序包装器 - 统一错误处理
 */
function handleIpc<T>(
  channel: string,
  handler: (...args: unknown[]) => Promise<T>
): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      const result = await handler(...args)
      return { success: true, data: result }
    } catch (error) {
      const appError = toAppError(error)
      console.error(`[IPC Error] ${channel}:`, appError.message)
      return {
        success: false,
        error: appError.toJSON()
      }
    }
  })
}

function createWindow(): void {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'MC Config Editor - Minecraft 配置编辑器',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发模式下加载 Vite 开发服务器，生产模式下加载本地文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 应用程序就绪时创建窗口
app.whenReady().then(() => {
  // 为 Windows 设置应用用户模型 ID
  electronApp.setAppUserModelId('com.mcconfigeditor')

  // 在开发模式下默认通过 F12 打开开发工具
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 注册 IPC 处理程序
  registerIpcHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 当所有窗口都关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 注册 IPC 处理程序
function registerIpcHandlers(): void {
  // ===== 文件操作 =====
  handleIpc('file:selectDirectory', async () => {
    return FileService.selectDirectory()
  })

  handleIpc('file:scanConfigs', async (dir: string) => {
    return FileService.scanConfigFiles(dir)
  })

  handleIpc('file:categorize', async (files: unknown, baseDir: string) => {
    return FileService.categorizeFiles(files as import('./services/FileService').ConfigFile[], baseDir)
  })

  handleIpc('file:buildTree', async (files: unknown, baseDir: string) => {
    return FileService.buildFileTree(files as import('./services/FileService').ConfigFile[], baseDir)
  })

  handleIpc('file:read', async (filePath: string) => {
    return FileService.readFile(filePath)
  })

  handleIpc('file:write', async (filePath: string, content: string) => {
    return FileService.writeFile(filePath, content)
  })

  // 用系统默认程序打开文件
  handleIpc('file:openFile', async (filePath: string) => {
    await shell.openPath(filePath)
    return true
  })

  // 打开文件所在位置
  handleIpc('file:openInFolder', async (filePath: string) => {
    shell.showItemInFolder(filePath)
    return true
  })

  // ===== 配置解析 =====
  handleIpc('config:parse', async (filePath: string, content: string) => {
    return ConfigService.parse(filePath, content)
  })

  handleIpc('config:serialize', async (type: string, data: unknown) => {
    return ConfigService.serialize(type as 'properties' | 'yaml' | 'toml' | 'json', data as import('../common/types').ConfigNode[])
  })

  // ===== 备份管理 =====
  handleIpc('backup:create', async (filePath: string) => {
    return BackupService.createBackup(filePath)
  })

  handleIpc('backup:list', async (filePath: string) => {
    return BackupService.listBackups(filePath)
  })

  handleIpc('backup:restore', async (backupId: string) => {
    return BackupService.restoreBackup(backupId)
  })

  handleIpc('backup:delete', async (backupId: string) => {
    return BackupService.deleteBackup(backupId)
  })

  // ===== 元数据 =====
  handleIpc('metadata:get', async (filePath: string) => {
    return MetadataService.getMetadata(filePath)
  })

  handleIpc('metadata:save', async (filePath: string, metadata: unknown) => {
    return MetadataService.saveUserMetadata(filePath, metadata as Record<string, unknown>)
  })
}
