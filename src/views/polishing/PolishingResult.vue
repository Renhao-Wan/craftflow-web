<script setup lang="ts">
defineProps<{ taskId: string }>()
</script>

<template>
  <div>
    <h2>润色结果</h2>
    <p>Task: {{ taskId }}</p>
    <p>Task 5.2 待实现</p>
  </div>
</template>
