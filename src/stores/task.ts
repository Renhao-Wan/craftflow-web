import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getTaskStatus } from '@/api/tasks'
import type { TaskStatusResponse } from '@/api/types/task'

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
  /** 查询任务状态并更新 currentTask */
  async function fetchTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    loading.value = true
    error.value = null
    try {
      const response = await getTaskStatus(taskId)
      currentTask.value = response
      // 将任务加入历史记录
      taskHistory.value = appendToHistory(taskHistory.value, taskId)
      return response
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '获取任务状态失败'
      error.value = message
      throw err
    } finally {
      loading.value = false
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
    clearCurrentTask,
    setCurrentTask,
    removeFromHistory,
    clearHistory,
  }
})
