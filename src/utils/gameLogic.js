import { GAME_CONFIG } from '../config/gameConfig'
import { randInt, randFloat, pickRandom, weightedPick, clamp, pairKey } from './random'

const CFG = GAME_CONFIG

export function createInitialGameState() {
  const names = [...CFG.names].sort(() => Math.random() - 0.5)
  const trainees = []
  for (let i = 0; i < CFG.initial.traineeCount; i++) {
    trainees.push(createTrainee(names[i], i))
  }
  return {
    day: 1,
    money: CFG.initial.money,
    fans: CFG.initial.fans,
    totalRevenue: 0,
    totalExpenses: 0,
    trainees,
    groups: [],
    relationships: initRelationships(trainees),
    schedule: {},
    logs: [{ day: 1, text: '事务所成立！五位练习生已就位，三年征途正式开始。' }],
    pendingEvent: null,
    pendingRating: false,
    gameStatus: 'playing',
    lastSingleDay: {},
    planning: {
      currentTheme: null,
      themeStartDay: null,
      themeEndDay: null,
      weeklySchedule: [],
      completedThemes: [],
      themeProgress: {},
    },
  }
}

function createTrainee(name, index) {
  const stats = {}
  for (const key of CFG.stats) {
    stats[key] = randInt(CFG.initial.statMin, CFG.initial.statMax)
  }
  return {
    id: `t${index}_${Date.now()}`,
    name,
    stats,
    fatigue: CFG.initial.fatigue + randInt(-5, 5),
    stress: CFG.initial.stress + randInt(-3, 3),
    status: 'trainee',
    groupId: null,
    illnessDays: 0,
    poachResist: randInt(40, 70),
    fans: 0,
    singlesReleased: 0,
  }
}

function initRelationships(trainees) {
  const rel = {}
  for (let i = 0; i < trainees.length; i++) {
    for (let j = i + 1; j < trainees.length; j++) {
      rel[pairKey(trainees[i].id, trainees[j].id)] = randInt(
        CFG.relationships.initialRange[0],
        CFG.relationships.initialRange[1]
      )
    }
  }
  return rel
}

export function calcTraineeScore(trainee) {
  const w = CFG.rating.scoreWeights
  let score = 0
  for (const key of CFG.stats) {
    score += trainee.stats[key] * w[key]
  }
  const fatiguePenalty = trainee.fatigue > CFG.thresholds.fatigueExhausted ? 0.85 : 1
  const stressPenalty = trainee.stress > CFG.thresholds.stressHigh ? 0.9 : 1
  return Math.round(score * fatiguePenalty * stressPenalty)
}

export function getRelationship(relationships, idA, idB) {
  return relationships[pairKey(idA, idB)] ?? 0
}

export function setRelationship(relationships, idA, idB, value) {
  relationships[pairKey(idA, idB)] = clamp(
    value,
    CFG.relationships.min,
    CFG.relationships.max
  )
}

export function getActiveTrainees(state) {
  return state.trainees.filter((t) => t.status !== 'left')
}

export function getDebutedTrainees(state) {
  return state.trainees.filter((t) => t.status === 'debuted')
}

export function calcProfit(state) {
  return state.totalRevenue - state.totalExpenses
}

export function checkVictory(state) {
  const profit = calcProfit(state)
  const groups = state.groups.length
  const goalsMet =
    groups >= CFG.victory.targetGroups &&
    (!CFG.victory.requirePositiveProfit || profit > 0)

  if (goalsMet) return 'won'

  if (state.day > CFG.victory.totalDays) {
    if (groups < CFG.victory.targetGroups) return 'lost_groups'
    if (CFG.victory.requirePositiveProfit && profit <= 0) return 'lost_profit'
  }
  if (state.money < -20000) return 'lost_bankrupt'
  const active = getActiveTrainees(state)
  if (active.length === 0 && state.groups.length === 0) return 'lost_empty'
  return null
}

function applyRange(val, range, mult = 1) {
  if (!range || range.length < 2) return val
  return val + randInt(Math.round(range[0] * mult), Math.round(range[1] * mult))
}

function getTrainingMultiplier(trainee, partners, relationships) {
  let mult = 1
  if (trainee.fatigue >= CFG.thresholds.fatigueExhausted) mult *= 0.5
  if (trainee.stress >= CFG.thresholds.stressHigh) mult *= 0.8
  if (trainee.stress >= CFG.thresholds.stressBreakdown) mult *= 0

  let synergyCount = 0
  for (const p of partners) {
    const rel = getRelationship(relationships, trainee.id, p.id)
    if (rel >= CFG.relationships.synergyThreshold) synergyCount++
  }
  if (synergyCount > 0) {
    mult *= 1 + CFG.relationships.synergyBonus * Math.min(synergyCount, 2)
  }
  return mult
}

export function processDay(state) {
  const logs = []
  let money = state.money
  let fans = state.fans
  let totalRevenue = state.totalRevenue
  let totalExpenses = state.totalExpenses
  const relationships = { ...state.relationships }
  let trainees = state.trainees.map((t) => ({ ...t, stats: { ...t.stats } }))
  const schedule = state.schedule

  const activityGroups = {}
  for (const [traineeId, activity] of Object.entries(schedule)) {
    if (!activityGroups[activity]) activityGroups[activity] = []
    activityGroups[activity].push(traineeId)
  }

  for (const trainee of trainees) {
    if (trainee.status === 'left') continue

    if (trainee.illnessDays > 0) {
      trainee.illnessDays--
      trainee.fatigue = clamp(trainee.fatigue - 5, 0, 100)
      logs.push({ day: state.day, text: `${trainee.name} 仍在休养中（剩余 ${trainee.illnessDays} 天）。` })
      continue
    }

    if (trainee.fatigue >= CFG.thresholds.fatigueCollapse) {
      trainee.fatigue = applyRange(trainee.fatigue, CFG.activities.rest.fatigue)
      trainee.stress = applyRange(trainee.stress, CFG.activities.rest.stress)
      logs.push({ day: state.day, text: `${trainee.name} 过度疲劳，被迫休息。` })
      continue
    }

    const activityKey = schedule[trainee.id]
    if (!activityKey) {
      logs.push({ day: state.day, text: `${trainee.name} 今日未安排日程。` })
      continue
    }

    const activity = CFG.activities[activityKey]
    if (!activity) continue

    money -= activity.moneyCost
    totalExpenses += activity.moneyCost

    const partners = (activityGroups[activityKey] || [])
      .filter((id) => id !== trainee.id)
      .map((id) => trainees.find((t) => t.id === id))
      .filter(Boolean)

    const mult = getTrainingMultiplier(trainee, partners, relationships)

    if (activity.requiresTraining && trainee.stress >= CFG.thresholds.stressBreakdown) {
      logs.push({ day: state.day, text: `${trainee.name} 压力过大，无法集中精力训练。` })
      trainee.stress = clamp(trainee.stress + randInt(2, 5), 0, 100)
      continue
    }

    for (const [stat, range] of Object.entries(activity.statGain || {})) {
      const gain = randInt(range[0], range[1])
      trainee.stats[stat] = clamp(
        trainee.stats[stat] + Math.round(gain * mult),
        0,
        CFG.thresholds.statCap
      )
    }

    trainee.fatigue = clamp(applyRange(trainee.fatigue, activity.fatigue), 0, 100)
    trainee.stress = clamp(applyRange(trainee.stress, activity.stress), 0, 100)

    if (activity.fansGain) {
      const gained = randInt(activity.fansGain[0], activity.fansGain[1])
      fans += gained
      trainee.fans += Math.round(gained * 0.3)
      logs.push({ day: state.day, text: `${trainee.name} 参与公关，粉丝 +${gained}。` })
    }

    for (const p of partners) {
      const cur = getRelationship(relationships, trainee.id, p.id)
      setRelationship(
        relationships,
        trainee.id,
        p.id,
        cur + randInt(CFG.relationships.trainingTogether[0], CFG.relationships.trainingTogether[1])
      )
    }
  }

  for (let i = 0; i < trainees.length; i++) {
    for (let j = i + 1; j < trainees.length; j++) {
      const a = trainees[i]
      const b = trainees[j]
      if (a.status === 'left' || b.status === 'left') continue

      const key = pairKey(a.id, b.id)
      let rel = relationships[key] ?? 0
      rel += randInt(CFG.relationships.dailyDrift[0], CFG.relationships.dailyDrift[1])
      rel = clamp(rel, CFG.relationships.min, CFG.relationships.max)

      const maxStat = (t) => Math.max(...CFG.stats.map((s) => t.stats[s]))
      const gap = Math.abs(maxStat(a) - maxStat(b))
      if (gap >= CFG.relationships.statGapCompetition) {
        rel -= randInt(2, 6)
        const weaker = maxStat(a) < maxStat(b) ? a : b
        weaker.stress = clamp(
          weaker.stress + randInt(CFG.relationships.competitionStress[0], CFG.relationships.competitionStress[1]),
          0,
          100
        )
        if (rel <= CFG.relationships.competitionThreshold) {
          logs.push({
            day: state.day,
            text: `${weaker.name} 感受到来自 ${weaker === a ? b.name : a.name} 的竞争压力！`,
          })
        }
      }

      relationships[key] = rel
    }
  }

  const themeBonusResult = applyDailyThemeBonus(state, trainees, schedule, state.day)
  if (themeBonusResult.fansGain > 0) {
    fans += themeBonusResult.fansGain
    logs.push({ day: state.day, text: `✨ 企划主题加成，粉丝 +${themeBonusResult.fansGain}` })
  }

  const dailyCost =
    CFG.dailyCosts.baseOperatingCost +
    trainees.filter((t) => t.status === 'trainee').length * CFG.dailyCosts.perTraineeCost +
    trainees.filter((t) => t.status === 'debuted').length * CFG.dailyCosts.perDebutedCost +
    state.groups.length * CFG.dailyCosts.perGroupCost

  money -= dailyCost
  totalExpenses += dailyCost

  const newDay = state.day + 1
  const pendingRating = state.day % CFG.rating.interval === 0

  let pendingEvent = null
  if (Math.random() < CFG.events.dailyChance) {
    pendingEvent = generateRandomEvent(trainees, state.day)
    if (pendingEvent.type === 'fan_surge') {
      fans += pendingEvent.fansGain
      logs.push({ day: state.day, text: `【${pendingEvent.label}】粉丝 +${pendingEvent.fansGain}！` })
      pendingEvent = null
    } else if (pendingEvent.type === 'inspiration') {
      const target = pendingEvent.target
      const stat = pickRandom(CFG.stats)
      target.stats[stat] = clamp(target.stats[stat] + pendingEvent.statBoost, 0, CFG.thresholds.statCap)
      logs.push({
        day: state.day,
        text: `【${pendingEvent.label}】${target.name} 的${CFG.statLabels[stat]} +${pendingEvent.statBoost}！`,
      })
      pendingEvent = null
    } else if (pendingEvent.type === 'negative_news') {
      fans = Math.max(0, fans - pendingEvent.fansLoss)
      for (const t of trainees) {
        if (t.status !== 'left') {
          t.stress = clamp(t.stress + pendingEvent.stressGain, 0, 100)
        }
      }
      logs.push({
        day: state.day,
        text: `【${pendingEvent.label}】粉丝 -${pendingEvent.fansLoss}，全员压力上升。`,
      })
      pendingEvent = null
    } else if (pendingEvent.type === 'illness') {
      pendingEvent.target.illnessDays = pendingEvent.duration
      pendingEvent.target.stress = clamp(
        pendingEvent.target.stress + pendingEvent.stressGain,
        0,
        100
      )
      logs.push({
        day: state.day,
        text: `【${pendingEvent.label}】${pendingEvent.target.name} 需要休养 ${pendingEvent.duration} 天。`,
      })
      pendingEvent = null
    }
  }

  const planningResult = processPlanningDay(
    { ...state, day: newDay },
    trainees
  )

  let planning = planningResult.planning
  if (
    state.planning.currentTheme &&
    state.planning.themeEndDay &&
    newDay > state.planning.themeEndDay
  ) {
    const rewardState = applyThemeRewards({
      ...state,
      day: newDay,
      money,
      fans,
      totalRevenue,
      trainees,
      logs: [...state.logs, ...logs],
      planning: state.planning,
    })
    money = rewardState.money
    fans = rewardState.fans
    totalRevenue = rewardState.totalRevenue
    trainees = rewardState.trainees
    planning = rewardState.planning
    logs.push(...rewardState.logs.slice(state.logs.length))
  }

  const nextState = {
    ...state,
    day: newDay,
    money,
    fans,
    totalRevenue,
    totalExpenses,
    trainees,
    relationships,
    schedule: {},
    logs: [...state.logs, ...logs],
    pendingEvent,
    pendingRating,
    planning,
  }

  const result = checkVictory(nextState)
  if (result) nextState.gameStatus = result

  return nextState
}

function generateRandomEvent(trainees, day) {
  const active = trainees.filter((t) => t.status !== 'left' && t.illnessDays === 0)
  if (active.length === 0) return null

  const types = Object.entries(CFG.events.types).map(([key, val]) => ({
    key,
    ...val,
  }))
  const picked = weightedPick(types)
  const target = pickRandom(active)

  const event = {
    type: picked.key,
    label: picked.label,
    description: picked.description,
    day,
    target,
    resolved: false,
  }

  switch (picked.key) {
    case 'poaching':
      event.successChance = picked.successChance
      break
    case 'illness':
      event.duration = randInt(picked.duration[0], picked.duration[1])
      event.stressGain = randInt(picked.stressGain[0], picked.stressGain[1])
      break
    case 'inspiration':
      event.statBoost = randInt(picked.statBoost[0], picked.statBoost[1])
      break
    case 'negative_news':
      event.fansLoss = randInt(picked.fansLoss[0], picked.fansLoss[1])
      event.stressGain = randInt(picked.stressGain[0], picked.stressGain[1])
      break
    case 'fan_surge':
      event.fansGain = randInt(picked.fansGain[0], picked.fansGain[1])
      break
  }

  return event
}

export function resolvePoachingEvent(state, keepTrainee) {
  const event = state.pendingEvent
  if (!event || event.type !== 'poaching') return state

  const logs = [...state.logs]
  const trainees = state.trainees.map((t) => ({ ...t, stats: { ...t.stats } }))
  const target = trainees.find((t) => t.id === event.target.id)

  if (keepTrainee) {
    const cost = randInt(8000, 15000)
    logs.push({
      day: state.day,
      text: `【挖角危机】你花费 ¥${cost} 成功挽留 ${target.name}！`,
    })
    target.stress = clamp(target.stress + randInt(5, 12), 0, 100)
    return {
      ...state,
      money: state.money - cost,
      totalExpenses: state.totalExpenses + cost,
      trainees,
      logs,
      pendingEvent: null,
    }
  }

  const roll = Math.random()
  const resist = target.poachResist / 100
  if (roll > event.successChance * (1 - resist * 0.5)) {
    logs.push({ day: state.day, text: `【挖角危机】${target.name} 决定留在事务所。` })
    return { ...state, trainees, logs, pendingEvent: null }
  }

  target.status = 'left'
  logs.push({ day: state.day, text: `【挖角危机】${target.name} 被竞争对手挖走，离开了事务所！` })
  const result = checkVictory({ ...state, trainees })
  return {
    ...state,
    trainees,
    logs,
    pendingEvent: null,
    gameStatus: result || state.gameStatus,
  }
}

export function debutGroup(state, memberIds, groupName) {
  const members = state.trainees.filter((t) => memberIds.includes(t.id))
  if (members.length < CFG.rating.minGroupSize || members.length > CFG.rating.maxGroupSize) {
    return { success: false, message: `出道人数需在 ${CFG.rating.minGroupSize}-${CFG.rating.maxGroupSize} 人之间` }
  }

  for (const m of members) {
    if (m.status !== 'trainee') return { success: false, message: `${m.name} 无法出道` }
    if (calcTraineeScore(m) < CFG.rating.debutScoreThreshold) {
      return { success: false, message: `${m.name} 综合评分未达标（需 ≥${CFG.rating.debutScoreThreshold}）` }
    }
  }

  const groupId = `g_${Date.now()}`
  const trainees = state.trainees.map((t) => {
    if (memberIds.includes(t.id)) {
      return { ...t, status: 'debuted', groupId }
    }
    return t
  })

  const avgStats = {}
  for (const key of CFG.stats) {
    avgStats[key] = Math.round(members.reduce((s, m) => s + m.stats[key], 0) / members.length)
  }

  const groups = [
    ...state.groups,
    {
      id: groupId,
      name: groupName || `${members.map((m) => m.name[0]).join('')}组`,
      memberIds: [...memberIds],
      debutedDay: state.day,
      avgStats,
      totalSales: 0,
      singles: [],
    },
  ]

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `🎉 组合「${groupName || groups[groups.length - 1].name}」正式出道！成员：${members.map((m) => m.name).join('、')}`,
    },
  ]

  return {
    success: true,
    state: { ...state, trainees, groups, logs, pendingRating: false },
  }
}

export function releaseSingle(state, groupId) {
  const group = state.groups.find((g) => g.id === groupId)
  if (!group) return { success: false, message: '组合不存在' }

  const lastDay = state.lastSingleDay[groupId] || 0
  if (state.day - lastDay < CFG.single.cooldownDays) {
    return {
      success: false,
      message: `距上次发歌还需 ${CFG.single.cooldownDays - (state.day - lastDay)} 天`,
    }
  }

  if (state.money < CFG.single.creationCost) {
    return { success: false, message: '资金不足' }
  }

  const members = state.trainees.filter((t) => group.memberIds.includes(t.id))
  const statAvg =
    CFG.stats.reduce((s, k) => s + group.avgStats[k], 0) / CFG.stats.length
  const charmAvg = group.avgStats.charm
  const popularity = state.fans + members.reduce((s, m) => s + m.fans, 0)

  const sales = Math.round(
    CFG.single.baseSales +
      statAvg * CFG.single.statWeight * 50 +
      popularity * CFG.single.fansWeight * 0.08 +
      charmAvg * CFG.single.charmWeight * 30 +
      randInt(-200, 400)
  )

  const revenue = sales * CFG.single.revenuePerSale
  const groups = state.groups.map((g) => {
    if (g.id !== groupId) return g
    return {
      ...g,
      totalSales: g.totalSales + sales,
      singles: [
        ...g.singles,
        { day: state.day, sales, revenue, title: `单曲 Vol.${g.singles.length + 1}` },
      ],
    }
  })

  const trainees = state.trainees.map((t) => {
    if (!group.memberIds.includes(t.id)) return t
    return { ...t, singlesReleased: t.singlesReleased + 1, fans: t.fans + Math.round(sales * 0.05) }
  })

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `💿 ${group.name} 发行新单曲，销量 ${sales.toLocaleString()}，收入 ¥${revenue.toLocaleString()}！`,
    },
  ]

  return {
    success: true,
    state: {
      ...state,
      money: state.money - CFG.single.creationCost + revenue,
      totalRevenue: state.totalRevenue + revenue,
      totalExpenses: state.totalExpenses + CFG.single.creationCost,
      fans: state.fans + Math.round(sales * 0.02),
      groups,
      trainees,
      logs,
      lastSingleDay: { ...state.lastSingleDay, [groupId]: state.day },
    },
    sales,
    revenue,
  }
}

export function getRatingResults(state) {
  return getActiveTrainees(state)
    .filter((t) => t.status === 'trainee')
    .map((t) => ({
      ...t,
      score: calcTraineeScore(t),
      canDebut: calcTraineeScore(t) >= CFG.rating.debutScoreThreshold,
    }))
    .sort((a, b) => b.score - a.score)
}

export function setPlanningTheme(state, themeKey, startDay) {
  const theme = CFG.planning.themes[themeKey]
  if (!theme) return { success: false, message: '主题不存在' }

  if (state.planning.currentTheme) {
    return { success: false, message: '当前已有进行中的企划' }
  }

  const endDay = startDay + CFG.planning.themeDuration - 1
  const weeklySchedule = []
  for (let i = 0; i < CFG.planning.weekDays; i++) {
    weeklySchedule.push({
      day: startDay + i,
      theme: themeKey,
      activities: [],
      completed: false,
    })
  }

  const planning = {
    ...state.planning,
    currentTheme: themeKey,
    themeStartDay: startDay,
    themeEndDay: endDay,
    weeklySchedule,
    themeProgress: {
      startStats: {},
      currentStats: {},
    },
  }

  const activeTrainees = getActiveTrainees(state).filter((t) => t.status === 'trainee')
  for (const trainee of activeTrainees) {
    planning.themeProgress.startStats[trainee.id] = { ...trainee.stats }
    planning.themeProgress.currentStats[trainee.id] = { ...trainee.stats }
  }

  const logs = [
    ...state.logs,
    {
      day: state.day,
      text: `📋 月度企划启动：${theme.icon} ${theme.label}，持续7天（第${startDay}-${endDay}天）`,
    },
  ]

  return {
    success: true,
    state: { ...state, planning, logs },
  }
}

function checkThemeTargets(state) {
  if (!state.planning.currentTheme) return { achieved: false, count: 0 }

  const themeKey = state.planning.currentTheme
  const theme = CFG.planning.themes[themeKey]
  const activeTrainees = getActiveTrainees(state).filter((t) => t.status === 'trainee')

  let achievedCount = 0

  for (const trainee of activeTrainees) {
    let achieved = false

    if (theme.targetType === 'score') {
      const score = calcTraineeScore(trainee)
      achieved = score >= theme.targetValue
    } else if (theme.targetType === 'debut_ready') {
      achieved = calcTraineeScore(trainee) >= CFG.rating.debutScoreThreshold
    } else if (theme.targetType === 'rest') {
      achieved = trainee.fatigue <= theme.targetValue
    } else if (theme.targetStat) {
      achieved = trainee.stats[theme.targetStat] >= theme.targetValue
    }

    if (achieved) achievedCount++
  }

  return {
    achieved: achievedCount >= theme.targetCount,
    count: achievedCount,
    target: theme.targetCount,
  }
}

function applyThemeRewards(state) {
  if (!state.planning.currentTheme) return state

  const themeKey = state.planning.currentTheme
  const theme = CFG.planning.themes[themeKey]
  const result = checkThemeTargets(state)

  let money = state.money
  let fans = state.fans
  let totalRevenue = state.totalRevenue
  const logs = [...state.logs]
  const trainees = state.trainees.map((t) => ({ ...t, stats: { ...t.stats } }))
  const activeTrainees = trainees.filter((t) => t.status !== 'left')

  if (result.achieved) {
    logs.push({
      day: state.day,
      text: `🎉 企划「${theme.label}」目标达成！获得事务所奖励！`,
    })

    if (theme.bonus.money) {
      money += theme.bonus.money
      totalRevenue += theme.bonus.money
      logs.push({
        day: state.day,
        text: `💰 资金奖励 +¥${theme.bonus.money.toLocaleString()}`,
      })
    }

    if (theme.bonus.fans) {
      fans += theme.bonus.fans
      logs.push({
        day: state.day,
        text: `👥 粉丝奖励 +${theme.bonus.fans.toLocaleString()}`,
      })
    }

    if (theme.bonus.statBoost) {
      const { stat, value } = theme.bonus.statBoost
      for (const trainee of activeTrainees) {
        trainee.stats[stat] = clamp(
          trainee.stats[stat] + value,
          0,
          CFG.thresholds.statCap
        )
      }
      logs.push({
        day: state.day,
        text: `📈 全员${CFG.statLabels[stat]} +${value}`,
      })
    }

    if (theme.bonus.fatigueReduction) {
      for (const trainee of activeTrainees) {
        trainee.fatigue = clamp(trainee.fatigue - theme.bonus.fatigueReduction, 0, 100)
      }
      logs.push({
        day: state.day,
        text: `😌 全员疲劳 -${theme.bonus.fatigueReduction}`,
      })
    }

    if (theme.bonus.stressReduction) {
      for (const trainee of activeTrainees) {
        trainee.stress = clamp(trainee.stress - theme.bonus.stressReduction, 0, 100)
      }
      logs.push({
        day: state.day,
        text: `🧘 全员压力 -${theme.bonus.stressReduction}`,
      })
    }
  } else {
    logs.push({
      day: state.day,
      text: `📋 企划「${theme.label}」结束，达成 ${result.count}/${result.target}，未获得奖励。`,
    })
  }

  const completedThemes = [
    ...state.planning.completedThemes,
    {
      theme: themeKey,
      startDay: state.planning.themeStartDay,
      endDay: state.planning.themeEndDay,
      achieved: result.achieved,
      count: result.count,
      target: result.target,
    },
  ]

  const planning = {
    ...state.planning,
    currentTheme: null,
    themeStartDay: null,
    themeEndDay: null,
    weeklySchedule: [],
    completedThemes,
    themeProgress: {},
  }

  return {
    ...state,
    money,
    fans,
    totalRevenue,
    trainees,
    logs,
    planning,
  }
}

export function applyDailyThemeBonus(state, trainees, schedule, day) {
  if (!state.planning.currentTheme) return { trainees, fansGain: 0 }

  const themeKey = state.planning.currentTheme
  const theme = CFG.planning.themes[themeKey]
  const bonus = theme.dailyBonus
  if (!bonus) return { trainees, fansGain: 0 }

  const activeTrainees = trainees.filter((t) => t.status !== 'left' && t.illnessDays === 0)
  let totalFansGain = 0

  for (const trainee of activeTrainees) {
    const activityKey = schedule[trainee.id]
    if (!activityKey) continue

    if (bonus.statGain) {
      for (const [stat, range] of Object.entries(bonus.statGain)) {
        const gain = randInt(range[0], range[1])
        trainee.stats[stat] = clamp(
          trainee.stats[stat] + gain,
          0,
          CFG.thresholds.statCap
        )
      }
    }

    if (bonus.fatigue) {
      trainee.fatigue = clamp(
        trainee.fatigue + randInt(bonus.fatigue[0], bonus.fatigue[1]),
        0,
        100
      )
    }

    if (bonus.stress) {
      trainee.stress = clamp(
        trainee.stress + randInt(bonus.stress[0], bonus.stress[1]),
        0,
        100
      )
    }

    if (bonus.fansGain) {
      const gain = randInt(bonus.fansGain[0], bonus.fansGain[1])
      totalFansGain += gain
      trainee.fans += Math.round(gain * 0.3)
    }
  }

  return { trainees, fansGain: totalFansGain }
}

export function processPlanningDay(state, trainees) {
  if (!state.planning.currentTheme) return { planning: state.planning, trainees }

  const planning = { ...state.planning }
  const currentDay = state.day

  const weekIndex = currentDay - planning.themeStartDay
  if (weekIndex >= 0 && weekIndex < planning.weeklySchedule.length) {
    planning.weeklySchedule = planning.weeklySchedule.map((day, idx) =>
      idx === weekIndex ? { ...day, completed: true } : day
    )
  }

  const activeTrainees = getActiveTrainees(state).filter((t) => t.status === 'trainee')
  for (const trainee of activeTrainees) {
    const t = trainees.find((x) => x.id === trainee.id)
    if (t) {
      planning.themeProgress.currentStats[trainee.id] = { ...t.stats }
    }
  }

  return { planning, trainees }
}

export function getPlanningProgress(state) {
  if (!state.planning.currentTheme) return null

  const themeKey = state.planning.currentTheme
  const theme = CFG.planning.themes[themeKey]
  const currentDay = state.day
  const daysPassed = currentDay - state.planning.themeStartDay + 1
  const daysTotal = CFG.planning.themeDuration
  const daysRemaining = Math.max(0, state.planning.themeEndDay - currentDay + 1)

  const result = checkThemeTargets(state)
  const activeTrainees = getActiveTrainees(state).filter((t) => t.status === 'trainee')

  const traineeProgress = activeTrainees.map((trainee) => {
    const startStats = state.planning.themeProgress.startStats[trainee.id] || trainee.stats
    let progress = 0
    let target = 0
    let current = 0

    if (theme.targetType === 'score') {
      current = calcTraineeScore(trainee)
      target = theme.targetValue
      const startScore = Object.entries(startStats).reduce(
        (s, [k, v]) => s + v * CFG.rating.scoreWeights[k],
        0
      )
      progress = target > 0 ? Math.min(100, ((current - startScore) / (target - startScore)) * 100) : 0
    } else if (theme.targetType === 'debut_ready') {
      current = calcTraineeScore(trainee)
      target = CFG.rating.debutScoreThreshold
      progress = target > 0 ? Math.min(100, (current / target) * 100) : 0
    } else if (theme.targetType === 'rest') {
      current = trainee.fatigue
      target = theme.targetValue
      progress = target > 0 ? Math.min(100, ((100 - current) / (100 - target)) * 100) : 0
    } else if (theme.targetStat) {
      current = trainee.stats[theme.targetStat]
      target = theme.targetValue
      const startValue = startStats[theme.targetStat]
      progress = target > 0 ? Math.min(100, ((current - startValue) / (target - startValue)) * 100) : 0
    }

    return {
      trainee,
      current,
      target,
      progress: Math.max(0, progress),
      achieved: current >= target,
    }
  })

  return {
    theme,
    themeKey,
    daysPassed,
    daysTotal,
    daysRemaining,
    overallProgress: Math.min(100, (daysPassed / daysTotal) * 100),
    targetAchieved: result.achieved,
    achievedCount: result.count,
    targetCount: result.target,
    traineeProgress,
    weeklySchedule: state.planning.weeklySchedule,
  }
}
