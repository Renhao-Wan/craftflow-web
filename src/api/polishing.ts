import client from './client'
import type { TaskResponse } from './types/task'
import type { PolishingRequest } from './types/polishing'

/** 发起润色任务 */
export async function createPolishingTask(data: PolishingRequest): Promise<TaskResponse> {
  return client.post('/v1/polishing', data)
}
