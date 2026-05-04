/** 任务状态枚举 */
export type TaskStatus = 'running' | 'interrupted' | 'completed' | 'failed'

/** 任务创建响应 — POST /api/v1/creation, POST /api/v1/polishing */
export interface TaskResponse {
  task_id: string
  status: TaskStatus
  message?: string
  created_at?: string
}

/** 任务状态查询响应 — GET /api/v1/tasks/{task_id} */
export interface TaskStatusResponse {
  task_id: string
  status: TaskStatus
  current_node?: string
  /** 等待的人工操作类型（仅 interrupted 状态） */
  awaiting?: string
  /** 当前状态数据（如大纲） */
  data?: Record<string, unknown>
  /** 最终结果（仅 completed 状态，Markdown 格式） */
  result?: string
  /** 错误信息（仅 failed 状态） */
  error?: string
  /** 任务进度百分比 0-100 */
  progress?: number
  /** 完整图状态（需 include_state=true） */
  state?: Record<string, unknown>
  /** 执行历史（需 include_history=true） */
  history?: Array<{ checkpoint_id: string; ts: string }>
  created_at?: string
  updated_at?: string
}
