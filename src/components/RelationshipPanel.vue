<template>
  <div class="relation-panel card">
    <h3>🤝 练习生关系</h3>
    <div class="rel-list">
      <div v-for="pair in pairs" :key="pair.key" class="rel-row">
        <span class="names">{{ pair.a }} ↔ {{ pair.b }}</span>
        <div class="rel-bar-wrap">
          <div class="rel-bar">
            <div
              class="rel-fill"
              :class="pair.type"
              :style="{ width: pair.barWidth + '%', marginLeft: pair.barOffset + '%' }"
            ></div>
          </div>
          <span class="rel-val" :class="pair.type">{{ pair.value }}</span>
        </div>
        <span class="rel-tag" :class="pair.type">{{ pair.tag }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { GAME_CONFIG } from '../config/gameConfig'
import { pairKey } from '../utils/random'

const props = defineProps({
  trainees: Array,
  relationships: Object,
})

const CFG = GAME_CONFIG.relationships

const pairs = computed(() => {
  const active = props.trainees.filter((t) => t.status !== 'left')
  const result = []
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const value = props.relationships[pairKey(active[i].id, active[j].id)] ?? 0
      let type = 'neutral'
      let tag = '普通'
      if (value >= CFG.synergyThreshold) { type = 'synergy'; tag = '默契' }
      else if (value <= CFG.competitionThreshold) { type = 'competition'; tag = '竞争' }

      const normalized = (value - CFG.min) / (CFG.max - CFG.min) * 100
      const barWidth = Math.abs(value) / CFG.max * 50
      const barOffset = value < 0 ? 50 - barWidth : 50

      result.push({
        key: pairKey(active[i].id, active[j].id),
        a: active[i].name,
        b: active[j].name,
        value,
        type,
        tag,
        barWidth: Math.max(barWidth, 2),
        barOffset,
        normalized,
      })
    }
  }
  return result
})
</script>

<style scoped>
.relation-panel h3 { margin-bottom: 0.75rem; }

.rel-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.rel-row {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.names { color: var(--text-secondary); }

.rel-bar-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rel-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.rel-bar::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
}

.rel-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.rel-fill.synergy { background: var(--success); }
.rel-fill.competition { background: var(--danger); }
.rel-fill.neutral { background: var(--text-muted); }

.rel-val { width: 32px; text-align: right; font-weight: 600; }
.rel-val.synergy { color: var(--success); }
.rel-val.competition { color: var(--danger); }

.rel-tag {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: var(--bg-secondary);
}

.rel-tag.synergy { background: var(--success-soft); color: var(--success); }
.rel-tag.competition { background: var(--danger-soft); color: var(--danger); }
</style>
