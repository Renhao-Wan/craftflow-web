import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { wsClient, type WsMessage } from '@/api/wsClient'
import type { TaskStatus, TaskStatusResponse } from '@/api/types/task'

const HISTORY_KEY = 'craftflow_task_history'
const MAX_HISTORY = 20

/** 从 localStorage 加载任务历史 */
function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed as string[]
    }
    return []
  } catch {
    return []
  }
}

/** 保存任务历史到 localStorage */
function saveHistory(ids: string[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(ids))
}

/** 向历史列表添加 task_id（去重 + 限制数量） */
function appendToHistory(ids: string[], taskId: string): string[] {
  const filtered = ids.filter((id) => id !== taskId)
  const updated = [taskId, ...filtered].slice(0, MAX_HISTORY)
  saveHistory(updated)
  return updated
}

export const useTaskStore = defineStore('task', () => {
  // ─── State ──────────────────────────────────────────────
  const currentTask = ref<TaskStatusResponse | null>(null)
  const taskHistory = ref<string[]>(loadHistory())
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ─── Getters ────────────────────────────────────────────
  const isRunning = computed(() => currentTask.value?.status === 'running')
  const isInterrupted = computed(() => currentTask.value?.status === 'interrupted')
  const isCompleted = computed(() => currentTask.value?.status === 'completed')
  const isFailed = computed(() => currentTask.value?.status === 'failed')
  const isTerminal = computed(() => isCompleted.value || isFailed.value)

  // ─── Actions ────────────────────────────────────────────

  /** 通过 WebSocket 查询任务状态 */
  async function fetchTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    loading.value = true
    error.value = null
    try {
      const response = await wsClient.sendAndWait('get_task_status', { taskId })
      const statusData: TaskStatusResponse = {
        task_id: (response.taskId as string) ?? taskId,
        status: (response.status as TaskStatus) ?? 'running',
        current_node: response.currentNode as string | undefined,
        current_node_label: response.currentNodeLabel as string | undefined,
        awaiting: response.awaiting as string | undefined,
        data: response.data as Record<string, unknown> | undefined,
        result: response.result as string | undefined,
        error: response.error as string | undefined,
        progress: response.progress as number | undefined,
        created_at: response.createdAt as string | undefined,
        updated_at: response.updatedAt as string | undefined,
      }
      currentTask.value = statusData
      taskHistory.value = appendToHistory(taskHistory.value, statusData.task_id)
      return statusData
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '获取任务状态失败'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  /** 处理 WS task_update 推送 */
  function handleTaskUpdate(message: WsMessage): void {
    const taskId = message.taskId as string
    if (!taskId || !currentTask.value || currentTask.value.task_id !== taskId) return

    currentTask.value = {
      ...currentTask.value,
      status: (message.status as TaskStatus) ?? currentTask.value.status,
      current_node: (message.currentNode as string) ?? currentTask.value.current_node,
      current_node_label: (message.currentNodeLabel as string) ?? currentTask.value.current_node_label,
      awaiting: (message.awaiting as string) ?? undefined,
      data: (message.data as Record<string, unknown>) ?? currentTask.value.data,
      error: (message.error as string) ?? currentTask.value.error,
      progress: (message.progress as number) ?? currentTask.value.progress,
      updated_at: new Date().toISOString(),
    }
  }

  /** 处理 WS task_result 推送 */
  function handleTaskResult(message: WsMessage): void {
    const taskId = message.taskId as string
    if (!taskId) return

    const result = (message.result as string) ?? ''

    if (currentTask.value && currentTask.value.task_id === taskId) {
      currentTask.value = {
        ...currentTask.value,
        status: 'completed',
        result,
        progress: 100,
        updated_at: (message.updatedAt as string) ?? new Date().toISOString(),
      }
    }
  }

  /** 处理 WS task_error 推送 */
  function handleTaskError(message: WsMessage): void {
    const taskId = message.taskId as string
    if (!taskId) return

    const errorMsg = (message.error as string) ?? '未知错误'

    if (currentTask.value && currentTask.value.task_id === taskId) {
      currentTask.value = {
        ...currentTask.value,
        status: 'failed',
        error: errorMsg,
        progress: 0,
        updated_at: new Date().toISOString(),
      }
    }
  }

  /** 清除当前任务 */
  function clearCurrentTask(): void {
    currentTask.value = null
    error.value = null
  }

  /** 设置当前任务（用于从外部直接注入状态） */
  function setCurrentTask(task: TaskStatusResponse): void {
    currentTask.value = task
    taskHistory.value = appendToHistory(taskHistory.value, task.task_id)
  }

  /** 从历史记录中移除任务 */
  function removeFromHistory(taskId: string): void {
    taskHistory.value = taskHistory.value.filter((id) => id !== taskId)
    saveHistory(taskHistory.value)
  }

  /** 清空历史记录 */
  function clearHistory(): void {
    taskHistory.value = []
    saveHistory([])
  }

  return {
    // state
    currentTask,
    taskHistory,
    loading,
    error,
    // getters
    isRunning,
    isInterrupted,
    isCompleted,
    isFailed,
    isTerminal,
    // actions
    fetchTaskStatus,
    handleTaskUpdate,
    handleTaskResult,
    handleTaskError,
    clearCurrentTask,
    setCurrentTask,
    removeFromHistory,
    clearHistory,
  }
})
