import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { useState } from 'react'

import type { CreateDatasetInput } from '../../api/types'

interface CreateDatasetDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: CreateDatasetInput) => void
  loading?: boolean
}

const initialState: CreateDatasetInput = {
  name: '',
  description: '',
  owner: '',
  schemaVersion: 1,
}

export function CreateDatasetDialog({ open, onClose, onSubmit, loading = false }: CreateDatasetDialogProps) {
  const [formState, setFormState] = useState<CreateDatasetInput>(initialState)

  return (
    <Dialog key={open ? 'dataset-open' : 'dataset-closed'} open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create dataset</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Dataset name"
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
          />
          <TextField
            label="Owner"
            value={formState.owner}
            onChange={(event) => setFormState((current) => ({ ...current, owner: event.target.value }))}
          />
          <TextField
            label="Schema version"
            type="number"
            value={formState.schemaVersion}
            onChange={(event) =>
              setFormState((current) => ({ ...current, schemaVersion: Number(event.target.value) || 1 }))
            }
          />
          <TextField
            label="Description"
            multiline
            minRows={3}
            value={formState.description}
            onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(formState)}
          disabled={loading || !formState.name.trim() || !formState.owner.trim()}
        >
          Create dataset
        </Button>
      </DialogActions>
    </Dialog>
  )
}
