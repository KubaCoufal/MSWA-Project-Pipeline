import {
  Alert,
  Box,
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
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'

import { api } from '../api/client'
import { liveMonitorQueryOptions } from '../app/queryOptions'
import { PageHeader } from '../components/common/PageHeader'
import { StatusChip } from '../components/common/StatusChip'
import { formatDateTime, formatDuration, formatNumber } from '../utils/format'

const cardSx = {
  p: 2.5,
  backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,250,242,0.92))',
}

export function DashboardPage() {
  const summaryQuery = useQuery({ queryKey: ['dashboard-summary'], queryFn: api.getDashboardSummary, ...liveMonitorQueryOptions })
  const pipelinesQuery = useQuery({ queryKey: ['pipelines'], queryFn: api.getPipelines, ...liveMonitorQueryOptions })
  const runsQuery = useQuery({ queryKey: ['runs'], queryFn: () => api.getRuns(), ...liveMonitorQueryOptions })
  const alertsQuery = useQuery({ queryKey: ['alerts'], queryFn: () => api.getAlerts(), ...liveMonitorQueryOptions })

  if (summaryQuery.isLoading) {
    return (
      <Stack spacing={2} sx={{ minHeight: '50vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading the monitoring overview...</Typography>
      </Stack>
    )
  }

  if (summaryQuery.isError) {
    return <Alert severity="error">{summaryQuery.error.message}</Alert>
  }

  const summary = summaryQuery.data!
  const metrics = [
    { label: 'Datasets', value: summary.datasetCount },
    { label: 'Pipelines', value: summary.pipelineCount },
    { label: 'Active pipelines', value: summary.activePipelineCount },
    { label: 'Runs last 7 days', value: summary.recentRunCount },
    { label: 'Failed runs', value: summary.failedRunCount },
    { label: 'Open alerts', value: summary.openAlertCount },
  ]

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Dashboard"
        description="A quick operational view across datasets, pipelines, simulated runs, and alert pressure."
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            sm: 'repeat(2, minmax(0, 1fr))',
            xl: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        {metrics.map((metric) => (
          <Paper key={metric.label} sx={cardSx}>
            <Typography color="text.secondary" variant="body2">
              {metric.label}
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              {formatNumber(metric.value)}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            xl: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          },
        }}
      >
        <Paper sx={cardSx}>
          <Typography variant="h6" gutterBottom>
            Recent runs
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Run</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Runtime</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(runsQuery.data ?? []).slice(0, 5).map((run) => (
                <TableRow key={run.id} hover>
                  <TableCell>
                    <Typography component={RouterLink} to={`/runs/${run.id}`} sx={{ color: 'primary.main' }}>
                      Run #{run.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip value={run.status} />
                  </TableCell>
                  <TableCell>{formatDateTime(run.startedAt)}</TableCell>
                  <TableCell>{formatDuration(run.runtimeSeconds)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Stack spacing={2}>
          <Paper sx={cardSx}>
            <Typography variant="h6" gutterBottom>
              Open alerts
            </Typography>
            <Stack spacing={1.5}>
              {(alertsQuery.data ?? [])
                .filter((alertItem) => alertItem.status === 'open')
                .slice(0, 4)
                .map((alertItem) => (
                <Box key={alertItem.id} sx={{ borderRadius: 3, bgcolor: 'rgba(183,58,58,0.06)', p: 1.5 }}>
                  <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                    <Typography component={RouterLink} to={`/alerts/${alertItem.id}`} sx={{ color: 'primary.main' }}>
                      Alert #{alertItem.id}
                    </Typography>
                    <StatusChip value={alertItem.severity} />
                  </Stack>
                  <Typography sx={{ mt: 1 }}>{alertItem.message}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

          <Paper sx={cardSx}>
            <Typography variant="h6" gutterBottom>
              Active pipelines
            </Typography>
            <Stack spacing={1.25}>
              {(pipelinesQuery.data ?? [])
                .filter((pipeline) => pipeline.active)
                .slice(0, 4)
                .map((pipeline) => (
                  <Stack
                    key={pipeline.id}
                    direction="row"
                    sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box>
                      <Typography component={RouterLink} to={`/pipelines/${pipeline.id}`} sx={{ color: 'primary.main' }}>
                        {pipeline.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {pipeline.schedule || 'No schedule metadata'}
                      </Typography>
                    </Box>
                    <StatusChip value={pipeline.latestRunStatus ?? 'pending'} />
                  </Stack>
                ))}
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Stack>
  )
}
