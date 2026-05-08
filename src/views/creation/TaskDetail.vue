<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { useTaskLifecycle } from '@/composables/useTaskLifecycle'
import TaskStatusBadge from '@/components/common/TaskStatusBadge.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import MarkdownRenderer from '@/components/common/MarkdownRenderer.vue'
import OutlineEditor from '@/components/creation/OutlineEditor.vue'
import type { OutlineItem } from '@/components/creation/OutlineEditor.vue'

const props = defineProps<{ taskId: string }>()

const router = useRouter()
const taskStore = useTaskStore()
const { resumeTask, loadTask, stop, submitting, submitError } = useTaskLifecycle()

const copied = ref(false)

const task = computed(() => taskStore.currentTask)
const isNotFound = computed(
  () => taskStore.error?.includes('404') ?? false,
)
const status = computed(() => task.value?.status)
const progress = computed(() => task.value?.progress ?? 0)
const currentNode = computed(() => task.value?.current_node_label ?? task.value?.current_node ?? '')
const result = computed(() => task.value?.result ?? '')
const error = computed(() => task.value?.error ?? '未知错误')

/** 从 data 中解析大纲列表 */
const outlineItems = computed<OutlineItem[]>(() => {
  const raw = task.value?.data
  if (!raw || !Array.isArray(raw.outline)) return []
  return raw.outline as OutlineItem[]
})

function onConfirmOutline(): void {
  resumeTask(props.taskId, 'confirm_outline')
}

function onUpdateOutline(items: OutlineItem[]): void {
  resumeTask(props.taskId, 'update_outline', { outline: items })
}

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
    // fallback: select text
  }
}

function onBack(): void {
  router.back()
}

onMounted(() => {
  // 若 store 中无当前任务或 taskId 不匹配，重新加载
  if (!task.value || task.value.task_id !== props.taskId) {
    loadTask(props.taskId)
  }
})

// 兜底：任务已完成但 result 为空时，自动重新获取状态
// 可能原因：WS task_result 消息丢失或未到达
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
  <div class="task-detail-page">
    <!-- 顶部栏 -->
    <div class="detail-topbar">
      <button class="back-btn" @click="onBack">&larr; 返回</button>
      <div class="topbar-meta">
        <TaskStatusBadge v-if="task" :status="task.status" />
      </div>
    </div>

    <!-- 加载中（首次加载无数据） -->
    <div v-if="!task && taskStore.loading" class="state-center">
      <LoadingSpinner :size="32" label="加载任务状态..." />
    </div>

    <!-- 错误（store 级错误） -->
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
            <h2 class="state-title">正在创作中...</h2>
            <p v-if="currentNode" class="current-node">
              当前阶段：{{ currentNode }}
            </p>
          </div>
        </div>
        <ProgressBar
          :percentage="progress"
          :show-text="true"
          :height="10"
        />
      </div>

      <!-- interrupted -->
      <div v-else-if="status === 'interrupted'" class="state-interrupted">
        <h2 class="state-title">大纲已生成，请确认</h2>
        <p class="state-desc">
          AI 已根据你的主题生成了文章大纲。你可以直接确认，或点击条目编辑后更新。
        </p>

        <ErrorAlert
          v-if="submitError"
          :message="submitError"
          :retryable="false"
        />

        <OutlineEditor
          v-if="outlineItems.length > 0"
          :items="outlineItems"
          :loading="submitting"
          @confirm="onConfirmOutline"
          @update="onUpdateOutline"
        />
        <div v-else class="state-center">
          <p class="empty-hint">暂无大纲数据</p>
        </div>
      </div>

      <!-- completed -->
      <div v-else-if="status === 'completed'" class="state-completed">
        <div class="result-header">
          <h2 class="state-title">创作完成</h2>
          <button class="copy-btn" @click="onCopy">
            {{ copied ? '已复制' : '复制全文' }}
          </button>
        </div>
        <div class="result-body">
          <MarkdownRenderer v-if="result" :content="result" />
          <p v-else class="empty-hint">暂无结果内容</p>
        </div>
      </div>

      <!-- failed -->
      <div v-else-if="status === 'failed'" class="state-failed">
        <h2 class="state-title">创作失败</h2>
        <ErrorAlert
          :message="error"
          :retryable="true"
          @retry="onRetry"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.task-detail-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* 顶部栏 */
.detail-topbar {
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

/* 通用状态 */
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

.state-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 8px 0 20px;
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

.current-node {
  font-size: 14px;
  color: #6b7280;
  margin: 4px 0 0;
}

/* interrupted */
.state-interrupted {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  .task-detail-page {
    padding: 16px;
  }

  .state-running {
    padding: 20px;
  }
}
</style>
