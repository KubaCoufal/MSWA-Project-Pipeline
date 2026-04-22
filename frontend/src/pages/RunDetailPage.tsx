import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
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
import { useParams } from 'react-router-dom'

import { api } from '../api/client'
import type { RunReport, RunReportTrendPoint } from '../api/types'
import { liveMonitorQueryOptions } from '../app/queryOptions'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/common/PageHeader'
import { StatusChip } from '../components/common/StatusChip'
import { formatDateTime, formatDuration, formatNumber } from '../utils/format'

const CHART_W = 600
const CHART_H = 160
const PAD = { top: 10, right: 12, bottom: 28, left: 52 }

function TrendChart({ points }: { points: RunReportTrendPoint[] }) {
  if (points.length < 2) return null

  const plotW = CHART_W - PAD.left - PAD.right
  const plotH = CHART_H - PAD.top - PAD.bottom

  const allVals = points.flatMap((p) => [p.value, p.rolling7d])
  const minVal = Math.min(...allVals)
  const maxVal = Math.max(...allVals)
  const range = maxVal - minVal || 1

  const cx = (i: number) => PAD.left + (i / (points.length - 1)) * plotW
  const cy = (v: number) => PAD.top + (1 - (v - minVal) / range) * plotH

  const rawPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(p.value).toFixed(1)}`).join(' ')
  const rollingPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(p.rolling7d).toFixed(1)}`)
    .join(' ')

  const yTicks = [0, 0.5, 1].map((t) => ({ val: minVal + t * range, y: PAD.top + (1 - t) * plotH }))
  const xLabels = [0, Math.floor(points.length / 2), points.length - 1]

  return (
    <svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ display: 'block', overflow: 'visible' }}>
      {yTicks.map(({ val, y }) => (
        <g key={val}>
          <line x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y} stroke="#e0e0e0" strokeWidth={1} />
          <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#888">
            {val.toFixed(1)}
          </text>
        </g>
      ))}
      <path d={rawPath} fill="none" stroke="#90caf9" strokeWidth={1} opacity={0.6} />
      <path d={rollingPath} fill="none" stroke="#1976d2" strokeWidth={2} />
      {xLabels.map((i) => (
        <text key={i} x={cx(i)} y={CHART_H - 4} textAnchor="middle" fontSize={10} fill="#888">
          {points[i].date}
        </text>
      ))}
      <line x1={PAD.left + 8} y1={PAD.top + 6} x2={PAD.left + 26} y2={PAD.top + 6} stroke="#90caf9" strokeWidth={1.5} />
      <text x={PAD.left + 30} y={PAD.top + 10} fontSize={10} fill="#666">
        Daily
      </text>
      <line x1={PAD.left + 66} y1={PAD.top + 6} x2={PAD.left + 84} y2={PAD.top + 6} stroke="#1976d2" strokeWidth={2} />
      <text x={PAD.left + 88} y={PAD.top + 10} fontSize={10} fill="#666">
        7-day rolling avg
      </text>
    </svg>
  )
}

function ReportSection({ report }: { report: RunReport }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="h6" gutterBottom>
        Dataset report
      </Typography>
      <Stack spacing={0.8} sx={{ mb: 2 }}>
        <Typography>
          <strong>Dataset:</strong> {report.dataset}
        </Typography>
        <Typography>
          <strong>File:</strong> {report.file}
        </Typography>
        <Typography>
          <strong>Rows:</strong> {report.rowCount.toLocaleString()}
        </Typography>
        <Typography>
          <strong>Columns:</strong> {report.columns.length} total, {report.numericColumns.length} numeric
        </Typography>
      </Stack>

      {report.numericColumns.length > 0 && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" gutterBottom>
            Descriptive statistics
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Column</TableCell>
                  <TableCell align="right">Count</TableCell>
                  <TableCell align="right">Mean</TableCell>
                  <TableCell align="right">Std</TableCell>
                  <TableCell align="right">Min</TableCell>
                  <TableCell align="right">p50</TableCell>
                  <TableCell align="right">Max</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(report.stats).map(([col, stat]) => (
                  <TableRow key={col}>
                    <TableCell component="th" scope="row" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {col}
                    </TableCell>
                    <TableCell align="right">{stat.count.toLocaleString()}</TableCell>
                    <TableCell align="right">{stat.mean.toFixed(4)}</TableCell>
                    <TableCell align="right">{stat.std.toFixed(4)}</TableCell>
                    <TableCell align="right">{stat.min.toFixed(4)}</TableCell>
                    <TableCell align="right">{stat.p50.toFixed(4)}</TableCell>
                    <TableCell align="right">{stat.max.toFixed(4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </>
      )}

      {report.trend.length > 1 && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" gutterBottom>
            Trend — {report.numericColumns[0]}
          </Typography>
          <TrendChart points={report.trend} />
        </>
      )}
    </Paper>
  )
}

export function RunDetailPage() {
  const params = useParams()
  const runId = Number(params.runId)
  const { currentUser, can } = useAuth()
  const queryClient = useQueryClient()

  const runQuery = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.getRun(runId),
    ...liveMonitorQueryOptions,
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

      {run.report && <ReportSection report={run.report} />}
    </Stack>
  )
}
