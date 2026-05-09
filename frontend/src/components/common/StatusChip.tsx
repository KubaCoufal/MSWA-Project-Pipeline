import { Chip } from '@mui/material'

import type { AlertSeverity, AlertStatus, RunStatus, RunStepStatus } from '../../api/types'

type StatusValue = RunStatus | RunStepStatus | AlertSeverity | AlertStatus

const colorMap: Record<StatusValue, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'warning',
  running: 'info',
  success: 'success',
  failed: 'error',
  skipped: 'default',
  low: 'default',
  medium: 'warning',
  high: 'error',
  open: 'error',
  acknowledged: 'warning',
  resolved: 'success',
}

export function StatusChip({ value }: { value: StatusValue }) {
  return <Chip color={colorMap[value]} label={value.replaceAll('_', ' ')} size="small" />
}
