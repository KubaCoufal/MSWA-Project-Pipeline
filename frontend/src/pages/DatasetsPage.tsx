import AddRoundedIcon from '@mui/icons-material/AddRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import {
  Alert,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { api } from '../api/client'
import type { CreateDatasetInput } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/common/PageHeader'
import { CreateDatasetDialog } from '../components/forms/CreateDatasetDialog'
import { formatDateTime } from '../utils/format'

export function DatasetsPage() {
  const { currentUser, can } = useAuth()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const datasetsQuery = useQuery({ queryKey: ['datasets'], queryFn: api.getDatasets })
  const datasets = datasetsQuery.data ?? []
  const createDatasetMutation = useMutation({
    mutationFn: (payload: CreateDatasetInput) => api.createDataset(payload, currentUser.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['datasets'] })
      setDialogOpen(false)
    },
  })

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Datasets"
        description="Manage metadata-only data sources that pipelines can reference and monitor."
        actions={
          can('admin') ? (
            <Button startIcon={<AddRoundedIcon />} variant="contained" onClick={() => setDialogOpen(true)}>
              Add dataset
            </Button>
          ) : undefined
        }
      />

      {createDatasetMutation.isError && <Alert severity="error">{createDatasetMutation.error.message}</Alert>}

      <Paper sx={{ p: 2.5 }}>
        {datasetsQuery.isLoading ? (
          <Stack spacing={2} sx={{ py: 6, alignItems: 'center' }}>
            <CircularProgress />
            <Typography color="text.secondary">Loading datasets...</Typography>
          </Stack>
        ) : datasetsQuery.isError ? (
          <Alert severity="error">{datasetsQuery.error.message}</Alert>
        ) : datasets.length === 0 ? (
          <Alert severity="info">No datasets yet. Create the first one to attach pipelines.</Alert>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Schema version</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Detail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {datasets.map((dataset) => (
                <TableRow key={dataset.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{dataset.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {dataset.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell>{dataset.owner}</TableCell>
                  <TableCell>{dataset.schemaVersion}</TableCell>
                  <TableCell>{formatDateTime(dataset.createdAt)}</TableCell>
                  <TableCell align="right">
                    <Button
                      component={RouterLink}
                      to={`/datasets/${dataset.id}`}
                      endIcon={<OpenInNewRoundedIcon />}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <CreateDatasetDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={(payload) => createDatasetMutation.mutate(payload)}
        loading={createDatasetMutation.isPending}
      />
    </Stack>
  )
}
