import {
  Alert,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { api } from '../api/client'
import type { RunStatus } from '../api/types'
import { liveMonitorQueryOptions } from '../app/queryOptions'
import { PageHeader } from '../components/common/PageHeader'
import { StatusChip } from '../components/common/StatusChip'
import { formatDateTime, formatDuration, formatNumber } from '../utils/format'

export function RunsPage() {
  const [pipelineFilter, setPipelineFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | RunStatus>('all')

  const deferredPipelineFilter = useDeferredValue(pipelineFilter)
  const deferredStatusFilter = useDeferredValue(statusFilter)

  const runsQuery = useQuery({ queryKey: ['runs'], queryFn: () => api.getRuns(), ...liveMonitorQueryOptions })
  const pipelinesQuery = useQuery({ queryKey: ['pipelines'], queryFn: api.getPipelines })

  const pipelineMap = useMemo(
    () => new Map((pipelinesQuery.data ?? []).map((pipeline) => [pipeline.id, pipeline.name])),
    [pipelinesQuery.data],
  )

  const filteredRuns = useMemo(() => {
    return (runsQuery.data ?? []).filter((run) => {
      const pipelineMatches =
        deferredPipelineFilter === 'all' ? true : run.pipelineId === Number(deferredPipelineFilter)
      const statusMatches = deferredStatusFilter === 'all' ? true : run.status === deferredStatusFilter
      return pipelineMatches && statusMatches
    })
  }, [deferredPipelineFilter, deferredStatusFilter, runsQuery.data])

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Runs"
        description="Inspect current and historical pipeline runs, filter by status, and jump into individual run detail."
      />

      <Paper sx={{ p: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            select
            label="Pipeline"
            value={pipelineFilter}
            onChange={(event) => setPipelineFilter(event.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="all">All pipelines</MenuItem>
            {(pipelinesQuery.data ?? []).map((pipeline) => (
              <MenuItem key={pipeline.id} value={String(pipeline.id)}>
                {pipeline.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | RunStatus)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="running">Running</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        {runsQuery.isLoading ? (
          <Stack spacing={2} sx={{ py: 6, alignItems: 'center' }}>
            <CircularProgress />
            <Typography color="text.secondary">Loading runs...</Typography>
          </Stack>
        ) : runsQuery.isError ? (
          <Alert severity="error">{runsQuery.error.message}</Alert>
        ) : filteredRuns.length === 0 ? (
          <Alert severity="info">No runs match the selected filters.</Alert>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Run</TableCell>
                <TableCell>Pipeline</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Runtime</TableCell>
                <TableCell>Records</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRuns.map((run) => (
                <TableRow key={run.id} hover>
                  <TableCell>
                    <Typography component={RouterLink} to={`/runs/${run.id}`} sx={{ color: 'primary.main' }}>
                      Run #{run.id}
                    </Typography>
                  </TableCell>
                  <TableCell>{pipelineMap.get(run.pipelineId) ?? `Pipeline #${run.pipelineId}`}</TableCell>
                  <TableCell>
                    <StatusChip value={run.status} />
                  </TableCell>
                  <TableCell>{formatDateTime(run.startedAt)}</TableCell>
                  <TableCell>{formatDuration(run.runtimeSeconds)}</TableCell>
                  <TableCell>{formatNumber(run.recordsProcessed)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Stack>
  )
}
