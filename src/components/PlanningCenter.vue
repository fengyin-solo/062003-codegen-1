<template>
  <div class="planning-center card">
    <div class="header">
      <h3>📋 月度企划中心</h3>
      <button v-if="!progress" class="btn sm primary" @click="showThemeSelector = true">
        启动新企划
      </button>
    </div>

    <div v-if="progress" class="current-theme">
      <div class="theme-header">
        <span class="theme-icon">{{ progress.theme.icon }}</span>
        <div class="theme-info">
          <h4>{{ progress.theme.label }}</h4>
          <p class="theme-desc">{{ progress.theme.description }}</p>
        </div>
        <div class="theme-days">
            <span class="days-passed">{{ progress.daysPassed }}/{{ progress.daysTotal }}天</span>
          </div>
      </div>

      <div class="progress-bar">
        <div class="progress-track">
          <div
            class="progress-fill" :style="{ width: progress.overallProgress + '%' }"></div>
        </div>
        <span class="progress-text">{{ Math.round(progress.overallProgress) }}%</span>
      </div>

      <div class="target-info">
        <div class="target-count">
          <span class="label">阶段目标</span>
          <span class="value" :class="{ achieved: progress.targetAchieved }">
            {{ progress.achievedCount }}/{{ progress.targetCount }} 人达标
          </span>
        </div>
        <div v-if="progress.daysRemaining > 0" class="days-remaining">
          剩余 {{ progress.daysRemaining }} 天
        </div>
      </div>

      <div class="weekly-schedule">
        <h5>七天训练日程</h5>
        <div class="week-days">
          <div
            v-for="(day, idx) in progress.weeklySchedule" :key="idx" class="week-day" :class="{ completed: day.completed, current: day.day === state.day }">
            <span class="day-num">第{{ day.day }}天</span>
            <span class="day-status">{{ day.completed ? '✓' : '○' }}</span>
          </div>
        </div>
      </div>

      <div class="trainee-progress">
        <h5>练习生进度</h5>
        <div
          v-for="tp in progress.traineeProgress" :key="tp.trainee.id" class="trainee-row">
          <span class="trainee-name">{{ tp.trainee.name }}</span>
          <div class="trainee-bar">
            <div class="trainee-track">
              <div class="trainee-fill" :class="{ achieved: tp.achieved }" :style="{ width: tp.progress + '%' }"></div>
            </div>
          </div>
          <span class="trainee-value" :class="{ achieved: tp.achieved }">
            <template v-if="progress.theme.targetType === 'rest'">
              疲劳 {{ Math.round(tp.current) }}≤{{ tp.target }}
            </template>
            <template v-else>
              {{ Math.round(tp.current) }}/{{ tp.target }}
            </template>
          </span>
        </div>
      </div>
    </div>

    <div v-else class="no-theme">
      <p class="empty-text">暂无进行中的企划</p>
      <button class="btn primary" @click="showThemeSelector = true">
        选择训练主题
      </button>
    </div>

    <div v-if="state.planning.completedThemes.length > 0" class="history">
      <h5>历史记录</h5>
      <div class="history-list">
        <div
          v-for="(item, idx) in recentHistory" :key="idx" class="history-item" :class="{ achieved: item.achieved }">
          <span class="history-icon">{{ themes[item.theme]?.icon }}</span>
          <span class="history-name">{{ themes[item.theme]?.label }}</span>
          <span class="history-days">第{{ item.startDay }}-{{ item.endDay }}天</span>
          <span class="history-result">
            {{ item.achieved ? '✓ 成功' : '○ 未完成' }}
            ({{ item.count }}/{{ item.target }})
          </span>
        </div>
      </div>
    </div>

    <div v-if="showThemeSelector" class="theme-selector-overlay" @click.self="showThemeSelector = false">
      <div class="theme-selector card">
        <h4>选择训练主题</h4>
        <p class="hint">选择一个为期7天的训练主题，达成目标可获得事务所奖励</p>

        <div class="theme-list">
          <div
            v-for="(theme, key) in themes" :key="key" class="theme-option" :class="{ selected: selectedTheme === key }" @click="selectedTheme = key">
            <span class="option-icon">{{ theme.icon }}</span>
            <div class="option-info">
              <h5>{{ theme.label }}</h5>
              <p>{{ theme.description }}</p>
              <div class="option-target">
                <span class="target-label">目标：</span>
                <span v-if="theme.targetStat">
                  {{ theme.targetCount }}人{{ statLabels[theme.targetStat] }}≥{{ theme.targetValue }}</span>
                <span v-else-if="theme.targetType === 'score'">
                  {{ theme.targetCount }}人综合评分≥{{ theme.targetValue }}</span>
                <span v-else-if="theme.targetType === 'debut_ready'">
                  {{ theme.targetCount }}人达到出道标准
                </span>
                <span v-else-if="theme.targetType === 'rest'">
                  {{ theme.targetCount }}人疲劳≤{{ theme.targetValue }}
                </span>
              </div>
              <div class="option-reward">
                <span class="reward-label">奖励：</span>
                <span v-if="theme.bonus.money">💰¥{{ theme.bonus.money.toLocaleString() }} </span>
                <span v-if="theme.bonus.fans">👥{{ theme.bonus.fans }}粉丝 </span>
                <span v-if="theme.bonus.statBoost">
                  📈全员{{ statLabels[theme.bonus.statBoost.stat] }}+{{ theme.bonus.statBoost.value }}
                </span>
                <span v-if="theme.bonus.fatigueReduction">😌疲劳-{{ theme.bonus.fatigueReduction }} </span>
                <span v-if="theme.bonus.stressReduction">🧘压力-{{ theme.bonus.stressReduction }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="selector-actions">
          <button class="btn ghost" @click="showThemeSelector = false">取消</button>
          <button class="btn primary" :disabled="!selectedTheme" @click="confirmTheme">
            启动企划
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { GAME_CONFIG } from '../config/gameConfig'
import { getPlanningProgress } from '../utils/gameLogic'

const props = defineProps({
  state: Object,
  currentDay: Number,
})

const emit = defineEmits(['start-theme'])

const themes = GAME_CONFIG.planning.themes
const statLabels = GAME_CONFIG.statLabels

const showThemeSelector = ref(false)
const selectedTheme = ref('')

const progress = computed(() => {
  if (!props.state) return null
  return getPlanningProgress(props.state)
})

const recentHistory = computed(() => {
  if (!props.state?.planning?.completedThemes) return []
  return [...props.state.planning.completedThemes].reverse().slice(0, 5)
})

function confirmTheme() {
  if (!selectedTheme.value) return
  emit('start-theme', selectedTheme.value, props.state.day)
  showThemeSelector.value = false
  selectedTheme.value = ''
}
</script>

<style scoped>
.planning-center {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h3 {
  margin: 0;
}

.current-theme {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.theme-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--accent-soft);
  border-radius: 8px;
}

.theme-icon {
  font-size: 2rem;
}

.theme-info {
  flex: 1;
}

.theme-info h4 {
  margin: 0;
  font-size: 1.05rem;
}

.theme-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.theme-days {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--accent);
}

.progress-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-track {
  flex: 1;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-soft));
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.85rem;
  font-weight: 600;
  min-width: 48px;
  text-align: right;
}

.target-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.target-count .label {
  color: var(--text-muted);
  margin-right: 0.5rem;
}

.target-count .value {
  font-weight: 600;
}

.target-count .value.achieved {
  color: var(--success);
}

.days-remaining {
  color: var(--text-muted);
}

.weekly-schedule h5,
.trainee-progress h5,
.history h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.week-days {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.week-day {
  flex: 1;
  min-width: 60px;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  text-align: center;
  font-size: 0.75rem;
  transition: all 0.2s;
}

.week-day.completed {
  background: var(--success-soft);
  color: var(--success);
}

.week-day.current {
  border: 2px solid var(--accent);
  font-weight: 600;
}

.day-num {
  display: block;
  margin-bottom: 0.25rem;
}

.day-status {
  font-size: 1rem;
}

.trainee-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.trainee-name {
  width: 72px;
  font-size: 0.9rem;
  font-weight: 500;
}

.trainee-bar {
  flex: 1;
}

.trainee-track {
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.trainee-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.3s;
}

.trainee-fill.achieved {
  background: var(--success);
}

.trainee-value {
  min-width: 60px;
  text-align: right;
  font-size: 0.8rem;
  font-family: monospace;
}

.trainee-value.achieved {
  color: var(--success);
  font-weight: 600;
}

.no-theme {
  text-align: center;
  padding: 2rem 1rem;
}

.empty-text {
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.history {
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  font-size: 0.8rem;
}

.history-item.achieved {
  background: var(--success-soft);
}

.history-icon {
  font-size: 1.1rem;
}

.history-name {
  flex: 1;
  font-weight: 500;
}

.history-days {
  color: var(--text-muted);
}

.history-result {
  font-weight: 600;
}

.history-item.achieved .history-result {
  color: var(--success);
}

.theme-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 150;
}

.theme-selector {
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.theme-selector h4 {
  margin: 0;
}

.hint {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
}

.theme-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.theme-option {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-option:hover {
  border-color: var(--accent);
}

.theme-option.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.option-icon {
  font-size: 2rem;
}

.option-info {
  flex: 1;
}

.option-info h5 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
}

.option-info p {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.option-target,
.option-reward {
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.target-label,
.reward-label {
  color: var(--text-muted);
  font-weight: 500;
}

.selector-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
