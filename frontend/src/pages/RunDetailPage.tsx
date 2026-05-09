import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CleaningServicesRoundedIcon from '@mui/icons-material/CleaningServicesRounded'
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded'
import DatasetRoundedIcon from '@mui/icons-material/DatasetRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Link,
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
import type { RunStep } from '../api/types'
import { liveMonitorQueryOptions } from '../app/queryOptions'
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
    ...liveMonitorQueryOptions,
  })
  const pipelinesQuery = useQuery({ queryKey: ['pipelines'], queryFn: api.getPipelines })
  const stepsQuery = useQuery({
    queryKey: ['run-steps', runId],
    queryFn: () => api.getRunSteps(runId),
    ...liveMonitorQueryOptions,
  })

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
        queryClient.invalidateQueries({ queryKey: ['run-steps', runId] }),
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
  const steps = stepsQuery.data ?? []
  const completedStepCount = steps.filter((step) => step.status === 'success' || step.status === 'skipped').length
  const progress = steps.length ? Math.round((completedStepCount / steps.length) * 100) : 0
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
            <Typography>
              <strong>Redis job:</strong> {run.rqJobId ?? 'Not queued'}
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

      <Paper sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', mb: 2 }}
        >
          <Box>
            <Typography variant="h6">Pipeline steps</Typography>
            <Typography color="text.secondary">
              Redis queues the run, the worker executes each stage, and the database records progress for monitoring.
            </Typography>
          </Box>
          <Box sx={{ minWidth: { xs: '100%', md: 240 } }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {progress}%
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 999 }} />
          </Box>
        </Stack>
        {stepsQuery.isError ? (
          <Alert severity="error">{stepsQuery.error.message}</Alert>
        ) : (
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: {
                  xs: 'repeat(1, minmax(0, 1fr))',
                  md: 'repeat(2, minmax(0, 1fr))',
                  xl: 'repeat(4, minmax(0, 1fr))',
                },
              }}
            >
              {steps.map((step) => {
                const copy = stepCopy(step.name)
                const Icon = copy.Icon
                return (
                  <Box
                    key={step.id}
                    sx={{
                      border: '1px solid',
                      borderColor:
                        step.status === 'failed'
                          ? 'error.light'
                          : step.status === 'running'
                            ? 'info.light'
                            : 'divider',
                      borderRadius: 2,
                      p: 1.75,
                      minHeight: 150,
                      bgcolor:
                        step.status === 'failed'
                          ? 'rgba(183,58,58,0.06)'
                          : step.status === 'running'
                            ? 'rgba(2,132,199,0.06)'
                            : 'background.paper',
                    }}
                  >
                    <Stack spacing={1.1}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'rgba(11,93,92,0.1)',
                            color: 'primary.main',
                          }}
                        >
                          <Icon fontSize="small" />
                        </Box>
                        <StatusChip value={step.status} />
                      </Stack>
                      <Box>
                        <Typography variant="subtitle2">{copy.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {copy.description}
                        </Typography>
                      </Box>
                      <Typography variant="body2">{step.errorMessage ?? step.message ?? formatStepMetrics(step)}</Typography>
                    </Stack>
                  </Box>
                )
              })}
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Step</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Finished</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {steps.map((step) => (
                  <TableRow key={step.id}>
                    <TableCell>{stepCopy(step.name).title}</TableCell>
                    <TableCell>
                      <StatusChip value={step.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(step.startedAt)}</TableCell>
                    <TableCell>{formatDateTime(step.finishedAt)}</TableCell>
                    <TableCell>{step.errorMessage ?? step.message ?? formatStepMetrics(step)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        )}
      </Paper>

      {run.edaResult && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" gutterBottom>
              Exploratory analysis
            </Typography>
            <Stack spacing={1}>
              <Typography>
                <strong>Kaggle dataset:</strong>{' '}
                {run.edaResult.datasetUrl ? (
                  <Link href={run.edaResult.datasetUrl} target="_blank" rel="noreferrer">
                    {run.edaResult.datasetRef}
                  </Link>
                ) : (
                  run.edaResult.datasetRef ?? 'Unknown dataset'
                )}
              </Typography>
              {run.edaResult.category && (
                <Typography>
                  <strong>Topic/category:</strong> {run.edaResult.category}
                </Typography>
              )}
              <Typography>
                <strong>Files analyzed:</strong> {run.edaResult.fileCount}
              </Typography>
            </Stack>
          </Paper>

          {run.edaResult.files.map((file) => (
            <Paper key={file.fileName} sx={{ p: 2.5 }}>
              <Typography variant="h6" gutterBottom>
                {file.fileName}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: 'repeat(1, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
                  mb: 2,
                }}
              >
                <Paper sx={{ p: 2 }}>
                  <Typography color="text.secondary">Rows</Typography>
                  <Typography variant="h5">{formatNumber(file.rowCount)}</Typography>
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Typography color="text.secondary">Columns</Typography>
                  <Typography variant="h5">{formatNumber(file.columnCount)}</Typography>
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <Typography color="text.secondary">Duplicate rows</Typography>
                  <Typography variant="h5">{formatNumber(file.duplicateRows)}</Typography>
                </Paper>
              </Box>

              <Typography variant="subtitle1" gutterBottom>
                Columns
              </Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Missing</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {file.columns.slice(0, 12).map((column) => (
                    <TableRow key={column.name}>
                      <TableCell>{column.name}</TableCell>
                      <TableCell>{column.dtype}</TableCell>
                      <TableCell align="right">{formatNumber(column.missing)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {Object.keys(file.numericSummary).length > 0 && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Numeric summary
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Column</TableCell>
                        <TableCell align="right">Mean</TableCell>
                        <TableCell align="right">Min</TableCell>
                        <TableCell align="right">Max</TableCell>
                        <TableCell align="right">Std</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(file.numericSummary)
                        .slice(0, 10)
                        .map(([column, summary]) => (
                          <TableRow key={column}>
                            <TableCell>{column}</TableCell>
                            <TableCell align="right">{summary.mean?.toFixed(2) ?? '-'}</TableCell>
                            <TableCell align="right">{summary.min?.toFixed(2) ?? '-'}</TableCell>
                            <TableCell align="right">{summary.max?.toFixed(2) ?? '-'}</TableCell>
                            <TableCell align="right">{summary.std?.toFixed(2) ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

function formatStepMetrics(step: RunStep) {
  if (!step.metrics) {
    return '-'
  }
  return Object.entries(step.metrics)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(', ')
}

function stepCopy(name: string) {
  const fallback = {
    title: name
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    description: 'Worker stage recorded for this run.',
    Icon: FactCheckRoundedIcon,
  }

  return (
    {
      queue_job: {
        title: 'Queue job',
        description: 'The API creates the run and puts a job on the Redis RQ queue.',
        Icon: CloudQueueRoundedIcon,
      },
      start_run: {
        title: 'Start run',
        description: 'The worker claims the job and moves the run into running state.',
        Icon: PlayArrowRoundedIcon,
      },
      resolve_source: {
        title: 'Resolve Kaggle source',
        description: 'The worker normalizes the Kaggle URL or selects the latest CSV dataset.',
        Icon: SearchRoundedIcon,
      },
      download_dataset: {
        title: 'Download dataset',
        description: 'Kaggle API credentials are used server-side to fetch and unzip the dataset.',
        Icon: DownloadRoundedIcon,
      },
      discover_csv_files: {
        title: 'Discover CSV files',
        description: 'The worker scans the download for analyzable CSV files.',
        Icon: DatasetRoundedIcon,
      },
      profile_csv_files: {
        title: 'Profile CSV files',
        description: 'Pandas computes rows, columns, missing values, duplicates, and summaries.',
        Icon: InsightsRoundedIcon,
      },
      simulate_processing: {
        title: 'Simulate processing',
        description: 'Demo mode waits briefly and records a successful synthetic workload.',
        Icon: FactCheckRoundedIcon,
      },
      store_result: {
        title: 'Store result',
        description: 'Run metrics and the EDA report are saved back to Postgres.',
        Icon: SaveRoundedIcon,
      },
      cleanup: {
        title: 'Cleanup',
        description: 'Temporary Kaggle download files are removed after the worker finishes.',
        Icon: CleaningServicesRoundedIcon,
      },
    }[name] ?? fallback
  )
}
