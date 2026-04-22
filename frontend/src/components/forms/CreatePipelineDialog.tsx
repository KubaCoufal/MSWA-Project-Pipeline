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

import type { CreatePipelineInput, Dataset } from '../../api/types'
import { describeSchedule } from '../../utils/schedule'

interface CreatePipelineDialogProps {
  open: boolean
  onClose: () => void
  datasets: Dataset[]
  onSubmit: (payload: CreatePipelineInput) => void
  loading?: boolean
}

export function CreatePipelineDialog({
  open,
  onClose,
  datasets,
  onSubmit,
  loading = false,
}: CreatePipelineDialogProps) {
  const defaultDatasetId = datasets[0]?.id ?? 0
  const initialState = useMemo<CreatePipelineInput>(
    () => ({
      datasetId: defaultDatasetId,
      name: '',
      description: '',
      schedule: '0 2 * * *',
      active: true,
      kaggleDataset: '',
    }),
    [defaultDatasetId],
  )

  const [formState, setFormState] = useState<CreatePipelineInput>(initialState)

  return (
    <Dialog
      key={`${open ? 'pipeline-open' : 'pipeline-closed'}-${defaultDatasetId}`}
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Create pipeline</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select
            label="Dataset"
            value={formState.datasetId}
            onChange={(event) =>
              setFormState((current) => ({ ...current, datasetId: Number(event.target.value) }))
            }
          >
            {datasets.map((dataset) => (
              <MenuItem key={dataset.id} value={dataset.id}>
                {dataset.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Pipeline name"
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
          />
          <TextField
            label="Schedule"
            value={formState.schedule}
            onChange={(event) => setFormState((current) => ({ ...current, schedule: event.target.value }))}
            helperText={`Cron metadata. Example: 0 2 * * * (${describeSchedule('0 2 * * *')}) or */15 * * * * (${describeSchedule(
              '*/15 * * * *',
            )}). Leave blank for manual-only runs.`}
          />
          <TextField
            label="Kaggle dataset"
            value={formState.kaggleDataset ?? ''}
            onChange={(event) => setFormState((current) => ({ ...current, kaggleDataset: event.target.value }))}
            helperText="Optional. Format: owner/dataset-name (e.g. zillow/zecon). The worker downloads and analyses this on every run."
          />
          <TextField
            label="Description"
            multiline
            minRows={3}
            value={formState.description}
            onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formState.active}
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
          disabled={loading || !formState.datasetId || !formState.name.trim()}
        >
          Create pipeline
        </Button>
      </DialogActions>
    </Dialog>
  )
}
