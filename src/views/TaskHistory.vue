<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { getTaskStatus } from '@/api/tasks'
import TaskStatusBadge from '@/components/common/TaskStatusBadge.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import { inferTaskType, formatTime, taskRouteName } from '@/utils/taskHelpers'
import type { TaskStatus } from '@/api/types/task'

interface HistoryItem {
  taskId: string
  status: TaskStatus
  createdAt: string
  type: 'creation' | 'polishing'
}

const router = useRouter()
const taskStore = useTaskStore()

const items = ref<HistoryItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function loadHistory(): Promise<void> {
  const ids = taskStore.taskHistory
  if (ids.length === 0) return

  loading.value = true
  error.value = null
  try {
    const results = await Promise.allSettled(
      ids.map((id: string) => getTaskStatus(id)),
    )
    items.value = results
      .map((result, i) => {
        if (result.status === 'fulfilled') {
          const d = result.value
          return {
            taskId: ids[i]!,
            status: d.status,
            createdAt: d.created_at ?? '',
            type: inferTaskType(d),
          }
        }
        return null
      })
      .filter((item): item is HistoryItem => item !== null)
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : '加载历史记录失败'
  } finally {
    loading.value = false
  }
}

function goToDetail(item: HistoryItem): void {
  router.push({ name: taskRouteName(item.type), params: { taskId: item.taskId } })
}

function onRemove(taskId: string): void {
  taskStore.removeFromHistory(taskId)
  items.value = items.value.filter((item) => item.taskId !== taskId)
}

function onClearAll(): void {
  taskStore.clearHistory()
  items.value = []
}

onMounted(loadHistory)
</script>

<template>
  <div class="history-page">
    <div class="page-header">
      <h1 class="page-title">任务历史</h1>
      <button
        v-if="items.length > 0"
        class="clear-btn"
        @click="onClearAll"
      >
        清空历史
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading && items.length === 0" class="state-center">
      <LoadingSpinner :size="28" label="加载历史记录..." />
    </div>

    <!-- 错误 -->
    <ErrorAlert
      v-else-if="error"
      :message="error"
      :retryable="true"
      @retry="loadHistory"
    />

    <!-- 空状态 -->
    <div v-else-if="items.length === 0" class="empty-state">
      <p class="empty-text">暂无任务历史</p>
      <button class="empty-action" @click="router.push({ name: 'creation' })">
        发起第一个任务
      </button>
    </div>

    <!-- 列表 -->
    <ul v-else class="history-list">
      <li
        v-for="item in items"
        :key="item.taskId"
        class="history-item"
        @click="goToDetail(item)"
      >
        <div class="item-main">
          <div class="item-top">
            <span class="type-tag" :class="'type-' + item.type">
              {{ item.type === 'creation' ? '创作' : '润色' }}
            </span>
            <TaskStatusBadge :status="item.status" />
          </div>
          <p class="item-id">{{ item.taskId }}</p>
        </div>
        <div class="item-side">
          <span class="item-time">{{ formatTime(item.createdAt) }}</span>
          <button
            class="remove-btn"
            title="移除"
            @click.stop="onRemove(item.taskId)"
          >
            &times;
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.history-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.clear-btn {
  padding: 6px 14px;
  font-size: 13px;
  color: #b91c1c;
  background: transparent;
  border: 1px solid #fecaca;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.clear-btn:hover {
  background: #fef2f2;
}

/* 通用 */
.state-center {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 0;
}

.empty-text {
  font-size: 15px;
  color: #9ca3af;
  margin: 0;
}

.empty-action {
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.empty-action:hover {
  background: #1d4ed8;
}

/* 列表 */
.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.history-item:hover {
  border-color: #93c5fd;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.type-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 9999px;
}

.type-creation {
  color: #2563eb;
  background: #dbeafe;
}

.type-polishing {
  color: #7c3aed;
  background: #ede9fe;
}

.item-id {
  font-size: 13px;
  font-family: ui-monospace, monospace;
  color: #6b7280;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-side {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.item-time {
  font-size: 13px;
  color: #9ca3af;
}

.remove-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #9ca3af;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.remove-btn:hover {
  color: #b91c1c;
  background: #fef2f2;
}

@media (max-width: 640px) {
  .history-page {
    padding: 24px 16px;
  }

  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .item-side {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
