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
import type { Pipeline, Run, RunStatus } from '../api/types'
import { liveMonitorQueryOptions } from '../app/queryOptions'
import { PageHeader } from '../components/common/PageHeader'
import { StatusChip } from '../components/common/StatusChip'
import { formatDateTime, formatDuration, formatNumber } from '../utils/format'
import { describeSchedule, scheduleDetail } from '../utils/schedule'

const cardSx = {
  p: 2.5,
  backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,250,242,0.92))',
}

const runStatusColors: Record<RunStatus, string> = {
  pending: '#d0b268',
  running: '#4e7ea2',
  success: '#4f8f6d',
  failed: '#b73a3a',
}

const runStatusOrder: RunStatus[] = ['pending', 'running', 'failed', 'success']

interface RunTrendPoint {
  dateKey: string
  label: string
  pending: number
  running: number
  success: number
  failed: number
  total: number
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildRunTrend(runs: Run[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const trend: RunTrendPoint[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    return {
      dateKey: toDateKey(date),
      label: new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date),
      pending: 0,
      running: 0,
      success: 0,
      failed: 0,
      total: 0,
    }
  })

  const trendMap = new Map(trend.map((entry) => [entry.dateKey, entry]))
  runs.forEach((run) => {
    const source = run.startedAt ?? run.createdAt
    const key = toDateKey(new Date(source))
    const entry = trendMap.get(key)
    if (!entry) {
      return
    }

    entry[run.status] += 1
    entry.total += 1
  })

  return trend
}

function buildPipelineVolumes(runs: Run[], pipelines: Pipeline[]) {
  const pipelineNames = new Map(pipelines.map((pipeline) => [pipeline.id, pipeline.name]))
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const totals = new Map<number, { pipelineId: number; name: string; records: number; runs: number }>()

  runs.forEach((run) => {
    const source = new Date(run.createdAt)
    if (source < weekAgo || run.recordsProcessed <= 0) {
      return
    }

    const current = totals.get(run.pipelineId) ?? {
      pipelineId: run.pipelineId,
      name: pipelineNames.get(run.pipelineId) ?? `Pipeline #${run.pipelineId}`,
      records: 0,
      runs: 0,
    }
    current.records += run.recordsProcessed
    current.runs += 1
    totals.set(run.pipelineId, current)
  })

  return Array.from(totals.values())
    .sort((left, right) => right.records - left.records)
    .slice(0, 4)
}

function RunActivityCard({ runs }: { runs: Run[] }) {
  const trend = buildRunTrend(runs)
  const maxTotal = Math.max(...trend.map((entry) => entry.total), 1)

  return (
    <Paper sx={cardSx}>
      <Typography variant="h6" gutterBottom>
        Run activity, last 7 days
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Simulated history plus any new runs created by the fake scheduler.
      </Typography>

      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', mb: 2 }} useFlexGap>
        {runStatusOrder.map((status) => (
          <Stack key={status} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '999px', bgcolor: runStatusColors[status] }} />
            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
              {status}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          alignItems: 'end',
          minHeight: 230,
        }}
      >
        {trend.map((day) => (
          <Stack key={day.dateKey} spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              aria-label={`${day.label} activity`}
              sx={{
                width: '100%',
                maxWidth: 56,
                height: 160,
                borderRadius: 4,
                bgcolor: 'rgba(11, 93, 92, 0.06)',
                border: '1px solid rgba(11, 93, 92, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                overflow: 'hidden',
              }}
            >
              {day.total === 0 ? (
                <Box sx={{ height: 12, bgcolor: 'rgba(11, 93, 92, 0.08)' }} />
              ) : (
                runStatusOrder.map((status) => {
                  const count = day[status]
                  if (!count) {
                    return null
                  }

                  return (
                    <Box
                      key={status}
                      sx={{
                        height: `${(count / maxTotal) * 160}px`,
                        bgcolor: runStatusColors[status],
                      }}
                    />
                  )
                })
              )}
            </Box>
            <Typography variant="body2">{day.label}</Typography>
            <Typography variant="caption" color="text.secondary">
              {day.total} runs
            </Typography>
          </Stack>
        ))}
      </Box>
    </Paper>
  )
}

function PipelineVolumeCard({ runs, pipelines }: { runs: Run[]; pipelines: Pipeline[] }) {
  const volumes = buildPipelineVolumes(runs, pipelines)
  const maxRecords = Math.max(...volumes.map((item) => item.records), 1)

  return (
    <Paper sx={cardSx}>
      <Typography variant="h6" gutterBottom>
        Processed records, last 7 days
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Top pipelines by simulated throughput in the current demo dataset.
      </Typography>

      {volumes.length === 0 ? (
        <Alert severity="info">No completed volume data is available yet.</Alert>
      ) : (
        <Stack spacing={1.75}>
          {volumes.map((item) => (
            <Box key={item.pipelineId}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                <Typography component={RouterLink} to={`/pipelines/${item.pipelineId}`} sx={{ color: 'primary.main' }}>
                  {item.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatNumber(item.records)} rows
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {item.runs} completed runs contributing to this total
              </Typography>
              <Box
                sx={{
                  mt: 0.75,
                  height: 12,
                  borderRadius: 999,
                  bgcolor: 'rgba(11, 93, 92, 0.08)',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: `${Math.max((item.records / maxRecords) * 100, 8)}%`,
                    height: '100%',
                    borderRadius: 999,
                    backgroundImage: 'linear-gradient(90deg, #0b5d5c, #d67b49)',
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  )
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
  const pipelines = pipelinesQuery.data ?? []
  const runs = runsQuery.data ?? []
  const alerts = alertsQuery.data ?? []

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
            xl: 'minmax(0, 1.3fr) minmax(0, 0.9fr)',
          },
        }}
      >
        <RunActivityCard runs={runs} />
        <PipelineVolumeCard runs={runs} pipelines={pipelines} />
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
              {runs.slice(0, 6).map((run) => (
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
              {alerts
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
              {alerts.filter((alertItem) => alertItem.status === 'open').length === 0 && (
                <Alert severity="success">No open alerts right now.</Alert>
              )}
            </Stack>
          </Paper>

          <Paper sx={cardSx}>
            <Typography variant="h6" gutterBottom>
              Active pipelines
            </Typography>
            <Stack spacing={1.25}>
              {pipelines
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
                        {describeSchedule(pipeline.schedule)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {scheduleDetail(pipeline.schedule)}
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
