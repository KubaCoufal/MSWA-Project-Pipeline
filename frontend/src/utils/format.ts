export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatDuration(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'Not finished'
  }

  if (value < 60) {
    return `${value}s`
  }

  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${minutes}m ${seconds}s`
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-GB').format(value)
}
