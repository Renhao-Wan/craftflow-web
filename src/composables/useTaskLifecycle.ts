import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { usePolling } from './usePolling'
import { createTask } from '@/api/creation'
import { createPolishingTask } from '@/api/polishing'
import { resumeTask as resumeTaskApi } from '@/api/creation'
import { getTaskStatus } from '@/api/tasks'
import type { TaskStatusResponse } from '@/api/types/task'
import type { ResumeAction } from '@/api/types/resume'
import type { PolishingMode } from '@/api/types/polishing'

/** 轮询间隔（毫秒） */
const POLL_INTERVAL = 3_000

/** 任务类型 */
export type TaskType = 'creation' | 'polishing'

/** 生命周期 Composable 返回值 */
export interface UseTaskLifecycleReturn {
  /** 提交创作任务 */
  submitCreation: (topic: string, description?: string) => Promise<void>
  /** 提交润色任务 */
  submitPolishing: (content: string, mode: PolishingMode) => Promise<void>
  /** HITL 恢复执行 */
  resumeTask: (taskId: string, action: ResumeAction, data?: Record<string, unknown>) => Promise<void>
  /** 加载指定任务状态并开始轮询 */
  loadTask: (taskId: string) => Promise<void>
  /** 停止轮询 */
  stop: () => void
  /** 是否正在提交 */
  submitting: ReturnType<typeof ref<boolean>>
  /** 提交错误 */
  submitError: ReturnType<typeof ref<string | null>>
  /** 是否正在轮询 */
  isPolling: ReturnType<typeof ref<boolean>>
  /** 轮询错误 */
  pollError: ReturnType<typeof ref<Error | null>>
  /** 当前任务类型 */
  taskType: ReturnType<typeof ref<TaskType | null>>
}

/**
 * 任务生命周期 Composable
 *
 * 封装 任务提交 → 轮询 → 中断 → 恢复 的完整流程。
 * 组件只需调用 submit/resume 方法，其余逻辑由 composable 管理。
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { submitCreation, isPolling } = useTaskLifecycle()
 *
 * async function onSubmit() {
 *   await submitCreation('主题', '描述')
 *   // 自动跳转到详情页并开始轮询
 * }
 * </script>
 * ```
 */
export function useTaskLifecycle(): UseTaskLifecycleReturn {
  const router = useRouter()
  const taskStore = useTaskStore()

  const submitting = ref(false)
  const submitError = ref<string | null>(null)
  const taskType = ref<TaskType | null>(null)

  // 创建轮询实例
  const { start, stop, isActive: isPolling, error: pollError } = usePolling<TaskStatusResponse>({
    pollFn: async () => {
      const taskId = taskStore.currentTask?.task_id
      if (!taskId) throw new Error('无活跃任务')
      return getTaskStatus(taskId)
    },
    interval: POLL_INTERVAL,
    shouldStop: (result) => result.status === 'completed' || result.status === 'failed',
    onResult: (result) => {
      taskStore.setCurrentTask(result)
    },
    onError: (err) => {
      console.error('[useTaskLifecycle] 轮询失败:', err.message)
    },
  })

  /** 提交任务后跳转并开始轮询 */
  async function handleSubmit(taskId: string, type: TaskType): Promise<void> {
    taskType.value = type

    // 先查询一次任务状态
    const status = await taskStore.fetchTaskStatus(taskId)

    // 跳转到详情页
    if (type === 'creation') {
      await router.push({ name: 'task-detail', params: { taskId } })
    } else {
      await router.push({ name: 'polishing-result', params: { taskId } })
    }

    // 如果任务未结束，开始轮询
    if (status.status === 'running' || status.status === 'interrupted') {
      start()
    }
  }

  /** 提交创作任务 */
  async function submitCreation(topic: string, description?: string): Promise<void> {
    submitting.value = true
    submitError.value = null
    try {
      const response = await createTask({ topic, description })
      taskStore.setCurrentTask({
        task_id: response.task_id,
        status: response.status,
        created_at: response.created_at,
      })
      await handleSubmit(response.task_id, 'creation')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '提交创作任务失败'
      submitError.value = message
      throw err
    } finally {
      submitting.value = false
    }
  }

  /** 提交润色任务 */
  async function submitPolishing(content: string, mode: PolishingMode): Promise<void> {
    submitting.value = true
    submitError.value = null
    try {
      const response = await createPolishingTask({ content, mode })
      taskStore.setCurrentTask({
        task_id: response.task_id,
        status: response.status,
        created_at: response.created_at,
      })
      await handleSubmit(response.task_id, 'polishing')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '提交润色任务失败'
      submitError.value = message
      throw err
    } finally {
      submitting.value = false
    }
  }

  /** HITL 恢复执行 */
  async function resumeTask(
    taskId: string,
    action: ResumeAction,
    data?: Record<string, unknown>,
  ): Promise<void> {
    submitting.value = true
    submitError.value = null
    try {
      stop() // 先停止当前轮询
      const response = await resumeTaskApi(taskId, { action, data })
      taskStore.setCurrentTask({
        task_id: response.task_id,
        status: response.status,
        created_at: response.created_at,
      })
      // 恢复后重新开始轮询
      start()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '恢复任务失败'
      submitError.value = message
      throw err
    } finally {
      submitting.value = false
    }
  }

  /** 加载指定任务状态并开始轮询 */
  async function loadTask(taskId: string): Promise<void> {
    const status = await taskStore.fetchTaskStatus(taskId)
    if (status.status === 'running' || status.status === 'interrupted') {
      start()
    }
  }

  return {
    submitCreation,
    submitPolishing,
    resumeTask,
    loadTask,
    stop,
    submitting,
    submitError,
    isPolling,
    pollError,
    taskType,
  }
}
