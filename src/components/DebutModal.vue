<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal card">
      <h3>🎉 组队出道</h3>
      <p class="desc">
        选择 {{ minSize }}-{{ maxSize }} 名达标练习生组成出道组合
      </p>

      <div class="name-input">
        <label>组合名</label>
        <input v-model="groupName" placeholder="输入组合名称" />
      </div>

      <div class="candidate-list">
        <label
          v-for="t in candidates"
          :key="t.id"
          class="candidate"
          :class="{ selected: selected.includes(t.id), disabled: !t.canDebut }"
        >
          <input
            type="checkbox"
            :value="t.id"
            :disabled="!t.canDebut"
            v-model="selected"
          />
          <span>{{ t.name }}</span>
          <span class="score">{{ t.score }}分</span>
        </label>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="modal-actions">
        <button class="btn primary" :disabled="selected.length < minSize" @click="confirm">
          确认出道
        </button>
        <button class="btn ghost" @click="$emit('close')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { GAME_CONFIG } from '../config/gameConfig'

const props = defineProps({
  candidates: Array,
})
const emit = defineEmits(['close', 'confirm'])

const minSize = GAME_CONFIG.rating.minGroupSize
const maxSize = GAME_CONFIG.rating.maxGroupSize

const selected = ref([])
const groupName = ref('')
const error = ref('')

function confirm() {
  error.value = ''
  if (selected.value.length < minSize || selected.value.length > maxSize) {
    error.value = `请选择 ${minSize}-${maxSize} 名成员`
    return
  }
  const result = emit('confirm', selected.value, groupName.value)
  if (result === false) return
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 110;
  padding: 1rem;
}

.modal {
  max-width: 420px;
  width: 100%;
  padding: 1.5rem;
}

.desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.name-input {
  margin-bottom: 1rem;
}

.name-input label {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 0.35rem;
  color: var(--text-secondary);
}

.name-input input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
}

.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
  max-height: 240px;
  overflow-y: auto;
}

.candidate {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}

.candidate.selected { border-color: var(--accent); background: var(--accent-soft); }
.candidate.disabled { opacity: 0.4; cursor: not-allowed; }

.score {
  margin-left: auto;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.error {
  color: var(--danger);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
</style>
