import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded'
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded'
import { Alert, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink, useParams } from 'react-router-dom'

import { api } from '../api/client'
import { liveMonitorQueryOptions } from '../app/queryOptions'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/common/PageHeader'
import { StatusChip } from '../components/common/StatusChip'
import { formatDateTime } from '../utils/format'

export function AlertDetailPage() {
  const params = useParams()
  const alertId = Number(params.alertId)
  const { currentUser, can } = useAuth()
  const queryClient = useQueryClient()

  const alertQuery = useQuery({
    queryKey: ['alert', alertId],
    queryFn: () => api.getAlert(alertId),
    ...liveMonitorQueryOptions,
  })

  const updateAlertMutation = useMutation({
    mutationFn: (status: 'acknowledged' | 'resolved') => api.updateAlert(alertId, { status }, currentUser.id),
    onSuccess: async (updatedAlert) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['alert', alertId] }),
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts', updatedAlert.pipelineId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
  })

  if (alertQuery.isLoading) {
    return (
      <Stack spacing={2} sx={{ py: 8, alignItems: 'center' }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading alert detail...</Typography>
      </Stack>
    )
  }

  if (alertQuery.isError) {
    return <Alert severity="error">{alertQuery.error.message}</Alert>
  }

  const alertItem = alertQuery.data!
  const actions =
    can('admin', 'operator') && alertItem.status !== 'resolved' ? (
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {alertItem.status === 'open' && (
          <Button
            startIcon={<MarkEmailReadRoundedIcon />}
            variant="contained"
            color="warning"
            onClick={() => updateAlertMutation.mutate('acknowledged')}
            disabled={updateAlertMutation.isPending}
          >
            Acknowledge
          </Button>
        )}
        <Button
          startIcon={<DoneAllRoundedIcon />}
          variant="contained"
          color="success"
          onClick={() => updateAlertMutation.mutate('resolved')}
          disabled={updateAlertMutation.isPending}
        >
          Resolve
        </Button>
      </Stack>
    ) : undefined

  return (
    <Stack spacing={3}>
      <PageHeader
        title={`Alert #${alertItem.id}`}
        description="Single incident detail linked back to the originating run and pipeline."
        actions={actions}
      />

      {updateAlertMutation.isError && <Alert severity="error">{updateAlertMutation.error.message}</Alert>}

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography>{alertItem.message}</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography>
              <strong>Severity:</strong>
            </Typography>
            <StatusChip value={alertItem.severity} />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography>
              <strong>Status:</strong>
            </Typography>
            <StatusChip value={alertItem.status} />
          </Stack>
          <Typography>
            <strong>Created:</strong> {formatDateTime(alertItem.createdAt)}
          </Typography>
          <Typography>
            <strong>Run:</strong>{' '}
            <Typography component={RouterLink} to={`/runs/${alertItem.runId}`} sx={{ color: 'primary.main' }}>
              Run #{alertItem.runId}
            </Typography>
          </Typography>
          <Typography>
            <strong>Pipeline:</strong>{' '}
            <Typography component={RouterLink} to={`/pipelines/${alertItem.pipelineId}`} sx={{ color: 'primary.main' }}>
              Pipeline #{alertItem.pipelineId}
            </Typography>
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  )
}
