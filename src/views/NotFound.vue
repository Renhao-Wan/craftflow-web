<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <h1 class="not-found-code">404</h1>
      <p class="not-found-text">页面不存在</p>
      <p class="not-found-desc">请检查 URL 是否正确，或返回首页。</p>
      <div class="not-found-actions">
        <button class="action-btn primary" @click="router.push('/')">返回首页</button>
        <button class="action-btn" @click="router.push({ name: 'history' })">查看历史</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 24px;
}

.not-found-content {
  text-align: center;
}

.not-found-code {
  font-size: 80px;
  font-weight: 800;
  color: #e5e7eb;
  margin: 0 0 8px;
  line-height: 1;
}

.not-found-text {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px;
}

.not-found-desc {
  font-size: 15px;
  color: #6b7280;
  margin: 0 0 24px;
}

.not-found-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.action-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.action-btn.primary {
  color: #fff;
  background: #2563eb;
  border-color: #2563eb;
}

.action-btn.primary:hover {
  background: #1d4ed8;
}
</style>
