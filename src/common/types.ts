// ============================================
// 配置值类型系统 - 增强的类型安全
// ============================================

/**
 * 基础配置值类型（非复合类型）
 */
export type PrimitiveConfigValue = string | number | boolean | null

/**
 * 配置对象类型
 */
export type ConfigObject = { [key: string]: ConfigValue }

/**
 * 配置数组类型
 */
export type ConfigArray = ConfigValue[]

/**
 * 配置值类型 - 递归类型，但分层定义提高可读性
 */
export type ConfigValue = PrimitiveConfigValue | ConfigArray | ConfigObject

// ============================================
// 类型守卫函数 - 运行时类型检查
// ============================================

/**
 * 判断值是否为 null
 */
export function isConfigNull(value: ConfigValue): value is null {
  return value === null
}

/**
 * 判断值是否为字符串
 */
export function isConfigString(value: ConfigValue): value is string {
  return typeof value === 'string'
}

/**
 * 判断值是否为数字
 */
export function isConfigNumber(value: ConfigValue): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

/**
 * 判断值是否为布尔值
 */
export function isConfigBoolean(value: ConfigValue): value is boolean {
  return typeof value === 'boolean'
}

/**
 * 判断值是否为数组
 */
export function isConfigArray(value: ConfigValue): value is ConfigArray {
  return Array.isArray(value)
}

/**
 * 判断值是否为对象（非数组、非 null）
 */
export function isConfigObject(value: ConfigValue): value is ConfigObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * 判断值是否为原始类型（非复合类型）
 */
export function isPrimitiveConfigValue(value: ConfigValue): value is PrimitiveConfigValue {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value)
}

// ============================================
// 配置字段类型枚举
// ============================================

/**
 * 配置字段类型枚举
 * 与 ConfigValue 类型一一对应
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'list' | 'object' | 'null'

/**
 * 字段类型到 TypeScript 类型的映射
 */
export type FieldTypeToType<T extends FieldType> = T extends 'string'
  ? string
  : T extends 'number'
    ? number
    : T extends 'boolean'
      ? boolean
      : T extends 'list'
        ? ConfigArray
        : T extends 'object'
          ? ConfigObject
          : null

/**
 * 根据值获取字段类型
 */
export function getFieldType(value: ConfigValue): FieldType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'list'
  if (typeof value === 'object') return 'object'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  return 'string'
}

// ============================================
// 其他类型定义
// ============================================

/**
 * 字段输入类型
 */
export type InputType = 'text' | 'color' | 'material' | 'ip' | 'port' | 'textarea' | 'number'

/**
 * 时间单位
 */
export type TimeUnit = 'ticks' | 'seconds' | 'minutes' | 'milliseconds'

/**
 * 字段元数据 - 用于提供参数说明和输入提示
 */
export interface FieldMetadata {
  /** 字段说明（中文） */
  description?: string
  /** 默认值 */
  defaultValue?: ConfigValue
  /** 最小值（数字类型） */
  min?: number
  /** 最大值（数字类型） */
  max?: number
  /** 枚举值列表 */
  enum?: string[]
  /** 时间单位 */
  unit?: TimeUnit
  /** 输入类型提示 */
  inputType?: InputType
  /** 是否必填 */
  required?: boolean
  /** 正则验证模式 */
  pattern?: string
  /** 示例值 */
  example?: string
}

/**
 * 配置节点 - 表示配置文件中的单个配置项
 */
export interface ConfigNode {
  /** 配置键名 */
  key: string
  /** 配置值 */
  value: ConfigValue
  /** 值类型 */
  type: FieldType
  /** 字段元数据 */
  metadata?: FieldMetadata
  /** 完整路径（如 server.port） */
  path: string
  /** 是否被修改 */
  modified?: boolean
  /** 子节点（type 为 object 或 list 时） */
  children?: ConfigNode[]
}

/**
 * 配置文件类型
 */
export type ConfigFileType = 'properties' | 'yaml' | 'toml' | 'json'

/**
 * 配置文件信息
 */
export interface ConfigFile {
  /** 文件完整路径 */
  path: string
  /** 文件名 */
  name: string
  /** 文件类型 */
  type: ConfigFileType
  /** 文件大小（字节） */
  size: number
  /** 最后修改时间 */
  lastModified: string
  /** 是否有未保存的更改 */
  hasUnsavedChanges?: boolean
  /** 相对路径（相对于服务端根目录） */
  relativePath?: string
}

/**
 * 备份信息
 */
export interface Backup {
  /** 备份 ID */
  id: string
  /** 原文件路径 */
  originalPath: string
  /** 备份文件路径 */
  backupPath: string
  /** 创建时间 */
  createdAt: string
  /** 文件大小（字节） */
  size: number
  /** 备份描述 */
  description?: string
}

/**
 * 文件树节点
 */
export interface FileTreeNode {
  /** 节点名称 */
  name: string
  /** 节点路径 */
  path: string
  /** 是否为文件夹 */
  isDirectory: boolean
  /** 文件信息（如果是文件） */
  file?: ConfigFile
  /** 子节点 */
  children?: FileTreeNode[]
  /** 文件类型（如果是文件） */
  fileType?: ConfigFileType
}

/**
 * 分类后的文件
 */
export interface CategorizedFiles {
  /** 服务器核心配置 */
  serverConfigs: ConfigFile[]
  /** 插件配置 */
  pluginConfigs: ConfigFile[]
  /** 模组配置 */
  modConfigs: ConfigFile[]
  /** 其他配置 */
  otherConfigs: ConfigFile[]
}

/**
 * 最近打开的服务端
 */
export interface RecentServer {
  /** 服务端路径 */
  path: string
  /** 服务端名称（从目录名获取） */
  name: string
  /** 最后打开时间 */
  lastOpened: string
}
