<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskLifecycle } from '@/composables/useTaskLifecycle'
import { POLISHING_MODE_META } from '@/api/types/polishing'
import type { PolishingMode } from '@/api/types/polishing'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const { submitPolishing, submitting, submitError } = useTaskLifecycle()

const content = ref('')
const selectedMode = ref<PolishingMode>(1)

const CONTENT_MIN = 10
const CONTENT_MAX = 50_000

const contentLength = computed(() => content.value.length)

const contentError = computed<string | null>(() => {
  const len = contentLength.value
  if (len === 0) return null
  if (len < CONTENT_MIN) return `内容至少需要 ${CONTENT_MIN} 个字符`
  if (len > CONTENT_MAX) return `内容不能超过 ${CONTENT_MAX} 个字符`
  return null
})

const canSubmit = computed(() => {
  const len = contentLength.value
  return len >= CONTENT_MIN && len <= CONTENT_MAX && !submitting.value
})

function selectMode(mode: number): void {
  selectedMode.value = mode as PolishingMode
}

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return
  await submitPolishing(content.value, selectedMode.value)
}

function onRetry(): void {
  onSubmit()
}
</script>

<template>
  <div class="polishing-create-page">
    <div class="page-header">
      <h1 class="page-title">润色文章</h1>
      <p class="page-subtitle">粘贴你的文章，选择润色模式，AI 将为你优化内容</p>
    </div>

    <form class="create-form" @submit.prevent="onSubmit">
      <!-- 内容输入 -->
      <div class="form-group">
        <label class="form-label" for="content">
          文章内容 <span class="required">*</span>
        </label>
        <textarea
          id="content"
          v-model="content"
          class="form-textarea"
          :class="{ 'input-error': contentError }"
          placeholder="在此粘贴你的 Markdown 文章..."
          :rows="12"
          :maxlength="CONTENT_MAX + 100"
          :disabled="submitting"
        />
        <div class="form-meta">
          <span v-if="contentError" class="error-text">{{ contentError }}</span>
          <span class="char-count" :class="{ 'count-over': contentLength > CONTENT_MAX }">
            {{ contentLength.toLocaleString() }}/{{ CONTENT_MAX.toLocaleString() }}
          </span>
        </div>
      </div>

      <!-- 模式选择 -->
      <div class="form-group">
        <label class="form-label">润色模式</label>
        <div class="mode-cards">
          <button
            v-for="(meta, mode) in POLISHING_MODE_META"
            :key="mode"
            type="button"
            class="mode-card"
            :class="{ 'mode-selected': selectedMode === Number(mode) }"
            :disabled="submitting"
            @click="selectMode(Number(mode))"
          >
            <div class="mode-badge">{{ mode }}</div>
            <div class="mode-info">
              <p class="mode-label">{{ meta.label }}</p>
              <p class="mode-desc">{{ meta.description }}</p>
            </div>
          </button>
        </div>
      </div>

      <ErrorAlert
        v-if="submitError"
        :message="submitError"
        :retryable="true"
        @retry="onRetry"
      />

      <button
        type="submit"
        class="submit-btn"
        :disabled="!canSubmit"
      >
        <LoadingSpinner v-if="submitting" :size="18" label="" />
        <span v-if="submitting">提交中...</span>
        <span v-else>开始润色</span>
      </button>
    </form>
  </div>
</template>

<style scoped>
.polishing-create-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 16px;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
}

.page-subtitle {
  font-size: 15px;
  color: #6b7280;
  margin: 0;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.required {
  color: #b91c1c;
}

.form-textarea {
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.7;
  color: #1f2937;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  resize: vertical;
  min-height: 200px;
  font-family: ui-monospace, monospace;
}

.form-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-textarea.input-error {
  border-color: #b91c1c;
}

.form-textarea:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.form-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 20px;
}

.error-text {
  font-size: 13px;
  color: #b91c1c;
}

.char-count {
  font-size: 12px;
  color: #9ca3af;
  margin-left: auto;
}

.char-count.count-over {
  color: #b91c1c;
  font-weight: 500;
}

/* 模式卡片 */
.mode-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mode-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, background 0.2s;
}

.mode-card:hover:not(:disabled) {
  border-color: #93c5fd;
  background: #f9fafb;
}

.mode-card.mode-selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.mode-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mode-badge {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 50%;
  font-size: 16px;
  font-weight: 700;
}

.mode-selected .mode-badge {
  background: #2563eb;
  color: #fff;
}

.mode-info {
  flex: 1;
  min-width: 0;
}

.mode-label {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 2px;
}

.mode-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

/* 提交按钮 */
.submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
  align-self: flex-start;
}

.submit-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .polishing-create-page {
    padding: 24px 16px;
  }

  .page-title {
    font-size: 24px;
  }
}
</style>
