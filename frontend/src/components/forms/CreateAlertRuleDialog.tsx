import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import { useMemo, useState } from 'react'

import type { AlertRuleType, CreateAlertRuleInput, Pipeline } from '../../api/types'

interface CreateAlertRuleDialogProps {
  open: boolean
  onClose: () => void
  pipelines: Pipeline[]
  onSubmit: (payload: CreateAlertRuleInput) => void
  loading?: boolean
}

export function CreateAlertRuleDialog({
  open,
  onClose,
  pipelines,
  onSubmit,
  loading = false,
}: CreateAlertRuleDialogProps) {
  const defaultPipelineId = pipelines[0]?.id ?? 0
  const initialState = useMemo<CreateAlertRuleInput>(
    () => ({
      pipelineId: defaultPipelineId,
      name: '',
      ruleType: 'run_failed',
      thresholdSeconds: 60,
      severity: 'medium',
      enabled: true,
    }),
    [defaultPipelineId],
  )

  const [formState, setFormState] = useState<CreateAlertRuleInput>(initialState)

  const setRuleType = (ruleType: AlertRuleType) => {
    setFormState((current) => ({
      ...current,
      ruleType,
      thresholdSeconds: ruleType === 'runtime_exceeded' ? current.thresholdSeconds ?? 60 : undefined,
    }))
  }

  return (
    <Dialog
      key={`${open ? 'alert-rule-open' : 'alert-rule-closed'}-${defaultPipelineId}`}
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Create alert rule</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            label="Pipeline"
            value={formState.pipelineId}
            onChange={(event) =>
              setFormState((current) => ({ ...current, pipelineId: Number(event.target.value) }))
            }
          >
            {pipelines.map((pipeline) => (
              <MenuItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Rule name"
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
          />
          <TextField
            select
            label="Rule type"
            value={formState.ruleType}
            onChange={(event) => setRuleType(event.target.value as AlertRuleType)}
          >
            <MenuItem value="run_failed">Run failed</MenuItem>
            <MenuItem value="runtime_exceeded">Runtime exceeded</MenuItem>
          </TextField>
          {formState.ruleType === 'runtime_exceeded' && (
            <TextField
              label="Threshold seconds"
              type="number"
              value={formState.thresholdSeconds}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  thresholdSeconds: Number(event.target.value) || 60,
                }))
              }
            />
          )}
          <TextField
            select
            label="Severity"
            value={formState.severity}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                severity: event.target.value as CreateAlertRuleInput['severity'],
              }))
            }
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={formState.enabled}
                onChange={(event) => setFormState((current) => ({ ...current, enabled: event.target.checked }))}
              />
            }
            label="Rule is enabled"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(formState)}
          disabled={loading || !formState.pipelineId || !formState.name.trim()}
        >
          Create rule
        </Button>
      </DialogActions>
    </Dialog>
  )
}
