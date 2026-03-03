import { app } from 'electron'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import type { FieldMetadata } from '../../common/types'

export class MetadataService {
  private static metadataDir: string

  // 内置的 server.properties 元数据
  private static readonly SERVER_PROPERTIES_METADATA: Record<string, FieldMetadata> = {
    'server.port': {
      description: '服务器监听的端口号',
      defaultValue: 25565,
      min: 1,
      max: 65535,
      inputType: 'port',
      required: true
    },
    'server-ip': {
      description: '服务器绑定的 IP 地址，留空则绑定所有网卡',
      defaultValue: '',
      inputType: 'ip'
    },
    'level-name': {
      description: '世界存档文件夹的名称',
      defaultValue: 'world',
      required: true
    },
    'level-seed': {
      description: '世界生成的种子，留空则随机',
      defaultValue: ''
    },
    'level-type': {
      description: '世界生成类型',
      defaultValue: 'minecraft:normal',
      enum: ['minecraft:normal', 'minecraft:flat', 'minecraft:large_biomes', 'minecraft:amplified', 'minecraft:single_biome_surface']
    },
    'gamemode': {
      description: '默认游戏模式',
      defaultValue: 'survival',
      enum: ['survival', 'creative', 'adventure', 'spectator']
    },
    'force-gamemode': {
      description: '是否强制玩家使用默认游戏模式',
      defaultValue: false
    },
    'difficulty': {
      description: '游戏难度',
      defaultValue: 'easy',
      enum: ['peaceful', 'easy', 'normal', 'hard']
    },
    'hardcore': {
      description: '是否启用极限模式（死亡后封禁）',
      defaultValue: false
    },
    'pvp': {
      description: '是否允许玩家 PvP',
      defaultValue: true
    },
    'online-mode': {
      description: '是否开启正版验证',
      defaultValue: true
    },
    'enable-command-block': {
      description: '是否启用命令方块',
      defaultValue: false
    },
    'spawn-protection': {
      description: '出生点保护半径（0=禁用）',
      defaultValue: 16,
      min: 0,
      max: 1000
    },
    'max-tick-time': {
      description: '服务器卡死超时时间（毫秒）',
      defaultValue: 60000,
      unit: 'milliseconds',
      min: 0
    },
    'view-distance': {
      description: '服务器视距',
      defaultValue: 10,
      min: 2,
      max: 32
    },
    'simulation-distance': {
      description: '模拟距离',
      defaultValue: 10,
      min: 2,
      max: 32
    },
    'max-players': {
      description: '最大玩家数量',
      defaultValue: 20,
      min: 1,
      max: 1000
    },
    'motd': {
      description: '服务器描述（显示在服务器列表）',
      defaultValue: 'A Minecraft Server',
      inputType: 'textarea'
    },
    'allow-flight': {
      description: '是否允许飞行（创造模式飞行不受影响）',
      defaultValue: false
    },
    'spawn-npcs': {
      description: '是否生成村民',
      defaultValue: true
    },
    'spawn-animals': {
      description: '是否生成动物',
      defaultValue: true
    },
    'spawn-monsters': {
      description: '是否生成怪物',
      defaultValue: true
    },
    'allow-nether': {
      description: '是否启用下界',
      defaultValue: true
    },
    'allow-end': {
      description: '是否启用末地',
      defaultValue: true
    },
    'generate-structures': {
      description: '是否生成结构（村庄、地牢等）',
      defaultValue: true
    },
    'max-world-size': {
      description: '世界最大半径（方块）',
      defaultValue: 29999984,
      min: 1,
      max: 29999984
    },
    'max-build-height': {
      description: '最大建筑高度',
      defaultValue: 256,
      min: 64,
      max: 512
    },
    'enforce-secure-profile': {
      description: '是否强制聊天签名',
      defaultValue: true
    },
    'white-list': {
      description: '是否启用白名单',
      defaultValue: false
    },
    'broadcast-console-to-ops': {
      description: '是否向 OP 广播控制台消息',
      defaultValue: true
    },
    'broadcast-rcon-to-ops': {
      description: '是否向 OP 广播 RCON 消息',
      defaultValue: true
    },
    'enable-jmx-monitoring': {
      description: '是否启用 JMX 监控',
      defaultValue: false
    },
    'enable-status': {
      description: '是否响应状态请求',
      defaultValue: true
    },
    'entity-broadcast-range-percentage': {
      description: '实体广播范围百分比',
      defaultValue: 100,
      min: 0,
      max: 500
    },
    'player-idle-timeout': {
      description: '玩家空闲踢出时间（分钟，0=禁用）',
      defaultValue: 0,
      unit: 'minutes',
      min: 0
    },
    'rate-limit': {
      description: '数据包速率限制',
      defaultValue: 0,
      min: 0
    },
    'use-native-transport': {
      description: '是否使用本地网络传输（Linux 优化）',
      defaultValue: true
    },
    'network-compression-threshold': {
      description: '网络压缩阈值（字节，-1=禁用）',
      defaultValue: 256,
      min: -1
    },
    'prevent-proxy-connections': {
      description: '是否阻止代理连接',
      defaultValue: false
    },
    'snooper-enabled': {
      description: '是否启用数据收集（已弃用）',
      defaultValue: true
    },
    'function-permission-level': {
      description: '函数权限等级',
      defaultValue: 2,
      min: 1,
      max: 4
    },
    'op-permission-level': {
      description: 'OP 权限等级',
      defaultValue: 4,
      min: 1,
      max: 4
    },
    'resource-pack': {
      description: '资源包下载链接',
      defaultValue: ''
    },
    'resource-pack-sha1': {
      description: '资源包 SHA1 校验值',
      defaultValue: ''
    },
    'require-resource-pack': {
      description: '是否强制使用资源包',
      defaultValue: false
    },
    'server-name': {
      description: '服务器名称（用于服务器列表）',
      defaultValue: 'Unknown Server'
    }
  }

  /**
   * 初始化元数据目录
   */
  private static async initMetadataDir(): Promise<string> {
    if (!this.metadataDir) {
      this.metadataDir = path.join(app.getPath('userData'), 'metadata')
      await fs.mkdir(this.metadataDir, { recursive: true })
    }
    return this.metadataDir
  }

  /**
   * 获取配置文件的元数据
   */
  static async getMetadata(filePath: string): Promise<Record<string, FieldMetadata>> {
    // 检查是否是 server.properties
    const fileName = path.basename(filePath).toLowerCase()
    if (fileName === 'server.properties') {
      return this.SERVER_PROPERTIES_METADATA
    }

    // 检查用户自定义元数据
    try {
      const userMetadata = await this.loadUserMetadata(filePath)
      if (Object.keys(userMetadata).length > 0) {
        return userMetadata
      }
    } catch (error) {
      console.error('加载用户元数据失败:', error)
    }

    return {}
  }

  /**
   * 保存用户自定义元数据
   */
  static async saveUserMetadata(
    filePath: string,
    metadata: Record<string, FieldMetadata>
  ): Promise<void> {
    try {
      const metadataDir = await this.initMetadataDir()
      const fileHash = this.getFileHash(filePath)
      const metaPath = path.join(metadataDir, `${fileHash}.json`)

      await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8')
    } catch (error) {
      throw new Error(`保存元数据失败: ${(error as Error).message}`)
    }
  }

  /**
   * 加载用户自定义元数据
   */
  private static async loadUserMetadata(
    filePath: string
  ): Promise<Record<string, FieldMetadata>> {
    try {
      const metadataDir = await this.initMetadataDir()
      const fileHash = this.getFileHash(filePath)
      const metaPath = path.join(metadataDir, `${fileHash}.json`)

      const content = await fs.readFile(metaPath, 'utf-8')
      return JSON.parse(content) as Record<string, FieldMetadata>
    } catch {
      return {}
    }
  }

  /**
   * 获取文件的 hash 值
   */
  private static getFileHash(filePath: string): string {
    return crypto.createHash('md5').update(filePath).digest('hex').substring(0, 16)
  }

  /**
   * 删除用户自定义元数据
   */
  static async deleteUserMetadata(filePath: string): Promise<void> {
    try {
      const metadataDir = await this.initMetadataDir()
      const fileHash = this.getFileHash(filePath)
      const metaPath = path.join(metadataDir, `${fileHash}.json`)

      await fs.unlink(metaPath)
    } catch {
      // 忽略文件不存在的错误
    }
  }
}
