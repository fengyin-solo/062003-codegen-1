<template>
  <div class="modal-overlay">
    <div class="modal card" :class="status">
      <h3>{{ title }}</h3>
      <p class="desc">{{ message }}</p>

      <div class="summary">
        <div class="sum-item">
          <span>出道组合</span>
          <strong>{{ state.groups.length }} / {{ targetGroups }}</strong>
        </div>
        <div class="sum-item">
          <span>净利润</span>
          <strong :class="profit >= 0 ? 'success' : 'danger'">¥{{ profit.toLocaleString() }}</strong>
        </div>
        <div class="sum-item">
          <span>存活天数</span>
          <strong>{{ state.day }} 天</strong>
        </div>
      </div>

      <button class="btn primary" @click="$emit('back')">返回存档</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { GAME_CONFIG } from '../config/gameConfig'

const props = defineProps({
  status: String,
  state: Object,
  profit: Number,
})
defineEmits(['back'])

const targetGroups = GAME_CONFIG.victory.targetGroups

const title = computed(() => {
  if (props.status === 'won') return '🏆 恭喜通关！'
  return '💔 游戏结束'
})

const message = computed(() => {
  const map = {
    won: '你成功在三年内培养出足够的出道组合，事务所盈利为正！',
    lost_groups: `三年已过，出道组合不足 ${targetGroups} 个，目标未达成。`,
    lost_profit: '出道组合已达标，但事务所未能盈利，经营失败。',
    lost_bankrupt: '资金链断裂，事务所宣告破产。',
    lost_empty: '所有练习生都已离开，事务所名存实亡。',
  }
  return map[props.status] || '游戏结束'
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 130;
  padding: 1rem;
}

.modal {
  max-width: 420px;
  width: 100%;
  padding: 2rem;
  text-align: center;
}

.modal.won { border: 2px solid var(--accent); }

.desc {
  color: var(--text-secondary);
  margin: 1rem 0 1.5rem;
  line-height: 1.6;
}

.summary {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.sum-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sum-item span {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.success { color: var(--success); }
.danger { color: var(--danger); }
</style>
