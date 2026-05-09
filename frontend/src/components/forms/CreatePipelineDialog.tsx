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
import { defaultScheduleFormState, scheduleFormToCron } from '../../utils/schedule'
import { ScheduleControls } from './ScheduleControls'

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
      datasetId: undefined,
      name: '',
      description: '',
      schedule: '',
      active: true,
      sourceType: 'kaggle_latest_category',
      kaggleDatasetRef: '',
      kaggleCategory: 'computer science',
    }),
    [],
  )

  const [formState, setFormState] = useState<CreatePipelineInput>(initialState)
  const [scheduleState, setScheduleState] = useState(defaultScheduleFormState)
  const isSimulated = formState.sourceType === 'simulated'

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
            label="Pipeline name"
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
          />
          <ScheduleControls value={scheduleState} onChange={setScheduleState} />
          <TextField
            select
            label="Pipeline source"
            value={formState.sourceType}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                sourceType: event.target.value as CreatePipelineInput['sourceType'],
              }))
            }
          >
            <MenuItem value="simulated">Simulated run</MenuItem>
            <MenuItem value="kaggle_latest">Latest published Kaggle CSV dataset</MenuItem>
            <MenuItem value="kaggle_latest_category">Latest Kaggle CSV by topic</MenuItem>
            <MenuItem value="kaggle_specific">Specific Kaggle dataset</MenuItem>
          </TextField>
          {isSimulated && (
            <TextField
              select
              label="Internal dataset"
              value={formState.datasetId ?? defaultDatasetId}
              onChange={(event) =>
                setFormState((current) => ({ ...current, datasetId: Number(event.target.value) }))
              }
              helperText="Only simulated pipelines need a pre-created internal dataset."
            >
              {datasets.map((dataset) => (
                <MenuItem key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          {formState.sourceType === 'kaggle_specific' && (
            <TextField
              label="Kaggle dataset link or slug"
              value={formState.kaggleDatasetRef ?? ''}
              onChange={(event) => setFormState((current) => ({ ...current, kaggleDatasetRef: event.target.value }))}
              helperText="Use a Kaggle dataset URL or owner/dataset slug, for example uciml/iris."
            />
          )}
          {formState.sourceType === 'kaggle_latest_category' && (
            <TextField
              label="Kaggle topic or category"
              value={formState.kaggleCategory ?? ''}
              onChange={(event) => setFormState((current) => ({ ...current, kaggleCategory: event.target.value }))}
              helperText="For the presentation path, use computer science."
            />
          )}
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
          onClick={() => onSubmit({ ...formState, schedule: scheduleFormToCron(scheduleState) })}
          disabled={
            loading ||
            !formState.name.trim() ||
            (isSimulated && !(formState.datasetId ?? defaultDatasetId)) ||
            (formState.sourceType === 'kaggle_latest_category' && !formState.kaggleCategory?.trim()) ||
            (formState.sourceType === 'kaggle_specific' && !formState.kaggleDatasetRef?.trim())
          }
        >
          Create pipeline
        </Button>
      </DialogActions>
    </Dialog>
  )
}
