import type {
  EnginePlaytimeStats,
  MonthPlaytimeStat,
  WeekPlaytimeStat,
  DayPlaytimeStat,
} from './types'

export function getLocalDateParts(d: Date = new Date()) {
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateKey = `${year}-${pad(month)}-${pad(day)}`
  const monthKey = `${year}-${pad(month)}`
  const weekNumber = Math.ceil(day / 7)
  const weekKey = `week-${weekNumber}`
  const weekLabel = `Week ${weekNumber}`
  return { year, month, day, dateKey, monthKey, weekNumber, weekKey, weekLabel }
}

export function updatePlaytimeStats(
  stats: EnginePlaytimeStats | undefined,
  additionalSeconds: number,
  isNewLaunch = false,
  date: Date = new Date(),
): EnginePlaytimeStats {
  const { year, month, dateKey, monthKey, weekNumber, weekKey, weekLabel } =
    getLocalDateParts(date)

  const currentStats: EnginePlaytimeStats = stats
    ? {
        totalSeconds: stats.totalSeconds || 0,
        totalLaunches: stats.totalLaunches || 0,
        months: stats.months ? { ...stats.months } : {},
      }
    : {
        totalSeconds: 0,
        totalLaunches: 0,
        months: {},
      }

  currentStats.totalSeconds = Math.max(
    0,
    currentStats.totalSeconds + additionalSeconds,
  )
  if (isNewLaunch) {
    currentStats.totalLaunches = (currentStats.totalLaunches || 0) + 1
  }

  const existingMonth = currentStats.months[monthKey]
  const monthStat: MonthPlaytimeStat = existingMonth
    ? {
        ...existingMonth,
        weeks: existingMonth.weeks ? { ...existingMonth.weeks } : {},
      }
    : {
        monthKey,
        year,
        month,
        playtimeSeconds: 0,
        launchCount: 0,
        weeks: {},
      }

  monthStat.playtimeSeconds = Math.max(
    0,
    monthStat.playtimeSeconds + additionalSeconds,
  )
  if (isNewLaunch) {
    monthStat.launchCount = (monthStat.launchCount || 0) + 1
  }
  currentStats.months[monthKey] = monthStat

  const existingWeek = monthStat.weeks[weekKey]
  const weekStat: WeekPlaytimeStat = existingWeek
    ? {
        ...existingWeek,
        days: existingWeek.days ? { ...existingWeek.days } : {},
      }
    : {
        weekNumber,
        weekLabel,
        playtimeSeconds: 0,
        launchCount: 0,
        days: {},
      }

  weekStat.playtimeSeconds = Math.max(
    0,
    weekStat.playtimeSeconds + additionalSeconds,
  )
  if (isNewLaunch) {
    weekStat.launchCount = (weekStat.launchCount || 0) + 1
  }
  monthStat.weeks[weekKey] = weekStat

  const existingDay = weekStat.days[dateKey]
  const dayStat: DayPlaytimeStat = existingDay
    ? { ...existingDay }
    : {
        date: dateKey,
        playtimeSeconds: 0,
        launchCount: 0,
      }

  dayStat.playtimeSeconds = Math.max(
    0,
    dayStat.playtimeSeconds + additionalSeconds,
  )
  if (isNewLaunch) {
    dayStat.launchCount = (dayStat.launchCount || 0) + 1
  }
  weekStat.days[dateKey] = dayStat

  return currentStats
}
