import { Box, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material'

import {
  describeSchedule,
  type ScheduleFormState,
  scheduleFormToCron,
} from '../../utils/schedule'

interface ScheduleControlsProps {
  value: ScheduleFormState
  onChange: (value: ScheduleFormState) => void
}

export function ScheduleControls({ value, onChange }: ScheduleControlsProps) {
  const cron = scheduleFormToCron(value)

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <Stack spacing={1.5}>
        <FormControlLabel
          control={
            <Switch
              checked={value.enabled}
              onChange={(event) => onChange({ ...value, enabled: event.target.checked })}
            />
          }
          label="Scheduled run"
        />

        {value.enabled && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              select
              label="Repeat"
              value={value.mode}
              onChange={(event) =>
                onChange({ ...value, mode: event.target.value as ScheduleFormState['mode'] })
              }
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekdays">Weekdays</MenuItem>
              <MenuItem value="hourly">Every few hours</MenuItem>
            </TextField>

            {value.mode === 'hourly' ? (
              <TextField
                label="Every"
                type="number"
                value={value.intervalHours}
                onChange={(event) =>
                  onChange({ ...value, intervalHours: Math.max(1, Number(event.target.value) || 1) })
                }
                slotProps={{ htmlInput: { min: 1, max: 23 } }}
                helperText="Hours"
              />
            ) : (
              <TextField
                label="Run time"
                type="time"
                value={value.time}
                onChange={(event) => onChange({ ...value, time: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
          </Stack>
        )}

        <Typography variant="body2" color="text.secondary">
          {describeSchedule(cron)}
        </Typography>
      </Stack>
    </Box>
  )
}
