<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { useTaskLifecycle } from '@/composables/useTaskLifecycle'
import { POLISHING_MODE_META } from '@/api/types/polishing'
import type { PolishingMode } from '@/api/types/polishing'
import TaskStatusBadge from '@/components/common/TaskStatusBadge.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import MarkdownRenderer from '@/components/common/MarkdownRenderer.vue'

const props = defineProps<{ taskId: string }>()

const router = useRouter()
const taskStore = useTaskStore()
const { loadTask, stop } = useTaskLifecycle()

const copied = ref(false)
const viewMode = ref<'result' | 'compare' | 'factCheck'>('result')

const task = computed(() => taskStore.currentTask)
const isNotFound = computed(
  () => taskStore.error?.includes('404') ?? false,
)
const status = computed(() => task.value?.status)
const progress = computed(() => task.value?.progress ?? 0)
const currentNode = computed(() => task.value?.current_node_label ?? task.value?.current_node ?? '')
const result = computed(() => task.value?.result ?? '')
const error = computed(() => task.value?.error ?? '未知错误')
const factCheckResult = computed(() => task.value?.fact_check_result ?? '')

/** 从 data 中解析原始内容 */
const originalContent = computed(() => {
  const raw = task.value?.data
  if (!raw || typeof raw.original_content !== 'string') return ''
  return raw.original_content
})

/** 从 data 中解析模式 */
const polishingMode = computed<PolishingMode | null>(() => {
  const raw = task.value?.data
  if (!raw || typeof raw.mode !== 'number') return null
  return raw.mode as PolishingMode
})

const modeLabel = computed(() => {
  if (!polishingMode.value) return ''
  return POLISHING_MODE_META[polishingMode.value]?.label ?? ''
})

/** 是否为模式三（事实核查） */
const isMode3 = computed(() => polishingMode.value === 3)

/** 从核查报告中提取准确性级别 */
const accuracyLevel = computed(() => {
  if (!factCheckResult.value) return null
  const text = factCheckResult.value.toLowerCase()
  if (text.includes('总体准确性') && text.includes('low')) return 'low'
  if (text.includes('总体准确性') && text.includes('medium')) return 'medium'
  if (text.includes('总体准确性') && text.includes('high')) return 'high'
  return null
})

/** 准确性级别对应的中文描述 */
const accuracyDescription = computed(() => {
  switch (accuracyLevel.value) {
    case 'high': return '高准确性'
    case 'medium': return '中等准确性'
    case 'low': return '低准确性'
    default: return ''
  }
})

/** 准确性级别对应的说明 */
const accuracyExplanation = computed(() => {
  switch (accuracyLevel.value) {
    case 'high': return '文章内容整体准确，未发现明显事实错误，因此直接返回原文。'
    case 'medium': return '文章存在部分事实问题，已进入修正流程进行优化。'
    case 'low': return '文章存在较多事实错误，已强制进入修正流程进行修正。'
    default: return ''
  }
})

/** 准确性级别对应的样式类 */
const accuracyClass = computed(() => {
  switch (accuracyLevel.value) {
    case 'high': return 'accuracy-high'
    case 'medium': return 'accuracy-medium'
    case 'low': return 'accuracy-low'
    default: return ''
  }
})

async function onRetry(): Promise<void> {
  taskStore.clearCurrentTask()
  await loadTask(props.taskId)
}

async function onCopy(): Promise<void> {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // clipboard API not available
  }
}

function onBack(): void {
  router.push({ name: 'polishing' })
}

onMounted(() => {
  if (!task.value || task.value.task_id !== props.taskId) {
    loadTask(props.taskId)
  }
})

// 兜底：任务已完成但 result 为空时，自动重新获取状态
let fetchedOnce = false
watch(
  () => ({ status: status.value, result: result.value }),
  (val) => {
    if (val.status === 'completed' && !val.result && !fetchedOnce) {
      fetchedOnce = true
      loadTask(props.taskId)
    }
  },
)

onUnmounted(() => {
  stop()
})
</script>

<template>
  <div class="polishing-result-page">
    <!-- 顶部栏 -->
    <div class="result-topbar">
      <button class="back-btn" @click="onBack">&larr; 返回</button>
      <div class="topbar-meta">
        <span v-if="modeLabel" class="mode-tag">{{ modeLabel }}</span>
        <TaskStatusBadge v-if="task" :status="task.status" />
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="!task && taskStore.loading" class="state-center">
      <LoadingSpinner :size="32" label="加载任务状态..." />
    </div>

    <!-- 错误 -->
    <ErrorAlert
      v-else-if="taskStore.error && !task && !isNotFound"
      :message="taskStore.error"
      :retryable="true"
      @retry="onRetry"
    />

    <!-- 任务不存在 -->
    <div v-else-if="isNotFound" class="state-center">
      <div class="not-found-hint">
        <p>任务不存在或已过期</p>
        <button class="link-btn" @click="router.push({ name: 'history' })">
          查看历史记录
        </button>
      </div>
    </div>

    <!-- 任务内容 -->
    <template v-else-if="task">
      <!-- running -->
      <div v-if="status === 'running'" class="state-running">
        <div class="running-header">
          <LoadingSpinner :size="28" label="" />
          <div>
            <h2 class="state-title">正在润色中...</h2>
            <p class="running-info">
              <span v-if="modeLabel">模式：{{ modeLabel }}</span>
              <span v-if="currentNode"> | 阶段：{{ currentNode }}</span>
            </p>
          </div>
        </div>
        <ProgressBar :percentage="progress" :show-text="true" :height="10" />
      </div>

      <!-- completed -->
      <div v-else-if="status === 'completed'" class="state-completed">
        <div class="result-header">
          <h2 class="state-title">润色完成</h2>
          <div class="result-actions">
            <div class="view-toggle">
              <button
                class="toggle-btn"
                :class="{ active: viewMode === 'result' }"
                @click="viewMode = 'result'"
              >
                结果
              </button>
              <button
                class="toggle-btn"
                :class="{ active: viewMode === 'compare' }"
                @click="viewMode = 'compare'"
              >
                对比
              </button>
              <button
                v-if="isMode3 && factCheckResult"
                class="toggle-btn"
                :class="{ active: viewMode === 'factCheck' }"
                @click="viewMode = 'factCheck'"
              >
                核查报告
              </button>
            </div>
            <button class="copy-btn" @click="onCopy">
              {{ copied ? '已复制' : '复制全文' }}
            </button>
          </div>
        </div>

        <!-- 模式三：核查摘要（始终显示） -->
        <div v-if="isMode3 && accuracyLevel && viewMode !== 'factCheck'" class="fact-check-summary" :class="accuracyClass">
          <div class="summary-header">
            <span class="summary-icon">{{ accuracyLevel === 'high' ? '✓' : accuracyLevel === 'medium' ? '⚠' : '✗' }}</span>
            <span class="summary-title">{{ accuracyDescription }}</span>
          </div>
          <p class="summary-desc">{{ accuracyExplanation }}</p>
        </div>

        <!-- 单栏结果 -->
        <div v-if="viewMode === 'result'" class="result-body">
          <MarkdownRenderer v-if="result" :content="result" />
          <p v-else class="empty-hint">暂无润色结果</p>
        </div>

        <!-- 双栏对比 -->
        <div v-else-if="viewMode === 'compare'" class="compare-view">
          <div class="compare-panel">
            <h3 class="compare-label">原文</h3>
            <div class="compare-body">
              <MarkdownRenderer v-if="originalContent" :content="originalContent" />
              <p v-else class="empty-hint">无原文数据</p>
            </div>
          </div>
          <div class="compare-panel">
            <h3 class="compare-label">润色后</h3>
            <div class="compare-body">
              <MarkdownRenderer v-if="result" :content="result" />
              <p v-else class="empty-hint">暂无润色结果</p>
            </div>
          </div>
        </div>

        <!-- 核查报告详情 -->
        <div v-else-if="viewMode === 'factCheck' && factCheckResult" class="fact-check-detail">
          <h3 class="detail-title">事实核查报告</h3>
          <div class="detail-body">
            <MarkdownRenderer :content="factCheckResult" />
          </div>
        </div>
      </div>

      <!-- failed -->
      <div v-else-if="status === 'failed'" class="state-failed">
        <h2 class="state-title">润色失败</h2>
        <ErrorAlert :message="error" :retryable="true" @retry="onRetry" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.polishing-result-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* 顶部栏 */
.result-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.back-btn {
  padding: 6px 12px;
  font-size: 14px;
  color: #374151;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.back-btn:hover {
  background: #f3f4f6;
}

.topbar-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-tag {
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #4338ca;
  background: #e0e7ff;
  border-radius: 9999px;
}

/* 通用 */
.state-center {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
}

.state-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.empty-hint {
  font-size: 14px;
  color: #9ca3af;
  text-align: center;
  padding: 24px;
}

/* running */
.state-running {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.running-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.running-info {
  font-size: 14px;
  color: #6b7280;
  margin: 4px 0 0;
}

/* completed */
.state-completed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.result-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-toggle {
  display: flex;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 2px;
}

.toggle-btn {
  padding: 5px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.toggle-btn.active {
  background: #fff;
  color: #1f2937;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.copy-btn {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.copy-btn:hover {
  background: #dbeafe;
}

.result-body {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  background: #fff;
}

/* 对比视图 */
.compare-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.compare-panel {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.compare-label {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 20px;
  margin: 0;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.compare-body {
  padding: 20px;
  max-height: 600px;
  overflow-y: auto;
}

/* fact check summary */
.fact-check-summary {
  padding: 16px 20px;
  border-radius: 10px;
  border: 1px solid;
}

.accuracy-high {
  background: #f0fdf4;
  border-color: #86efac;
}

.accuracy-medium {
  background: #fffbeb;
  border-color: #fcd34d;
}

.accuracy-low {
  background: #fef2f2;
  border-color: #fca5a5;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.summary-icon {
  font-size: 18px;
  font-weight: 700;
}

.accuracy-high .summary-icon {
  color: #16a34a;
}

.accuracy-medium .summary-icon {
  color: #d97706;
}

.accuracy-low .summary-icon {
  color: #dc2626;
}

.summary-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.summary-desc {
  font-size: 13px;
  color: #4b5563;
  margin: 0;
  line-height: 1.5;
}

/* fact check detail */
.fact-check-detail {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.detail-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  padding: 12px 20px;
  margin: 0;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.detail-body {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

/* failed */
.state-failed {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
}

/* not found hint */
.not-found-hint {
  text-align: center;
  color: #6b7280;
}

.not-found-hint p {
  margin: 0 0 12px;
  font-size: 15px;
}

.link-btn {
  font-size: 14px;
  color: #2563eb;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.link-btn:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .polishing-result-page {
    padding: 16px;
  }

  .compare-view {
    grid-template-columns: 1fr;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .state-running {
    padding: 20px;
  }
}
</style>
