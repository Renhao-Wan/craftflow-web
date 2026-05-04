import client from './client'
import type { TaskStatusResponse } from './types/task'

/** 查询任务状态（通用，Creation 和 Polishing 共用） */
export async function getTaskStatus(
  taskId: string,
  params?: { include_state?: boolean; include_history?: boolean },
): Promise<TaskStatusResponse> {
  return client.get(`/v1/tasks/${taskId}`, { params })
}
