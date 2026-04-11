import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import { useMemo, useState } from 'react'

import type { Pipeline, UpdatePipelineInput } from '../../api/types'
import { describeSchedule } from '../../utils/schedule'

interface EditPipelineDialogProps {
  open: boolean
  onClose: () => void
  pipeline: Pipeline | null
  onSubmit: (payload: UpdatePipelineInput) => void
  loading?: boolean
}

export function EditPipelineDialog({
  open,
  onClose,
  pipeline,
  onSubmit,
  loading = false,
}: EditPipelineDialogProps) {
  const initialState = useMemo<UpdatePipelineInput>(
    () => ({
      name: pipeline?.name ?? '',
      description: pipeline?.description ?? '',
      schedule: pipeline?.schedule ?? '',
      active: pipeline?.active ?? true,
    }),
    [pipeline],
  )

  const [formState, setFormState] = useState<UpdatePipelineInput>(initialState)

  return (
    <Dialog
      key={`${open ? 'pipeline-edit-open' : 'pipeline-edit-closed'}-${pipeline?.id ?? 'empty'}-${pipeline?.updatedAt ?? 'new'}`}
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Edit pipeline</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Pipeline name"
            value={formState.name ?? ''}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
          />
          <TextField
            label="Schedule"
            value={formState.schedule ?? ''}
            onChange={(event) => setFormState((current) => ({ ...current, schedule: event.target.value }))}
            helperText={`Cron metadata. Example: 0 2 * * * (${describeSchedule('0 2 * * *')}) or */15 * * * * (${describeSchedule(
              '*/15 * * * *',
            )}). Leave blank for manual-only runs.`}
          />
          <TextField
            label="Description"
            multiline
            minRows={3}
            value={formState.description ?? ''}
            onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formState.active ?? true}
                onChange={(event) => setFormState((current) => ({ ...current, active: event.target.checked }))}
              />
            }
            label="Pipeline is active"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(formState)}
          disabled={loading || !formState.name?.trim()}
        >
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  )
}
