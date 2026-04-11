import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/common/PageHeader'
import { StatusChip } from '../components/common/StatusChip'
import { formatDateTime, formatDuration, formatNumber } from '../utils/format'

export function RunDetailPage() {
  const params = useParams()
  const runId = Number(params.runId)
  const { currentUser, can } = useAuth()
  const queryClient = useQueryClient()

  const runQuery = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.getRun(runId),
  })
  const pipelinesQuery = useQuery({ queryKey: ['pipelines'], queryFn: api.getPipelines })

  const updateRunMutation = useMutation({
    mutationFn: (payload: { status: 'running' | 'success' | 'failed' }) =>
      api.updateRun(
        runId,
        payload.status === 'failed'
          ? { status: 'failed', errorMessage: 'Operator marked the run as failed.' }
          : { status: payload.status },
        currentUser.id,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['run', runId] }),
        queryClient.invalidateQueries({ queryKey: ['runs'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
      ])
    },
  })

  if (runQuery.isLoading) {
    return (
      <Stack spacing={2} sx={{ py: 8, alignItems: 'center' }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading run detail...</Typography>
      </Stack>
    )
  }

  if (runQuery.isError) {
    return <Alert severity="error">{runQuery.error.message}</Alert>
  }

  const run = runQuery.data!
  const pipeline = (pipelinesQuery.data ?? []).find((item) => item.id === run.pipelineId)
  const actions =
    can('admin', 'operator') && (run.status === 'pending' || run.status === 'running') ? (
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {run.status === 'pending' && (
          <Button
            startIcon={<PlayArrowRoundedIcon />}
            variant="contained"
            onClick={() => updateRunMutation.mutate({ status: 'running' })}
          >
            Mark running
          </Button>
        )}
        {run.status === 'running' && (
          <>
            <Button
              startIcon={<CheckCircleRoundedIcon />}
              variant="contained"
              color="success"
              onClick={() => updateRunMutation.mutate({ status: 'success' })}
            >
              Mark success
            </Button>
            <Button
              startIcon={<ErrorRoundedIcon />}
              variant="contained"
              color="error"
              onClick={() => updateRunMutation.mutate({ status: 'failed' })}
            >
              Mark failed
            </Button>
          </>
        )}
      </Stack>
    ) : undefined

  return (
    <Stack spacing={3}>
      <PageHeader
        title={`Run #${run.id}`}
        description="Single run view for status transitions, records processed, and operational context."
        actions={actions}
      />

      {updateRunMutation.isError && <Alert severity="error">{updateRunMutation.error.message}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            lg: 'minmax(0, 0.9fr) minmax(0, 1.1fr)',
          },
        }}
      >
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>
            Run detail
          </Typography>
          <Stack spacing={1.3}>
            <Typography>
              <strong>Pipeline:</strong> {pipeline?.name ?? `Pipeline #${run.pipelineId}`}
            </Typography>
            <Typography>
              <strong>Version:</strong> {run.pipelineVersionNumber}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography>
                <strong>Status:</strong>
              </Typography>
              <StatusChip value={run.status} />
            </Stack>
            <Typography>
              <strong>Started:</strong> {formatDateTime(run.startedAt)}
            </Typography>
            <Typography>
              <strong>Finished:</strong> {formatDateTime(run.finishedAt)}
            </Typography>
            <Typography>
              <strong>Runtime:</strong> {formatDuration(run.runtimeSeconds)}
            </Typography>
            <Typography>
              <strong>Records processed:</strong> {formatNumber(run.recordsProcessed)}
            </Typography>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>
            Error context
          </Typography>
          {run.errorMessage ? (
            <Alert severity="error">{run.errorMessage}</Alert>
          ) : (
            <Alert severity="success">No error message has been attached to this run.</Alert>
          )}
        </Paper>
      </Box>
    </Stack>
  )
}
