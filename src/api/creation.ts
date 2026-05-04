import client from './client'
import type { TaskResponse } from './types/task'
import type { CreationRequest } from './types/creation'
import type { ResumeRequest } from './types/resume'

/** 发起创作任务 */
export async function createTask(data: CreationRequest): Promise<TaskResponse> {
  return client.post('/v1/creation', data)
}

/** 恢复被中断的创作任务（HITL 大纲确认） */
export async function resumeTask(taskId: string, data: ResumeRequest): Promise<TaskResponse> {
  return client.post(`/v1/tasks/${taskId}/resume`, data)
}
