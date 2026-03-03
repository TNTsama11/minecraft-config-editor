import { app } from 'electron'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import type { Backup } from '../../common/types'

export class BackupService {
  private static backupDir: string

  /**
   * 初始化备份目录
   */
  private static async initBackupDir(): Promise<string> {
    if (!this.backupDir) {
      this.backupDir = path.join(app.getPath('userData'), 'backups')
      await fs.mkdir(this.backupDir, { recursive: true })
    }
    return this.backupDir
  }

  /**
   * 生成备份 ID
   */
  private static generateBackupId(): string {
    return crypto.randomBytes(8).toString('hex')
  }

  /**
   * 获取文件备份目录
   */
  private static async getFileBackupDir(filePath: string): Promise<string> {
    const baseDir = await this.initBackupDir()
    // 使用文件路径的 hash 作为子目录名
    const fileHash = crypto.createHash('md5').update(filePath).digest('hex').substring(0, 16)
    const fileBackupDir = path.join(baseDir, fileHash)
    await fs.mkdir(fileBackupDir, { recursive: true })
    return fileBackupDir
  }

  /**
   * 创建备份
   */
  static async createBackup(filePath: string): Promise<Backup | null> {
    try {
      // 检查文件是否存在
      const stat = await fs.stat(filePath)
      if (!stat.isFile()) {
        throw new Error('目标不是文件')
      }

      // 读取原文件内容
      const content = await fs.readFile(filePath)

      // 生成备份信息
      const id = this.generateBackupId()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
      const ext = path.extname(filePath)
      const backupFileName = `${path.basename(filePath, ext)}.backup.${timestamp}${ext}`

      // 获取备份目录
      const backupDir = await this.getFileBackupDir(filePath)
      const backupPath = path.join(backupDir, backupFileName)

      // 写入备份文件
      await fs.writeFile(backupPath, content)

      // 创建备份记录
      const backup: Backup = {
        id,
        originalPath: filePath,
        backupPath,
        createdAt: new Date().toISOString(),
        size: stat.size
      }

      // 保存备份元数据
      await this.saveBackupMeta(backupDir, id, backup)

      // 清理旧备份（保留最近 20 个）
      await this.cleanupOldBackups(filePath, 20)

      return backup
    } catch (error) {
      console.error('创建备份失败:', error)
      throw new Error(`创建备份失败: ${(error as Error).message}`)
    }
  }

  /**
   * 获取备份列表
   */
  static async listBackups(filePath: string): Promise<Backup[]> {
    try {
      const backupDir = await this.getFileBackupDir(filePath)
      const backups: Backup[] = []

      // 读取所有备份元数据文件
      const files = await fs.readdir(backupDir)
      const metaFiles = files.filter((f) => f.endsWith('.meta.json'))

      for (const metaFile of metaFiles) {
        try {
          const metaPath = path.join(backupDir, metaFile)
          const content = await fs.readFile(metaPath, 'utf-8')
          const backup: Backup = JSON.parse(content)

          // 检查备份文件是否还存在
          try {
            await fs.access(backup.backupPath)
            backups.push(backup)
          } catch {
            // 备份文件不存在，删除元数据
            await fs.unlink(metaPath)
          }
        } catch (error) {
          console.error('读取备份元数据失败:', error)
        }
      }

      // 按创建时间降序排序
      backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return backups
    } catch (error) {
      console.error('获取备份列表失败:', error)
      return []
    }
  }

  /**
   * 恢复备份
   */
  static async restoreBackup(backupId: string): Promise<void> {
    try {
      // 在所有备份目录中查找该备份
      const baseDir = await this.initBackupDir()
      const subDirs = await fs.readdir(baseDir)

      for (const subDir of subDirs) {
        const metaPath = path.join(baseDir, subDir, `${backupId}.meta.json`)

        try {
          const content = await fs.readFile(metaPath, 'utf-8')
          const backup: Backup = JSON.parse(content)

          // 读取备份文件内容
          const backupContent = await fs.readFile(backup.backupPath)

          // 写入原文件
          await fs.writeFile(backup.originalPath, backupContent)

          return
        } catch {
          // 继续查找
        }
      }

      throw new Error('备份不存在')
    } catch (error) {
      console.error('恢复备份失败:', error)
      throw new Error(`恢复备份失败: ${(error as Error).message}`)
    }
  }

  /**
   * 删除备份
   */
  static async deleteBackup(backupId: string): Promise<void> {
    try {
      // 在所有备份目录中查找该备份
      const baseDir = await this.initBackupDir()
      const subDirs = await fs.readdir(baseDir)

      for (const subDir of subDirs) {
        const metaPath = path.join(baseDir, subDir, `${backupId}.meta.json`)

        try {
          const content = await fs.readFile(metaPath, 'utf-8')
          const backup: Backup = JSON.parse(content)

          // 删除备份文件
          try {
            await fs.unlink(backup.backupPath)
          } catch {
            // 忽略文件不存在的错误
          }

          // 删除元数据文件
          await fs.unlink(metaPath)

          return
        } catch {
          // 继续查找
        }
      }

      throw new Error('备份不存在')
    } catch (error) {
      console.error('删除备份失败:', error)
      throw new Error(`删除备份失败: ${(error as Error).message}`)
    }
  }

  /**
   * 保存备份元数据
   */
  private static async saveBackupMeta(backupDir: string, id: string, backup: Backup): Promise<void> {
    const metaPath = path.join(backupDir, `${id}.meta.json`)
    await fs.writeFile(metaPath, JSON.stringify(backup, null, 2), 'utf-8')
  }

  /**
   * 清理旧备份
   */
  private static async cleanupOldBackups(filePath: string, keepCount: number): Promise<void> {
    const backups = await this.listBackups(filePath)

    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount)

      for (const backup of toDelete) {
        try {
          await this.deleteBackup(backup.id)
        } catch (error) {
          console.error('清理旧备份失败:', error)
        }
      }
    }
  }
}
