<template>
  <div class="modal-overlay">
    <div class="modal card">
      <h3>⚠️ {{ event.label }}</h3>
      <p class="desc">{{ event.description }}</p>
      <p class="target">涉及：{{ event.target?.name }}</p>

      <div v-if="event.type === 'poaching'" class="choices">
        <button class="btn primary" @click="$emit('resolve', true)">
          花重金挽留 (¥8,000~15,000)
        </button>
        <button class="btn danger" @click="$emit('resolve', false)">
          顺其自然
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  event: Object,
})
defineEmits(['resolve'])
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 120;
  padding: 1rem;
}

.modal {
  max-width: 400px;
  width: 100%;
  padding: 1.5rem;
}

.desc {
  color: var(--text-secondary);
  margin: 0.75rem 0;
  line-height: 1.5;
}

.target {
  font-weight: 600;
  margin-bottom: 1.25rem;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
