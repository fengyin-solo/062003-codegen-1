<template>
  <SaveManager
    v-if="screen === 'menu'"
    :slots="slots"
    :theme="theme"
    @new="onNew"
    @load="onLoad"
    @delete="onDelete"
    @toggle-theme="toggleTheme"
  />
  <GameView
    v-else-if="state"
    :state="state"
    :active-trainees="activeTrainees"
    :days-left="daysLeft"
    :profit="profit"
    :theme="theme"
    :can-end-day="canEndDay()"
    :rating-results="getRatingResults()"
    :calc-score="calcTraineeScore"
    @back="backToMenu"
    @toggle-theme="toggleTheme"
    @set-schedule="setSchedule"
    @clear-schedule="clearSchedule"
    @end-day="endDay"
    @dismiss-rating="dismissRating"
    @debut="onDebut"
    @resolve-poaching="handlePoaching"
    @release-single="onReleaseSingle"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SaveManager from './components/SaveManager.vue'
import GameView from './components/GameView.vue'
import { useTheme } from './composables/useTheme'
import { useGame } from './composables/useGame'
import { loadAllSaves, deleteSlot } from './utils/storage'

const { theme, toggleTheme } = useTheme()
const slots = ref([])

const {
  state,
  screen,
  profit,
  daysLeft,
  activeTrainees,
  startNewGame,
  loadGame,
  setSchedule,
  clearSchedule,
  canEndDay,
  endDay,
  handlePoaching,
  handleDebut,
  handleReleaseSingle,
  dismissRating,
  backToMenu,
  getRatingResults,
  calcTraineeScore,
} = useGame()

onMounted(() => {
  slots.value = loadAllSaves()
})

function refreshSlots() {
  slots.value = loadAllSaves()
}

function onNew(i) {
  startNewGame(i)
  refreshSlots()
}

function onLoad(i, slot) {
  loadGame(i, slot)
}

function onDelete(i) {
  if (confirm('确定删除此存档？')) {
    deleteSlot(i)
    refreshSlots()
  }
}

function onDebut(memberIds, groupName, callback) {
  const result = handleDebut(memberIds, groupName)
  if (callback) callback(result)
}

function onReleaseSingle(groupId) {
  const result = handleReleaseSingle(groupId)
  if (result && !result.success) {
    alert(result.message)
  }
}
</script>
