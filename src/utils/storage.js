import { GAME_CONFIG } from '../config/gameConfig'

const { savesKey, themeKey, maxSlots } = GAME_CONFIG.storage

export function loadAllSaves() {
  try {
    const raw = localStorage.getItem(savesKey)
    if (!raw) return createEmptySlots()
    const data = JSON.parse(raw)
    while (data.length < maxSlots) data.push(null)
    return data.slice(0, maxSlots)
  } catch {
    return createEmptySlots()
  }
}

function createEmptySlots() {
  return Array.from({ length: maxSlots }, () => null)
}

export function saveToSlot(slotIndex, payload) {
  const slots = loadAllSaves()
  slots[slotIndex] = {
    ...payload,
    savedAt: Date.now(),
  }
  localStorage.setItem(savesKey, JSON.stringify(slots))
}

export function deleteSlot(slotIndex) {
  const slots = loadAllSaves()
  slots[slotIndex] = null
  localStorage.setItem(savesKey, JSON.stringify(slots))
}

export function loadTheme() {
  return localStorage.getItem(themeKey) || 'light'
}

export function saveTheme(theme) {
  localStorage.setItem(themeKey, theme)
}
