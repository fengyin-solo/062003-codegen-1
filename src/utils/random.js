export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randFloat(min, max) {
  return Math.random() * (max - min) + min
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0)
  let roll = Math.random() * total
  for (const item of items) {
    roll -= item.weight
    if (roll <= 0) return item
  }
  return items[items.length - 1]
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

export function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}
