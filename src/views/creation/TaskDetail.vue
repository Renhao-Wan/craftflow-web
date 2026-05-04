<script setup lang="ts">
defineProps<{ taskId: string }>()
</script>

<template>
  <div>
    <h2>任务详情</h2>
    <p>Task: {{ taskId }}</p>
    <p>Task 4.3 待实现</p>
  </div>
</template>
