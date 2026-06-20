import { ref, watch } from 'vue'
import { loadTheme, saveTheme } from '../utils/storage'

export function useTheme() {
  const theme = ref(loadTheme())

  watch(theme, (val) => {
    saveTheme(val)
    document.documentElement.setAttribute('data-theme', val)
  }, { immediate: true })

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  return { theme, toggleTheme }
}
