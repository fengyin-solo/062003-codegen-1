<template>
  <div class="day-log card">
    <h3>📋 事务所日志</h3>
    <div class="log-list" ref="logRef">
      <div
        v-for="(log, i) in recentLogs"
        :key="i"
        class="log-item"
      >
        <span class="log-day">D{{ log.day }}</span>
        <span class="log-text">{{ log.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'

const props = defineProps({
  logs: Array,
})

const logRef = ref(null)

const recentLogs = computed(() => [...(props.logs || [])].reverse().slice(0, 30))

watch(() => props.logs?.length, async () => {
  await nextTick()
  if (logRef.value) logRef.value.scrollTop = 0
})
</script>

<style scoped>
.day-log h3 { margin-bottom: 0.75rem; }

.log-list {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.log-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.85rem;
  line-height: 1.4;
}

.log-day {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  width: 36px;
}

.log-text { color: var(--text-secondary); }
</style>
