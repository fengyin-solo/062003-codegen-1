<template>
  <div class="groups-panel card">
    <h3>🌟 出道组合</h3>
    <div v-if="groups.length === 0" class="empty">暂无出道组合</div>
    <div v-for="group in groups" :key="group.id" class="group-item">
      <div class="group-head">
        <strong>{{ group.name }}</strong>
        <span class="debut-day">第 {{ group.debutedDay }} 天出道</span>
      </div>
      <div class="members">
        {{ memberNames(group).join(' · ') }}
      </div>
      <div class="group-stats">
        <span>总销量 {{ group.totalSales.toLocaleString() }}</span>
        <span>{{ group.singles.length }} 张单曲</span>
      </div>
      <button
        class="btn primary sm"
        :disabled="money < singleCost"
        @click="$emit('release', group.id)"
      >
        发行单曲 (¥{{ singleCost.toLocaleString() }})
      </button>
    </div>
  </div>
</template>

<script setup>
import { GAME_CONFIG } from '../config/gameConfig'

const props = defineProps({
  groups: Array,
  trainees: Array,
  money: Number,
})

defineEmits(['release'])

const singleCost = GAME_CONFIG.single.creationCost

function memberNames(group) {
  return group.memberIds
    .map((id) => props.trainees.find((t) => t.id === id)?.name)
    .filter(Boolean)
}
</script>

<style scoped>
.groups-panel h3 { margin-bottom: 0.75rem; }

.empty {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.group-item {
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.group-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.debut-day {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.members {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.35rem;
}

.group-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}
</style>
