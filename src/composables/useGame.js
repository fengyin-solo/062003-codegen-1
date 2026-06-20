import { ref, computed } from 'vue'
import { GAME_CONFIG } from '../config/gameConfig'
import {
  createInitialGameState,
  processDay,
  resolvePoachingEvent,
  debutGroup,
  releaseSingle,
  getRatingResults,
  calcProfit,
  calcTraineeScore,
  getRelationship,
} from '../utils/gameLogic'
import { saveToSlot } from '../utils/storage'

export function useGame() {
  const state = ref(null)
  const currentSlot = ref(null)
  const screen = ref('menu') // menu | game

  const profit = computed(() => (state.value ? calcProfit(state.value) : 0))
  const daysLeft = computed(() =>
    state.value ? Math.max(0, GAME_CONFIG.victory.totalDays - state.value.day) : 0
  )
  const activeTrainees = computed(() =>
    state.value ? state.value.trainees.filter((t) => t.status !== 'left') : []
  )

  function startNewGame(slotIndex) {
    state.value = createInitialGameState()
    currentSlot.value = slotIndex
    screen.value = 'game'
    autoSave()
  }

  function loadGame(slotIndex, saved) {
    state.value = JSON.parse(JSON.stringify(saved.gameState))
    currentSlot.value = slotIndex
    screen.value = 'game'
  }

  function autoSave() {
    if (state.value && currentSlot.value !== null) {
      saveToSlot(currentSlot.value, {
        name: `存档 ${currentSlot.value + 1}`,
        gameState: state.value,
      })
    }
  }

  function setSchedule(traineeId, activity) {
    if (!state.value) return
    state.value.schedule = { ...state.value.schedule, [traineeId]: activity }
  }

  function clearSchedule() {
    if (!state.value) return
    state.value.schedule = {}
  }

  function canEndDay() {
    if (!state.value) return false
    const active = activeTrainees.value.filter((t) => t.illnessDays === 0)
    return active.every((t) => state.value.schedule[t.id])
  }

  function endDay() {
    if (!state.value || !canEndDay()) return
    state.value = processDay(state.value)
    autoSave()
  }

  function handlePoaching(keep) {
    if (!state.value) return
    state.value = resolvePoachingEvent(state.value, keep)
    autoSave()
  }

  function handleDebut(memberIds, groupName) {
    if (!state.value) return null
    const result = debutGroup(state.value, memberIds, groupName)
    if (result.success) {
      state.value = result.state
      autoSave()
    }
    return result
  }

  function handleReleaseSingle(groupId) {
    if (!state.value) return null
    const result = releaseSingle(state.value, groupId)
    if (result.success) {
      state.value = result.state
      autoSave()
    }
    return result
  }

  function dismissRating() {
    if (!state.value) return
    state.value.pendingRating = false
    autoSave()
  }

  function backToMenu() {
    autoSave()
    screen.value = 'menu'
  }

  function getRel(idA, idB) {
    if (!state.value) return 0
    return getRelationship(state.value.relationships, idA, idB)
  }

  return {
    state,
    currentSlot,
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
    getRel,
    getRatingResults: () => (state.value ? getRatingResults(state.value) : []),
    calcTraineeScore,
    autoSave,
  }
}
