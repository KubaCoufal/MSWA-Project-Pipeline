import { Alert, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useParams } from 'react-router-dom'

import { api } from '../api/client'
import { PageHeader } from '../components/common/PageHeader'
import { StatusChip } from '../components/common/StatusChip'
import { formatDateTime } from '../utils/format'

export function AlertDetailPage() {
  const params = useParams()
  const alertId = Number(params.alertId)

  const alertQuery = useQuery({
    queryKey: ['alert', alertId],
    queryFn: () => api.getAlert(alertId),
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

  return (
    <Stack spacing={3}>
      <PageHeader title={`Alert #${alertItem.id}`} description="Single incident detail linked back to the originating run and pipeline." />

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
