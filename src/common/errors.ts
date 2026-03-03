// ============================================
// 统一错误处理系统
// ============================================

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // 文件系统错误
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',

  // 配置解析错误
  PARSE_ERROR = 'PARSE_ERROR',
  SERIALIZE_ERROR = 'SERIALIZE_ERROR',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',

  // 验证错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_VALUE = 'INVALID_VALUE',

  // 备份错误
  BACKUP_CREATE_ERROR = 'BACKUP_CREATE_ERROR',
  BACKUP_RESTORE_ERROR = 'BACKUP_RESTORE_ERROR',
  BACKUP_NOT_FOUND = 'BACKUP_NOT_FOUND',

  // 元数据错误
  METADATA_ERROR = 'METADATA_ERROR',

  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 基础应用错误类
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly details?: Record<string, unknown>
  public readonly timestamp: Date
  public readonly cause?: Error

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      details?: Record<string, unknown>
      cause?: Error
    }
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = options?.details
    this.timestamp = new Date()
    this.cause = options?.cause

    // 保持正确的原型链
    Object.setPrototypeOf(this, new.target.prototype)
  }

  /**
   * 转换为可序列化的对象（用于 IPC 传输）
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      cause: this.cause?.message
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    return this.message
  }
}

/**
 * 文件系统错误
 */
export class FileSystemError extends AppError {
  constructor(
    code: ErrorCode,
    filePath: string,
    operation: string,
    options?: { cause?: Error; details?: Record<string, unknown> }
  ) {
    super(code, `文件操作失败: ${operation} "${filePath}"`, {
      ...options,
      details: { filePath, operation, ...options?.details }
    })
    this.name = 'FileSystemError'
  }

  getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.FILE_NOT_FOUND:
        return `文件不存在: ${this.details?.filePath}`
      case ErrorCode.FILE_READ_ERROR:
        return `无法读取文件: ${this.details?.filePath}`
      case ErrorCode.FILE_WRITE_ERROR:
        return `无法写入文件: ${this.details?.filePath}`
      default:
        return this.message
    }
  }
}

/**
 * 配置解析错误
 */
export class ConfigParseError extends AppError {
  public readonly filePath: string
  public readonly line?: number
  public readonly column?: number

  constructor(
    filePath: string,
    format: string,
    options?: {
      cause?: Error
      line?: number
      column?: number
      details?: Record<string, unknown>
    }
  ) {
    let message = `配置文件解析失败: ${filePath}`
    if (options?.line) {
      message += ` (行 ${options.line}${options.column ? `, 列 ${options.column}` : ''})`
    }

    super(ErrorCode.PARSE_ERROR, message, {
      ...options,
      details: { filePath, format, line: options?.line, column: options?.column, ...options?.details }
    })
    this.name = 'ConfigParseError'
    this.filePath = filePath
    this.line = options?.line
    this.column = options?.column
  }

  getUserMessage(): string {
    return `配置文件格式错误，请检查文件内容是否正确。文件: ${this.filePath}`
  }
}

/**
 * 配置序列化错误
 */
export class ConfigSerializeError extends AppError {
  constructor(
    format: string,
    options?: { cause?: Error; details?: Record<string, unknown> }
  ) {
    super(ErrorCode.SERIALIZE_ERROR, `配置序列化失败: ${format} 格式`, options)
    this.name = 'ConfigSerializeError'
  }

  getUserMessage(): string {
    return '配置保存失败，数据格式可能存在问题'
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  public readonly field: string
  public readonly value: unknown

  constructor(
    field: string,
    value: unknown,
    reason: string,
    options?: { details?: Record<string, unknown> }
  ) {
    super(ErrorCode.VALIDATION_ERROR, `字段 "${field}" 验证失败: ${reason}`, {
      ...options,
      details: { field, value, reason, ...options?.details }
    })
    this.name = 'ValidationError'
    this.field = field
    this.value = value
  }

  getUserMessage(): string {
    return `字段 "${this.field}" 的值无效`
  }
}

/**
 * 备份错误
 */
export class BackupError extends AppError {
  constructor(
    code: ErrorCode.BACKUP_CREATE_ERROR | ErrorCode.BACKUP_RESTORE_ERROR | ErrorCode.BACKUP_NOT_FOUND,
    filePath: string,
    options?: { cause?: Error; details?: Record<string, unknown> }
  ) {
    const operation = code === ErrorCode.BACKUP_CREATE_ERROR ? '创建' :
                      code === ErrorCode.BACKUP_RESTORE_ERROR ? '恢复' : '查找'
    super(code, `备份${operation}失败: ${filePath}`, {
      ...options,
      details: { filePath, ...options?.details }
    })
    this.name = 'BackupError'
  }

  getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.BACKUP_CREATE_ERROR:
        return '创建备份失败，请检查磁盘空间'
      case ErrorCode.BACKUP_RESTORE_ERROR:
        return '恢复备份失败，备份文件可能已损坏'
      case ErrorCode.BACKUP_NOT_FOUND:
        return '未找到备份文件'
      default:
        return this.message
    }
  }
}

// ============================================
// 错误处理工具函数
// ============================================

/**
 * 将未知错误转换为 AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(ErrorCode.UNKNOWN_ERROR, error.message, { cause: error })
  }

  return new AppError(ErrorCode.UNKNOWN_ERROR, String(error))
}

/**
 * 判断是否为 AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * 从 IPC 响应中恢复错误对象
 */
export function deserializeError(data: Record<string, unknown>): AppError {
  const { code, message, details, cause } = data
  return new AppError(code as ErrorCode, message as string, {
    details: details as Record<string, unknown> | undefined,
    cause: cause ? new Error(cause as string) : undefined
  })
}

/**
 * 错误日志记录器
 */
export function logError(error: AppError, context?: string): void {
  const logData = {
    timestamp: error.timestamp.toISOString(),
    code: error.code,
    message: error.message,
    details: error.details,
    context,
    stack: error.stack,
    cause: error.cause?.stack
  }

  // 在开发环境下输出详细日志
  if (process.env.NODE_ENV === 'development') {
    console.error('[AppError]', JSON.stringify(logData, null, 2))
  } else {
    console.error(`[${error.code}] ${error.message}`)
  }
}
