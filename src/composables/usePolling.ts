import { ref, onUnmounted } from 'vue'

/** 指数退避配置 */
const BASE_DELAY = 2_000   // 初始延迟 2s
const MAX_DELAY = 30_000   // 最大延迟 30s
const MAX_RETRIES = 5      // 最大重试次数

/** 轮询选项 */
export interface UsePollingOptions<T> {
  /** 轮询函数 */
  pollFn: () => Promise<T>
  /** 轮询间隔（毫秒） */
  interval: number
  /** 判断是否应停止轮询 */
  shouldStop: (result: T) => boolean
  /** 轮询成功回调（可选） */
  onResult?: (result: T) => void
  /** 轮询失败回调（可选） */
  onError?: (error: Error) => void
}

/** 轮询 Composable 返回值 */
export interface UsePollingReturn<T> {
  /** 开始轮询 */
  start: () => void
  /** 停止轮询 */
  stop: () => void
  /** 是否正在轮询 */
  isActive: Readonly<ReturnType<typeof ref<boolean>>>
  /** 最近一次轮询结果 */
  lastResult: Readonly<ReturnType<typeof ref<T | null>>>
  /** 最近一次错误 */
  error: Readonly<ReturnType<typeof ref<Error | null>>>
  /** 当前重试次数 */
  retryCount: Readonly<ReturnType<typeof ref<number>>>
}

/**
 * 通用轮询 Composable
 *
 * 支持启动/停止、指数退避、最大重试、组件卸载自动清理。
 *
 * @example
 * ```ts
 * const { start, stop, isActive, lastResult } = usePolling({
 *   pollFn: () => getTaskStatus(taskId),
 *   interval: 3000,
 *   shouldStop: (res) => res.status === 'completed' || res.status === 'failed',
 * })
 * ```
 */
export function usePolling<T>(options: UsePollingOptions<T>): UsePollingReturn<T> {
  const { pollFn, interval, shouldStop, onResult, onError } = options

  const isActive = ref(false)
  const lastResult = ref<T | null>(null) as ReturnType<typeof ref<T | null>>
  const error = ref<Error | null>(null) as ReturnType<typeof ref<Error | null>>
  const retryCount = ref(0)

  let timerId: ReturnType<typeof setTimeout> | null = null
  let isCleanedUp = false

  /** 计算指数退避延迟 */
  function getBackoffDelay(): number {
    const delay = BASE_DELAY * Math.pow(2, retryCount.value)
    return Math.min(delay, MAX_DELAY)
  }

  /** 清理定时器 */
  function clearTimer(): void {
    if (timerId !== null) {
      clearTimeout(timerId)
      timerId = null
    }
  }

  /** 执行单次轮询 */
  async function executePoll(): Promise<void> {
    if (isCleanedUp || !isActive.value) return

    try {
      const result = await pollFn()
      if (isCleanedUp || !isActive.value) return

      lastResult.value = result
      error.value = null
      retryCount.value = 0
      onResult?.(result)

      // 检查是否应停止
      if (shouldStop(result)) {
        stop()
        return
      }

      // 继续轮询
      scheduleNext(interval)
    } catch (err: unknown) {
      if (isCleanedUp || !isActive.value) return

      const pollingError = err instanceof Error ? err : new Error(String(err))
      error.value = pollingError
      retryCount.value++
      onError?.(pollingError)

      // 超过最大重试次数则停止
      if (retryCount.value >= MAX_RETRIES) {
        stop()
        return
      }

      // 指数退避后重试
      const delay = getBackoffDelay()
      scheduleNext(delay)
    }
  }

  /** 调度下一次轮询 */
  function scheduleNext(delay: number): void {
    clearTimer()
    timerId = setTimeout(executePoll, delay)
  }

  /** 开始轮询 */
  function start(): void {
    if (isActive.value) return

    isActive.value = true
    error.value = null
    retryCount.value = 0
    executePoll()
  }

  /** 停止轮询 */
  function stop(): void {
    isActive.value = false
    clearTimer()
  }

  // 组件卸载时自动清理
  onUnmounted(() => {
    isCleanedUp = true
    stop()
  })

  return {
    start,
    stop,
    isActive,
    lastResult,
    error,
    retryCount,
  }
}
