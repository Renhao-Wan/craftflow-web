/**
 * 任务查询 API（WebSocket 驱动）
 *
 * 通过 WebSocket 查询任务状态。
 * REST 端点保留但不再使用。
 */

import { wsClient } from './wsClient'
import type { WsMessage } from './wsClient'

/** 查询任务状态（通用，Creation 和 Polishing 共用） */
export async function getTaskStatus(taskId: string): Promise<WsMessage> {
  return wsClient.sendAndWait('get_task_status', { taskId })
}
