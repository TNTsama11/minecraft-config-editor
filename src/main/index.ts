import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, resolve, sep } from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { FileService } from './services/FileService'
import { ConfigService } from './services/ConfigService'
import { BackupService } from './services/BackupService'
import { MetadataService } from './services/MetadataService'
import { AppError, toAppError, ErrorCode } from '../common/errors'

// 窗口状态持久化
interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized?: boolean
}

const WINDOW_STATE_FILE = join(app.getPath('userData'), 'window-state.json')

async function loadWindowState(): Promise<WindowState> {
  try {
    const data = await fs.readFile(WINDOW_STATE_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { width: 1280, height: 800 }
  }
}

async function saveWindowState(win: BrowserWindow): Promise<void> {
  try {
    const bounds = win.getBounds()
    const state: WindowState = {
      ...bounds,
      isMaximized: win.isMaximized()
    }
    await fs.writeFile(WINDOW_STATE_FILE, JSON.stringify(state), 'utf-8')
  } catch {
    // 保存失败不影响使用
  }
}

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

async function createWindow(): Promise<void> {
  const state = await loadWindowState()

  const mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
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

  if (state.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', () => {
    saveWindowState(mainWindow)
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

  handleIpc('file:openFile', async (filePath: string) => {
    const root = FileService.getAllowedRoot()
    if (root) {
      const resolved = resolve(filePath)
      if (!resolved.startsWith(resolve(root) + sep) && resolved !== resolve(root)) {
        throw new AppError(ErrorCode.FILE_READ_ERROR, '路径超出允许范围')
      }
    }
    await shell.openPath(filePath)
    return true
  })

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

  handleIpc('metadata:delete', async (filePath: string) => {
    return MetadataService.deleteUserMetadata(filePath)
  })
}
