import AddRoundedIcon from '@mui/icons-material/AddRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import {
  Alert,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { api } from '../api/client'
import type { CreatePipelineInput } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/common/PageHeader'
import { StatusChip } from '../components/common/StatusChip'
import { CreatePipelineDialog } from '../components/forms/CreatePipelineDialog'
import { formatDateTime } from '../utils/format'

export function PipelinesPage() {
  const { currentUser, can } = useAuth()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const datasetsQuery = useQuery({ queryKey: ['datasets'], queryFn: api.getDatasets })
  const pipelinesQuery = useQuery({ queryKey: ['pipelines'], queryFn: api.getPipelines })
  const pipelines = pipelinesQuery.data ?? []

  const datasetMap = useMemo(
    () => new Map((datasetsQuery.data ?? []).map((dataset) => [dataset.id, dataset.name])),
    [datasetsQuery.data],
  )

  const createPipelineMutation = useMutation({
    mutationFn: (payload: CreatePipelineInput) => api.createPipeline(payload, currentUser.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      setDialogOpen(false)
    },
  })

  const runPipelineMutation = useMutation({
    mutationFn: (pipelineId: number) => api.runPipeline(pipelineId, currentUser.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipelines'] }),
        queryClient.invalidateQueries({ queryKey: ['runs'] }),
      ])
    },
  })

  const updatePipelineMutation = useMutation({
    mutationFn: ({ pipelineId, active }: { pipelineId: number; active: boolean }) =>
      api.updatePipeline(pipelineId, { active }, currentUser.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Pipelines"
        description="Create simulated processing pipelines, toggle their active state, and trigger manual runs."
        actions={
          can('admin') ? (
            <Button startIcon={<AddRoundedIcon />} variant="contained" onClick={() => setDialogOpen(true)}>
              Add pipeline
            </Button>
          ) : undefined
        }
      />

      {(createPipelineMutation.isError || runPipelineMutation.isError || updatePipelineMutation.isError) && (
        <Alert severity="error">
          {createPipelineMutation.error?.message ||
            runPipelineMutation.error?.message ||
            updatePipelineMutation.error?.message}
        </Alert>
      )}

      <Paper sx={{ p: 2.5 }}>
        {pipelinesQuery.isLoading ? (
          <Stack spacing={2} sx={{ py: 6, alignItems: 'center' }}>
            <CircularProgress />
            <Typography color="text.secondary">Loading pipelines...</Typography>
          </Stack>
        ) : pipelinesQuery.isError ? (
          <Alert severity="error">{pipelinesQuery.error.message}</Alert>
        ) : pipelines.length === 0 ? (
          <Alert severity="info">No pipelines yet. Create one after you have a dataset.</Alert>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Pipeline</TableCell>
                <TableCell>Dataset</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last run</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pipelines.map((pipeline) => (
                <TableRow key={pipeline.id} hover>
                  <TableCell>
                    <Typography component={RouterLink} to={`/pipelines/${pipeline.id}`} sx={{ color: 'primary.main' }}>
                      {pipeline.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Version {pipeline.currentVersionNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>{datasetMap.get(pipeline.datasetId) ?? `Dataset #${pipeline.datasetId}`}</TableCell>
                  <TableCell>{pipeline.schedule || 'Manual only'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <StatusChip value={pipeline.latestRunStatus ?? 'pending'} />
                      <Typography variant="body2" color="text.secondary">
                        {pipeline.active ? 'Active' : 'Inactive'}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{formatDateTime(pipeline.latestRunStartedAt)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                      <Button
                        startIcon={<PlayArrowRoundedIcon />}
                        variant="contained"
                        onClick={() => runPipelineMutation.mutate(pipeline.id)}
                        disabled={!can('admin', 'operator') || !pipeline.active || runPipelineMutation.isPending}
                      >
                        Run
                      </Button>
                      {can('admin') && (
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <TuneRoundedIcon fontSize="small" color="action" />
                          <Switch
                            checked={pipeline.active}
                            onChange={(event) =>
                              updatePipelineMutation.mutate({
                                pipelineId: pipeline.id,
                                active: event.target.checked,
                              })
                            }
                          />
                        </Stack>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <CreatePipelineDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        datasets={datasetsQuery.data ?? []}
        onSubmit={(payload) => createPipelineMutation.mutate(payload)}
        loading={createPipelineMutation.isPending}
      />
    </Stack>
  )
}
