import { dialog } from 'electron'
import { promises as fs } from 'fs'
import * as path from 'path'
import type { ConfigFile, ConfigFileType } from '../../common/types'
import { FileSystemError, ErrorCode, logError } from '../../common/errors'

// 支持的配置文件扩展名
const CONFIG_EXTENSIONS: Record<string, ConfigFileType> = {
  '.properties': 'properties',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.toml': 'toml',
  '.json': 'json',
  '.txt': 'properties'  // options.txt 等使用 properties 格式
}

// 服务端核心配置文件
const SERVER_CONFIG_FILES = new Set([
  'server.properties',
  'bukkit.yml',
  'spigot.yml',
  'paper.yml',
  'purpur.yml',
  'pufferfish.yml',
  'tuinity.yml',
  'airplane.yml',
  'commands.yml',
  'permissions.yml',
  'help.yml',
  'eula.txt',
  'whitelist.json',
  'banned-players.json',
  'banned-ips.json',
  'ops.json',
  'usercache.json',
  'usernamecache.json',
  'spigot.yml',
  'paper-global.yml',
  'paper-world-defaults.yml'
])

// 客户端配置文件
const CLIENT_CONFIG_FILES = new Set([
  'options.txt',
  'servers.dat',
  'servers.dat_old',
  'realms_persistence.json',
  'servers.dat.txt',
  'launcher_settings.json',
  'launcher_profiles.json',
  'usercache.json',
  'output-client.log',  // 日志不算配置
])

// 需要忽略的目录
const IGNORE_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'cache',
  'libraries',
  'versions',
  'assets',
  'logs',
  'crash-reports',
  'screenshots',
  'saves',
  'stats',
  'advancements',
  'playerdata',
  'data',
  'region',
  'entities',
  'poi',
  'dim',
  'DIM1',
  'DIM-1',
  'generated'
])

export interface CategorizedFiles {
  serverConfigs: ConfigFile[]
  pluginConfigs: ConfigFile[]
  modConfigs: ConfigFile[]
  otherConfigs: ConfigFile[]
}

export interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  file?: ConfigFile
  children?: FileTreeNode[]
}

export class FileService {
  /**
   * 打开目录选择对话框
   */
  static async selectDirectory(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      title: '选择 Minecraft 目录',
      properties: ['openDirectory', 'createDirectory'],
      message: '请选择 Minecraft 服务端或客户端目录'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  }

  /**
   * 扫描配置文件并分类
   */
  static async scanConfigFiles(dir: string): Promise<ConfigFile[]> {
    const files: ConfigFile[] = []

    async function scanDirectory(currentDir: string, baseDir: string, depth: number): Promise<void> {
      // 限制扫描深度
      if (depth > 5) return

      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name)

          if (entry.isDirectory()) {
            // 跳过忽略的目录
            if (IGNORE_DIRECTORIES.has(entry.name.toLowerCase())) {
              continue
            }
            // 递归扫描子目录
            await scanDirectory(fullPath, baseDir, depth + 1)
          } else if (entry.isFile()) {
            // 检查文件扩展名
            const ext = path.extname(entry.name).toLowerCase()
            const fileType = CONFIG_EXTENSIONS[ext]

            if (fileType) {
              try {
                const stat = await fs.stat(fullPath)
                const relativePath = path.relative(baseDir, fullPath)

                files.push({
                  path: fullPath,
                  name: entry.name,
                  type: fileType,
                  size: stat.size,
                  lastModified: stat.mtime.toISOString(),
                  relativePath: relativePath
                })
              } catch (error) {
                logError(
                  new FileSystemError(ErrorCode.FILE_READ_ERROR, fullPath, '获取文件信息', { cause: error as Error }),
                  'scanConfigFiles'
                )
              }
            }
          }
        }
      } catch (error) {
        logError(
          new FileSystemError(ErrorCode.DIRECTORY_NOT_FOUND, currentDir, '扫描目录', { cause: error as Error }),
          'scanConfigFiles'
        )
      }
    }

    await scanDirectory(dir, dir, 0)

    // 按路径排序
    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))

    return files
  }

  /**
   * 将文件列表分类
   */
  static categorizeFiles(files: ConfigFile[], baseDir: string): CategorizedFiles {
    const result: CategorizedFiles = {
      serverConfigs: [],
      pluginConfigs: [],
      modConfigs: [],
      otherConfigs: []
    }

    for (const file of files) {
      const lowerPath = file.relativePath.toLowerCase().replace(/\\/g, '/')
      const fileName = path.basename(file.path).toLowerCase()

      // 判断是否为服务器核心配置
      const isServerConfig =
        SERVER_CONFIG_FILES.some(cfg => fileName === cfg.toLowerCase()) ||
        (lowerPath.startsWith('config/') && !lowerPath.includes('/'))

      // 判断是否为插件配置（通常在 plugins 目录下）
      const isPluginConfig =
        lowerPath.includes('plugins/') ||
        lowerPath.includes('plugin configs/')

      // 判断是否为模组配置（通常在 config 目录下的模组配置）
      const isModConfig =
        lowerPath.startsWith('config/') &&
        lowerPath.split('/').length > 2

      if (isServerConfig) {
        result.serverConfigs.push(file)
      } else if (isPluginConfig) {
        result.pluginConfigs.push(file)
      } else if (isModConfig) {
        result.modConfigs.push(file)
      } else {
        result.otherConfigs.push(file)
      }
    }

    return result
  }

  /**
   * 构建文件树结构
   */
  static buildFileTree(files: ConfigFile[], baseDir: string): FileTreeNode[] {
    const root: FileTreeNode[] = []

    for (const file of files) {
      const parts = file.relativePath.replace(/\\/g, '/').split('/')
      let current = root

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isFile = i === parts.length - 1
        const currentPath = parts.slice(0, i + 1).join('/')

        if (isFile) {
          // 添加文件节点
          current.push({
            name: part,
            path: file.path,
            isDirectory: false,
            file: file
          })
        } else {
          // 查找或创建目录节点
          let dirNode = current.find(n => n.name === part && n.isDirectory)

          if (!dirNode) {
            dirNode = {
              name: part,
              path: path.join(baseDir, currentPath),
              isDirectory: true,
              children: []
            }
            current.push(dirNode)
          }

          current = dirNode.children!
        }
      }
    }

    // 排序：目录在前，文件在后，按名称排序
    const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
      nodes.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      for (const node of nodes) {
        if (node.children) {
          node.children = sortNodes(node.children)
        }
      }

      return nodes
    }

    return sortNodes(root)
  }

  /**
   * 读取文件内容
   */
  static async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return content
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'ENOENT') {
        throw new FileSystemError(ErrorCode.FILE_NOT_FOUND, filePath, '读取文件', { cause: error as Error })
      }
      throw new FileSystemError(ErrorCode.FILE_READ_ERROR, filePath, '读取文件', { cause: error as Error })
    }
  }

  /**
   * 写入文件内容
   */
  static async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf-8')
    } catch (error) {
      throw new FileSystemError(ErrorCode.FILE_WRITE_ERROR, filePath, '写入文件', { cause: error as Error })
    }
  }

  /**
   * 检查文件是否存在
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath)
      return stat.isFile()
    } catch {
      return false
    }
  }
}
