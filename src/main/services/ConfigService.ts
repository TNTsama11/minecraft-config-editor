import * as yaml from 'js-yaml'
import * as TOML from '@iarna/toml'
import * as path from 'path'
import type { ConfigNode, ConfigValue, FieldType, ConfigFileType, FieldMetadata } from '../../common/types'
import { getFieldType } from '../../common/types'
import { ConfigParseError, ConfigSerializeError, ErrorCode, logError } from '../../common/errors'

export class ConfigService {
  /**
   * 判断是否为注释键
   * 统一处理所有格式的注释键判断逻辑
   */
  private static isCommentKey(key: string): boolean {
    return key.startsWith('//') || key.startsWith('#') || key.startsWith('_comment')
  }

  /**
   * 判断是否为空键
   */
  private static isEmptyKey(key: string): boolean {
    return !key || !key.trim()
  }

  /**
   * 解析配置文件
   */
  static parse(filePath: string, content: string): ConfigNode[] {
    const ext = path.extname(filePath).toLowerCase()

    switch (ext) {
      case '.properties':
      case '.txt':
        return this.parseProperties(content)
      case '.yml':
      case '.yaml':
        return this.parseYaml(content, filePath)
      case '.toml':
        return this.parseToml(content, filePath)
      case '.json':
        return this.parseJson(content, filePath)
      default:
        throw new ConfigParseError(filePath, ext, { details: { ext } })
    }
  }

  /**
   * 序列化配置数据
   */
  static serialize(type: ConfigFileType, nodes: ConfigNode[]): string {
    // 将节点数组转换为对象
    const data = this.nodesToObject(nodes)

    switch (type) {
      case 'properties':
        return this.serializeProperties(data)
      case 'yaml':
        return this.serializeYaml(data)
      case 'toml':
        return this.serializeToml(data)
      case 'json':
        return this.serializeJson(data)
      default:
        throw new ConfigSerializeError(type, { details: { type } })
    }
  }

  /**
   * 解析 Properties 文件
   */
  private static parseProperties(content: string): ConfigNode[] {
    const nodes: ConfigNode[] = []
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // 跳过空行和注释行
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
        continue
      }

      // 跳过看起来像注释的行（以 // 开头）
      if (trimmed.startsWith('//')) {
        continue
      }

      // 解析键值对
      const separatorIndex = trimmed.search(/[=:]/)
      if (separatorIndex === -1) continue

      const key = trimmed.substring(0, separatorIndex).trim()

      // 跳过以注释符号开头的键
      if (key.startsWith('#') || key.startsWith('//') || key.startsWith('!')) {
        continue
      }

      let value = trimmed.substring(separatorIndex + 1).trim()

      // 移除行内注释（# 后面的内容，但要考虑引号内的 #）
      value = this.removeInlineComment(value)

      // 处理转义字符
      value = this.unescapePropertiesValue(value)

      const node = this.createConfigNode(key, value, key)
      nodes.push(node)
    }

    return nodes
  }

  /**
   * 移除行内注释
   */
  private static removeInlineComment(value: string): string {
    let inSingleQuote = false
    let inDoubleQuote = false
    let i = 0

    while (i < value.length) {
      const char = value[i]
      const nextChar = value[i + 1]

      if (char === '\\' && (nextChar === '"' || nextChar === "'")) {
        i += 2
        continue
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote
      } else if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote
      } else if (!inSingleQuote && !inDoubleQuote) {
        if (char === '#') {
          return value.substring(0, i).trim()
        }
        if (char === '/' && nextChar === '/') {
          return value.substring(0, i).trim()
        }
      }
      i++
    }

    return value
  }

  /**
   * 解析 YAML 文件
   */
  private static parseYaml(content: string, filePath?: string): ConfigNode[] {
    try {
      const data = yaml.load(content)
      if (typeof data !== 'object' || data === null) {
        return []
      }
      return this.objectToNodes(data as Record<string, ConfigValue>, '')
    } catch (error) {
      const yamlError = error as yaml.YAMLException
      logError(
        new ConfigParseError(filePath || 'unknown', 'yaml', {
          cause: error as Error,
          line: yamlError.mark?.line,
          column: yamlError.mark?.column
        }),
        'parseYaml'
      )
      return []
    }
  }

  /**
   * 解析 TOML 文件（支持注释元数据）
   */
  private static parseToml(content: string, filePath?: string): ConfigNode[] {
    try {
      const lines = content.split('\n')
      const nodes: ConfigNode[] = []
      const metadataMap = new Map<string, FieldMetadata>()

      let currentSection = ''
      let pendingComments: string[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        // 空行
        if (!line) {
          pendingComments = []
          continue
        }

        // 注释行 - 收集注释
        if (line.startsWith('#')) {
          pendingComments.push(line.substring(1).trim())
          continue
        }

        // 节标题 [section] 或 [section.subsection]
        if (line.startsWith('[') && line.endsWith(']')) {
          currentSection = line.substring(1, line.length - 1).trim()
          pendingComments = []
          continue
        }

        // 键值对
        const eqIndex = line.indexOf('=')
        if (eqIndex === -1) continue

        const key = line.substring(0, eqIndex).trim()
        let value = line.substring(eqIndex + 1).trim()

        // 解析值
        const parsedValue = this.parseTomlValue(value)
        const fullKey = currentSection ? `${currentSection}.${key}` : key

        // 解析注释中的元数据
        const metadata = this.parseTomlComments(pendingComments)
        if (Object.keys(metadata).length > 0) {
          metadataMap.set(fullKey, metadata)
        }

        // 创建节点
        const node = this.createConfigNode(key, parsedValue, fullKey)
        node.metadata = metadata

        // 如果是顶级节点，添加到 nodes
        if (!currentSection.includes('.')) {
          if (currentSection === '') {
            nodes.push(node)
          } else {
            // 添加到对应的 section
            let sectionNode = nodes.find(n => n.key === currentSection.split('.')[0])
            if (!sectionNode) {
              sectionNode = {
                key: currentSection.split('.')[0],
                value: {},
                type: 'object',
                path: currentSection.split('.')[0],
                children: []
              }
              nodes.push(sectionNode)
            }
            if (!sectionNode.children) sectionNode.children = []

            // 处理嵌套 section
            const sectionParts = currentSection.split('.')
            if (sectionParts.length === 1) {
              sectionNode.children.push(node)
            } else {
              // 深度嵌套
              let targetNode = sectionNode
              for (let j = 1; j < sectionParts.length; j++) {
                let childNode = targetNode.children?.find(n => n.key === sectionParts[j])
                if (!childNode) {
                  childNode = {
                    key: sectionParts[j],
                    value: {},
                    type: 'object',
                    path: `${targetNode.path}.${sectionParts[j]}`,
                    children: []
                  }
                  targetNode.children = targetNode.children || []
                  targetNode.children.push(childNode)
                }
                targetNode = childNode
              }
              targetNode.children = targetNode.children || []
              targetNode.children.push(node)
            }
          }
        }

        pendingComments = []
      }

      // 如果没有复杂的 section 结构，使用标准解析
      if (nodes.length === 0) {
        const data = TOML.parse(content)
        return this.objectToNodes(data as Record<string, ConfigValue>, '')
      }

      return nodes
    } catch (error) {
      logError(
        new ConfigParseError(filePath || 'unknown', 'toml', { cause: error as Error }),
        'parseToml'
      )
      return []
    }
  }

  /**
   * 解析 TOML 值
   */
  private static parseTomlValue(value: string): ConfigValue {
    // 移除行内注释
    const commentIndex = value.indexOf(' #')
    if (commentIndex !== -1) {
      value = value.substring(0, commentIndex).trim()
    }

    // 布尔值
    if (value === 'true') return true
    if (value === 'false') return false

    // 数字
    if (/^-?\d+$/.test(value)) return parseInt(value, 10)
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value)

    // 字符串（移除引号）
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.substring(1, value.length - 1)
    }

    // 数组
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }

    return value
  }

  /**
   * 解析 TOML 注释中的元数据
   */
  private static parseTomlComments(comments: string[]): FieldMetadata {
    const metadata: FieldMetadata = {}
    const descriptions: string[] = []

    for (const comment of comments) {
      // 解析默认值: # Default: xxx
      const defaultMatch = comment.match(/^Default:\s*(.+)$/i)
      if (defaultMatch) {
        const defaultVal = defaultMatch[1].trim()
        metadata.defaultValue = this.parseTomlValue(defaultVal)
        continue
      }

      // 解析取值范围: # Range: xxx ~ xxx 或 # Range: xxx - xxx
      const rangeMatch = comment.match(/^Range:\s*([\d.-]+)\s*[~-]\s*([\d.-]+)$/i)
      if (rangeMatch) {
        metadata.min = parseFloat(rangeMatch[1])
        metadata.max = parseFloat(rangeMatch[2])
        continue
      }

      // 其他注释作为描述
      if (comment && !comment.startsWith('Range:') && !comment.startsWith('Default:')) {
        descriptions.push(comment)
      }
    }

    if (descriptions.length > 0) {
      metadata.description = descriptions.join(' ')
    }

    return metadata
  }

  /**
   * 解析 JSON 文件（支持注释元数据）
   */
  private static parseJson(content: string, filePath?: string): ConfigNode[] {
    try {
      // 预处理：移除 JSON 中的注释
      const cleanedContent = this.stripJsonComments(content)
      const data = JSON.parse(cleanedContent)
      if (typeof data !== 'object' || data === null) {
        return []
      }
      return this.parseJsonWithMetadata(data as Record<string, ConfigValue>, '')
    } catch (error) {
      const syntaxError = error as SyntaxError
      // 尝试从错误消息中提取行号
      const lineMatch = syntaxError.message.match(/position\s+(\d+)/)
      const position = lineMatch ? parseInt(lineMatch[1]) : undefined

      logError(
        new ConfigParseError(filePath || 'unknown', 'json', {
          cause: error as Error,
          line: position
        }),
        'parseJson'
      )
      return []
    }
  }

  /**
   * 解析带元数据的 JSON 对象
   */
  private static parseJsonWithMetadata(
    obj: Record<string, ConfigValue>,
    parentPath: string
  ): ConfigNode[] {
    const nodes: ConfigNode[] = []

    for (const [key, value] of Object.entries(obj)) {
      // 跳过注释键
      if (key === '//') continue
      if (key === '//default') continue
      if (key === '//range') continue
      if (this.isCommentKey(key)) continue

      const path = parentPath ? `${parentPath}.${key}` : key

      // 收集元数据
      const metadata: FieldMetadata = {}
      const siblingKeys = Object.keys(obj)

      // 查找 // 注释
      if (siblingKeys.includes('//')) {
        const comment = obj['//']
        if (typeof comment === 'string') {
          metadata.description = comment
        }
      }

      // 查找 //default
      if (siblingKeys.includes('//default')) {
        const defaultVal = obj['//default']
        metadata.defaultValue = defaultVal as ConfigValue
      }

      const node = this.createConfigNode(key, value, path)
      node.metadata = Object.keys(metadata).length > 0 ? metadata : undefined

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // 递归处理嵌套对象
        node.children = this.parseJsonWithMetadata(value as Record<string, ConfigValue>, path)
      }

      nodes.push(node)
    }

    return nodes
  }

  /**
   * 移除 JSON 中的注释
   */
  private static stripJsonComments(content: string): string {
    let result = ''
    let i = 0
    let inString = false
    let stringChar = ''

    while (i < content.length) {
      const char = content[i]
      const nextChar = content[i + 1]

      if (!inString && (char === '"' || char === "'")) {
        inString = true
        stringChar = char
        result += char
        i++
        continue
      }

      if (inString) {
        if (char === '\\' && i + 1 < content.length) {
          result += char + nextChar
          i += 2
          continue
        }
        if (char === stringChar) {
          inString = false
          stringChar = ''
        }
        result += char
        i++
        continue
      }

      if (char === '/' && nextChar === '/') {
        while (i < content.length && content[i] !== '\n') {
          i++
        }
        continue
      }

      if (char === '/' && nextChar === '*') {
        i += 2
        while (i < content.length - 1) {
          if (content[i] === '*' && content[i + 1] === '/') {
            i += 2
            break
          }
          i++
        }
        continue
      }

      result += char
      i++
    }

    return result
  }

  /**
   * 序列化为 Properties 格式
   */
  private static serializeProperties(data: Record<string, ConfigValue>): string {
    const lines: string[] = []

    const serializeValue = (obj: Record<string, ConfigValue>, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        if (this.isCommentKey(key)) continue

        const fullKey = prefix ? `${prefix}.${key}` : key

        if (value === null) {
          lines.push(`${fullKey}=`)
        } else if (Array.isArray(value)) {
          const listValue = value.map((v) => String(v)).join(',')
          lines.push(`${fullKey}=${this.escapePropertiesValue(listValue)}`)
        } else if (typeof value === 'object') {
          serializeValue(value as Record<string, ConfigValue>, fullKey)
        } else {
          lines.push(`${fullKey}=${this.escapePropertiesValue(String(value))}`)
        }
      }
    }

    serializeValue(data)
    return lines.join('\n') + '\n'
  }

  /**
   * 序列化为 YAML 格式
   */
  private static serializeYaml(data: Record<string, ConfigValue>): string {
    const filteredData = this.filterComments(data)
    return yaml.dump(filteredData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    })
  }

  /**
   * 序列化为 TOML 格式
   */
  private static serializeToml(data: Record<string, ConfigValue>): string {
    const filteredData = this.filterComments(data)
    return TOML.stringify(filteredData as unknown as Record<string, string | number | boolean | null | Record<string, unknown> | unknown[]>)
  }

  /**
   * 序列化为 JSON 格式
   */
  private static serializeJson(data: Record<string, ConfigValue>): string {
    const filteredData = this.filterComments(data)
    return JSON.stringify(filteredData, null, 2)
  }

  /**
   * 过滤掉注释键
   */
  private static filterComments(obj: ConfigValue): ConfigValue {
    if (obj === null || typeof obj !== 'object') return obj

    if (Array.isArray(obj)) {
      return obj.map((item) => this.filterComments(item))
    }

    const result: Record<string, ConfigValue> = {}
    for (const [key, value] of Object.entries(obj as Record<string, ConfigValue>)) {
      if (this.isCommentKey(key)) continue
      result[key] = this.filterComments(value)
    }
    return result
  }

  /**
   * 将对象转换为配置节点数组
   */
  private static objectToNodes(
    obj: Record<string, ConfigValue>,
    parentPath: string
  ): ConfigNode[] {
    const nodes: ConfigNode[] = []

    for (const [key, value] of Object.entries(obj)) {
      if (this.isCommentKey(key)) continue
      if (this.isEmptyKey(key)) continue

      const path = parentPath ? `${parentPath}.${key}` : key
      const node = this.createConfigNode(key, value, path)

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        node.children = this.objectToNodes(value as Record<string, ConfigValue>, path)
      }

      nodes.push(node)
    }

    return nodes
  }

  /**
   * 创建配置节点
   */
  private static createConfigNode(key: string, value: ConfigValue, path: string): ConfigNode {
    const type = this.getValueType(value)

    let children: ConfigNode[] | undefined
    if (Array.isArray(value)) {
      children = value.map((item, index) => ({
        key: String(index),
        value: item,
        type: this.getValueType(item),
        path: `${path}[${index}]`
      }))
    }

    return { key, value, type, path, children }
  }

  /**
   * 获取值的类型（使用统一的类型工具函数）
   */
  private static getValueType(value: ConfigValue): FieldType {
    if (value === undefined) return 'null'
    return getFieldType(value)
  }

  /**
   * 将配置节点数组转换为对象
   */
  private static nodesToObject(nodes: ConfigNode[]): Record<string, ConfigValue> {
    const result: Record<string, ConfigValue> = {}

    for (const node of nodes) {
      this.setNestedValue(result, node.path, node.value, node.type, node.children)
    }

    return result
  }

  /**
   * 设置嵌套值
   */
  private static setNestedValue(
    obj: Record<string, ConfigValue>,
    path: string,
    value: ConfigValue,
    type: FieldType,
    children?: ConfigNode[]
  ): void {
    const parts = path.split('.')
    let current: Record<string, ConfigValue> = obj

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!(part in current)) {
        current[part] = {}
      }
      current = current[part] as Record<string, ConfigValue>
    }

    const lastKey = parts[parts.length - 1]

    if (type === 'object' && children) {
      current[lastKey] = {}
      for (const child of children) {
        this.setNestedValue(
          current[lastKey] as Record<string, ConfigValue>,
          child.key,
          child.value,
          child.type,
          child.children
        )
      }
    } else if (type === 'list' && children) {
      current[lastKey] = children.map((c) => c.value)
    } else {
      current[lastKey] = value
    }
  }

  /**
   * 转义 Properties 值
   */
  private static escapePropertiesValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  }

  /**
   * 反转义 Properties 值
   */
  private static unescapePropertiesValue(value: string): string {
    return value
      .replace(/\\\\/g, '\x00')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\x00/g, '\\')
  }
}
