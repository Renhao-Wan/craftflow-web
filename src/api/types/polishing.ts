/** 润色模式 */
export type PolishingMode = 1 | 2 | 3

/** 润色模式元信息 */
export const POLISHING_MODE_META: Record<PolishingMode, { label: string; description: string }> = {
  1: { label: '极速格式化', description: '单次格式整理，速度最快' },
  2: { label: '专家对抗审查', description: 'Author-Editor 多轮对抗，质量与速度平衡' },
  3: { label: '事实核查', description: '准确性验证 + 对抗循环，质量最高' },
}

/** 润色任务请求 — POST /api/v1/polishing */
export interface PolishingRequest {
  /** 待润色的文章内容（Markdown 格式），>=10 字符 */
  content: string
  /** 润色模式：1=极速格式化, 2=专家对抗审查, 3=事实核查 */
  mode: PolishingMode
}
