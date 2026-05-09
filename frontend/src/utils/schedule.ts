function pad(value: number) {
  return String(value).padStart(2, '0')
}

function pluralize(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? '' : 's'}`
}

function weekdayLabel(dayExpression: string) {
  if (dayExpression === '1-5') {
    return 'Weekdays'
  }

  const labels = dayExpression.split(',').map((part) => {
    switch (part) {
      case '0':
      case '7':
        return 'Sun'
      case '1':
        return 'Mon'
      case '2':
        return 'Tue'
      case '3':
        return 'Wed'
      case '4':
        return 'Thu'
      case '5':
        return 'Fri'
      case '6':
        return 'Sat'
      default:
        return part
    }
  })

  return labels.join(', ')
}

export type ScheduleMode = 'daily' | 'weekdays' | 'hourly'

export interface ScheduleFormState {
  enabled: boolean
  mode: ScheduleMode
  time: string
  intervalHours: number
}

export const defaultScheduleFormState: ScheduleFormState = {
  enabled: false,
  mode: 'daily',
  time: '09:00',
  intervalHours: 6,
}

export function scheduleFormToCron(state: ScheduleFormState) {
  if (!state.enabled) {
    return ''
  }

  const [hour = '9', minute = '0'] = state.time.split(':')
  const normalizedHour = Math.max(0, Math.min(23, Number(hour) || 0))
  const normalizedMinute = Math.max(0, Math.min(59, Number(minute) || 0))

  if (state.mode === 'hourly') {
    const interval = Math.max(1, Math.min(23, state.intervalHours || 1))
    return `${normalizedMinute} */${interval} * * *`
  }

  if (state.mode === 'weekdays') {
    return `${normalizedMinute} ${normalizedHour} * * 1-5`
  }

  return `${normalizedMinute} ${normalizedHour} * * *`
}

export function cronToScheduleForm(schedule: string | null | undefined): ScheduleFormState {
  if (!schedule?.trim()) {
    return defaultScheduleFormState
  }

  const normalized = schedule.trim()
  const hourlyMatch = normalized.match(/^(\d{1,2}) \*\/(\d+) \* \* \*$/)
  if (hourlyMatch) {
    const [, minute, hours] = hourlyMatch
    return {
      enabled: true,
      mode: 'hourly',
      time: `00:${pad(Number(minute))}`,
      intervalHours: Number(hours),
    }
  }

  const weekdayMatch = normalized.match(/^(\d{1,2}) (\d{1,2}) \* \* 1-5$/)
  if (weekdayMatch) {
    const [, minute, hour] = weekdayMatch
    return {
      enabled: true,
      mode: 'weekdays',
      time: `${pad(Number(hour))}:${pad(Number(minute))}`,
      intervalHours: defaultScheduleFormState.intervalHours,
    }
  }

  const dailyMatch = normalized.match(/^(\d{1,2}) (\d{1,2}) \* \* \*$/)
  if (dailyMatch) {
    const [, minute, hour] = dailyMatch
    return {
      enabled: true,
      mode: 'daily',
      time: `${pad(Number(hour))}:${pad(Number(minute))}`,
      intervalHours: defaultScheduleFormState.intervalHours,
    }
  }

  return { ...defaultScheduleFormState, enabled: true }
}

export function describeSchedule(schedule: string | null | undefined) {
  if (!schedule?.trim()) {
    return 'Manual only'
  }

  const normalized = schedule.trim()
  const everyMinutesMatch = normalized.match(/^\*\/(\d+) \* \* \* \*$/)
  if (everyMinutesMatch) {
    return `Every ${pluralize(Number(everyMinutesMatch[1]), 'minute')}`
  }

  const everyHoursMatch = normalized.match(/^(\d{1,2}) \*\/(\d+) \* \* \*$/)
  if (everyHoursMatch) {
    const [, minute, hours] = everyHoursMatch
    return `Every ${pluralize(Number(hours), 'hour')} at :${pad(Number(minute))} UTC`
  }

  const dailyMatch = normalized.match(/^(\d{1,2}) (\d{1,2}) \* \* \*$/)
  if (dailyMatch) {
    const [, minute, hour] = dailyMatch
    return `Daily at ${pad(Number(hour))}:${pad(Number(minute))} UTC`
  }

  const weekdayMatch = normalized.match(/^(\d{1,2}) (\d{1,2}) \* \* ([\d,-]+)$/)
  if (weekdayMatch) {
    const [, minute, hour, days] = weekdayMatch
    return `${weekdayLabel(days)} at ${pad(Number(hour))}:${pad(Number(minute))} UTC`
  }

  return 'Custom cron schedule'
}

export function scheduleDetail(schedule: string | null | undefined) {
  return schedule?.trim() ? schedule.trim() : 'No cron metadata'
}
