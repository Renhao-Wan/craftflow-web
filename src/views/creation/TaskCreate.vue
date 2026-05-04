<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskLifecycle } from '@/composables/useTaskLifecycle'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const { submitCreation, submitting, submitError } = useTaskLifecycle()

const topic = ref('')
const description = ref('')

const TOPIC_MAX = 500
const DESC_MAX = 2000

const topicLength = computed(() => topic.value.trim().length)
const descLength = computed(() => description.value.length)

const topicError = computed<string | null>(() => {
  const len = topicLength.value
  if (len === 0) return null // 未提交时不显示
  if (len > TOPIC_MAX) return `主题不能超过 ${TOPIC_MAX} 个字符`
  return null
})

const canSubmit = computed(() => {
  const len = topicLength.value
  return len >= 1 && len <= TOPIC_MAX && !submitting.value
})

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return
  await submitCreation(topic.value.trim(), description.value.trim() || undefined)
}

function onRetry(): void {
  onSubmit()
}
</script>

<template>
  <div class="task-create-page">
    <div class="page-header">
      <h1 class="page-title">发起创作</h1>
      <p class="page-subtitle">输入主题和需求，AI 将为你生成一篇完整的长文</p>
    </div>

    <form class="create-form" @submit.prevent="onSubmit">
      <div class="form-group">
        <label class="form-label" for="topic">
          主题 <span class="required">*</span>
        </label>
        <input
          id="topic"
          v-model="topic"
          type="text"
          class="form-input"
          :class="{ 'input-error': topicError }"
          placeholder="例如：Vue 3 组合式 API 最佳实践"
          :maxlength="TOPIC_MAX + 10"
          :disabled="submitting"
        />
        <div class="form-meta">
          <span v-if="topicError" class="error-text">{{ topicError }}</span>
          <span class="char-count" :class="{ 'count-over': topicLength > TOPIC_MAX }">
            {{ topicLength }}/{{ TOPIC_MAX }}
          </span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="description">
          补充描述 <span class="optional">(选填)</span>
        </label>
        <textarea
          id="description"
          v-model="description"
          class="form-textarea"
          placeholder="可以补充写作要求、目标读者、风格偏好等信息..."
          :rows="5"
          :maxlength="DESC_MAX + 10"
          :disabled="submitting"
        />
        <div class="form-meta">
          <span class="char-count" :class="{ 'count-over': descLength > DESC_MAX }">
            {{ descLength }}/{{ DESC_MAX }}
          </span>
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
        <span v-else>开始创作</span>
      </button>
    </form>
  </div>
</template>

<style scoped>
.task-create-page {
  max-width: 640px;
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
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.required {
  color: #b91c1c;
}

.optional {
  font-weight: 400;
  color: #9ca3af;
  font-size: 13px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 14px;
  font-size: 15px;
  line-height: 1.5;
  color: #1f2937;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input.input-error {
  border-color: #b91c1c;
}

.form-input:disabled,
.form-textarea:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
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
</style>
