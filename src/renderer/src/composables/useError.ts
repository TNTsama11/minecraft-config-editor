import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { AppError, isAppError, ErrorCode } from '../../../common/errors'

/**
 * 错误状态接口
 */
export interface ErrorState {
  hasError: boolean
  error: AppError | null
  message: string
}

/**
 * 错误处理 composable
 * 提供统一的错误处理和用户提示
 */
export function useError() {
  const errorState: Ref<ErrorState> = ref({
    hasError: false,
    error: null,
    message: ''
  })

  /**
   * 处理错误
   * @param error 捕获的错误
   * @param showToMessage 是否显示消息提示（默认 true）
   */
  function handleError(error: unknown, showMessage = true): void {
    const appError = isAppError(error) ? error : new AppError(
      ErrorCode.UNKNOWN_ERROR,
      error instanceof Error ? error.message : String(error),
      { cause: error instanceof Error ? error : undefined }
    )

    errorState.value = {
      hasError: true,
      error: appError,
      message: appError.getUserMessage()
    }

    if (showMessage) {
      showError(appError)
    }

    // 开发模式下输出详细错误
    if (import.meta.env.DEV) {
      console.error('[Error]', appError)
    }
  }

  /**
   * 显示错误消息
   */
  function showError(err: AppError): void {
    const duration = getErrorDuration(err)
    ElMessage({
      type: 'error',
      message: err.getUserMessage(),
      duration,
      showClose: true
    })
  }

  /**
   * 清除错误状态
   */
  function clearError(): void {
    errorState.value = {
      hasError: false,
      error: null,
      message: ''
    }
  }

  /**
   * 包装异步函数，自动处理错误
   */
  function wrapAsync<T>(
    fn: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void
      onError?: (error: AppError) => void
      showMessage?: boolean
    }
  ): () => Promise<T | null> {
    return async () => {
      try {
        clearError()
        const result = await fn()
        options?.onSuccess?.(result)
        return result
      } catch (error) {
        handleError(error, options?.showMessage !== false)
        if (isAppError(error)) {
          options?.onError?.(error)
        }
        return null
      }
    }
  }

  return {
    errorState,
    handleError,
    showError,
    clearError,
    wrapAsync,
    isAppError
  }
}

/**
 * 根据错误类型确定消息显示时长
 */
function getErrorDuration(error: AppError): number {
  // 关键错误显示更长时间
  const criticalErrors = [
    ErrorCode.FILE_NOT_FOUND,
    ErrorCode.FILE_WRITE_ERROR,
    ErrorCode.BACKUP_RESTORE_ERROR
  ]

  if (criticalErrors.includes(error.code)) {
    return 5000
  }

  return 3000
}

/**
 * 全局错误处理器 - 用于 Vue app.config.errorHandler
 */
export function setupGlobalErrorHandler(): void {
  // 可以在这里设置全局错误处理
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Rejection]', event.reason)

    if (isAppError(event.reason)) {
      ElMessage.error(event.reason.getUserMessage())
    } else {
      ElMessage.error('发生未知错误')
    }
  })
}
