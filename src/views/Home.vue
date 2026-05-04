<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import TaskStatusBadge from '@/components/common/TaskStatusBadge.vue'
import { inferTaskType, formatTime, taskRouteName } from '@/utils/taskHelpers'
import type { TaskStatus } from '@/api/types/task'

interface RecentTask {
  taskId: string
  status: TaskStatus
  type: 'creation' | 'polishing'
  createdAt: string
}

const router = useRouter()
const taskStore = useTaskStore()

const recentTasks = ref<RecentTask[]>([])

async function loadRecent(): Promise<void> {
  const ids = taskStore.taskHistory.slice(0, 5)
  if (ids.length === 0) return

  const results = await Promise.allSettled(
    ids.map((id: string) => taskStore.fetchTaskStatus(id)),
  )
  recentTasks.value = results
    .map((result, i) => {
      if (result.status === 'fulfilled') {
        const d = result.value
        return {
          taskId: ids[i]!,
          status: d.status,
          type: inferTaskType(d),
          createdAt: d.created_at ?? '',
        }
      }
      return null
    })
    .filter((item): item is RecentTask => item !== null)
}

function goToTask(item: RecentTask): void {
  router.push({ name: taskRouteName(item.type), params: { taskId: item.taskId } })
}

onMounted(loadRecent)
</script>

<template>
  <div class="home-page">
    <div class="hero">
      <h1 class="hero-title">CraftFlow</h1>
      <p class="hero-subtitle">AI 驱动的智能长文创作与审校平台</p>
    </div>

    <!-- 入口卡片 -->
    <div class="action-cards">
      <button class="action-card" @click="router.push({ name: 'creation' })">
        <div class="action-icon action-icon-creation">&#9998;</div>
        <div class="action-info">
          <h2 class="action-title">开始创作</h2>
          <p class="action-desc">输入主题，AI 自动生成大纲并撰写长文</p>
        </div>
        <span class="action-arrow">&rarr;</span>
      </button>

      <button class="action-card" @click="router.push({ name: 'polishing' })">
        <div class="action-icon action-icon-polishing">&#9733;</div>
        <div class="action-info">
          <h2 class="action-title">润色文章</h2>
          <p class="action-desc">粘贴文章，选择模式，AI 为你优化内容</p>
        </div>
        <span class="action-arrow">&rarr;</span>
      </button>
    </div>

    <!-- 最近任务 -->
    <div v-if="recentTasks.length > 0" class="recent-section">
      <div class="recent-header">
        <h3 class="recent-title">最近任务</h3>
        <button
          class="view-all-btn"
          @click="router.push({ name: 'history' })"
        >
          查看全部
        </button>
      </div>
      <ul class="recent-list">
        <li
          v-for="item in recentTasks"
          :key="item.taskId"
          class="recent-item"
          @click="goToTask(item)"
        >
          <span class="type-tag" :class="'type-' + item.type">
            {{ item.type === 'creation' ? '创作' : '润色' }}
          </span>
          <span class="recent-id">{{ item.taskId }}</span>
          <TaskStatusBadge :status="item.status" />
          <span class="recent-time">{{ formatTime(item.createdAt) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 16px 32px;
}

/* Hero */
.hero {
  text-align: center;
  margin-bottom: 40px;
}

.hero-title {
  font-size: 36px;
  font-weight: 800;
  color: #111827;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

/* 入口卡片 */
.action-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 40px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.action-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.action-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 20px;
}

.action-icon-creation {
  background: #dbeafe;
  color: #2563eb;
}

.action-icon-polishing {
  background: #ede9fe;
  color: #7c3aed;
}

.action-info {
  flex: 1;
  min-width: 0;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px;
}

.action-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.action-arrow {
  flex-shrink: 0;
  font-size: 18px;
  color: #9ca3af;
  transition: color 0.15s;
}

.action-card:hover .action-arrow {
  color: #2563eb;
}

/* 最近任务 */
.recent-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 24px;
}

.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.recent-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.view-all-btn {
  font-size: 13px;
  color: #2563eb;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.view-all-btn:hover {
  text-decoration: underline;
}

.recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.recent-item:hover {
  border-color: #93c5fd;
}

.type-tag {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
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

.recent-id {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-family: ui-monospace, monospace;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-time {
  flex-shrink: 0;
  font-size: 12px;
  color: #9ca3af;
}

@media (max-width: 640px) {
  .home-page {
    padding: 32px 16px 24px;
  }

  .hero-title {
    font-size: 28px;
  }

  .hero-subtitle {
    font-size: 14px;
  }

  .action-card {
    padding: 16px;
  }

  .recent-item {
    flex-wrap: wrap;
    gap: 6px;
  }

  .recent-id {
    order: 3;
    width: 100%;
  }
}
</style>
