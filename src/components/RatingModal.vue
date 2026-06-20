<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal card">
      <h3>📊 周末内部评级</h3>
      <p class="desc">综合评分达标（≥{{ threshold }}）的练习生可组队出道</p>

      <table class="rating-table">
        <thead>
          <tr>
            <th>排名</th>
            <th>姓名</th>
            <th>评分</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(t, i) in results" :key="t.id" :class="{ can: t.canDebut }">
            <td>{{ i + 1 }}</td>
            <td>{{ t.name }}</td>
            <td><strong>{{ t.score }}</strong></td>
            <td>
              <span v-if="t.canDebut" class="ok">✓ 可出道</span>
              <span v-else class="no">未达标</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="modal-actions">
        <button class="btn primary" @click="$emit('debut')">组队出道</button>
        <button class="btn ghost" @click="$emit('close')">继续训练</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { GAME_CONFIG } from '../config/gameConfig'

defineProps({
  results: Array,
})
defineEmits(['close', 'debut'])

const threshold = GAME_CONFIG.rating.debutScoreThreshold
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal {
  max-width: 480px;
  width: 100%;
  padding: 1.5rem;
}

.desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.rating-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.25rem;
  font-size: 0.9rem;
}

.rating-table th,
.rating-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.rating-table tr.can { background: var(--accent-soft); }

.ok { color: var(--success); font-size: 0.85rem; }
.no { color: var(--text-muted); font-size: 0.85rem; }

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
</style>
