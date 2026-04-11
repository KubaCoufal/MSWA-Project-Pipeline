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
