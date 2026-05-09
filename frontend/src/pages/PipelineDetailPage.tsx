import EditRoundedIcon from '@mui/icons-material/EditRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import {
  Alert,
  Box,
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
import { Link as RouterLink, useParams } from 'react-router-dom'

import { api } from '../api/client'
import type { UpdatePipelineInput } from '../api/types'
import { liveMonitorQueryOptions } from '../app/queryOptions'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/common/PageHeader'
import { StatusChip } from '../components/common/StatusChip'
import { EditPipelineDialog } from '../components/forms/EditPipelineDialog'
import { formatDateTime, formatDuration } from '../utils/format'
import { describeSchedule, scheduleDetail } from '../utils/schedule'

function describeSource(sourceType: string, kaggleDatasetRef?: string | null, kaggleCategory?: string | null) {
  if (sourceType === 'kaggle_latest') {
    return 'Latest published Kaggle CSV dataset'
  }
  if (sourceType === 'kaggle_latest_category') {
    return `Latest published Kaggle CSV dataset in ${kaggleCategory ?? 'selected topic'}`
  }
  if (sourceType === 'kaggle_specific') {
    return kaggleDatasetRef ?? 'Specific Kaggle dataset'
  }
  return 'Simulated processing run'
}

export function PipelineDetailPage() {
  const params = useParams()
  const pipelineId = Number(params.pipelineId)
  const { currentUser, can } = useAuth()
  const queryClient = useQueryClient()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const pipelineQuery = useQuery({
    queryKey: ['pipeline', pipelineId],
    queryFn: () => api.getPipeline(pipelineId),
    ...liveMonitorQueryOptions,
  })
  const datasetsQuery = useQuery({ queryKey: ['datasets'], queryFn: api.getDatasets })
  const runsQuery = useQuery({
    queryKey: ['runs', pipelineId],
    queryFn: () => api.getRuns({ pipelineId }),
    ...liveMonitorQueryOptions,
  })
  const alertsQuery = useQuery({
    queryKey: ['alerts', pipelineId],
    queryFn: () => api.getAlerts({ pipelineId }),
    ...liveMonitorQueryOptions,
  })
  const rulesQuery = useQuery({
    queryKey: ['alert-rules', pipelineId],
    queryFn: () => api.getAlertRules({ pipelineId }),
  })

  const runPipelineMutation = useMutation({
    mutationFn: () => api.runPipeline(pipelineId, currentUser.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['runs', pipelineId] }),
        queryClient.invalidateQueries({ queryKey: ['pipelines'] }),
      ])
    },
  })
  const updatePipelineMutation = useMutation({
    mutationFn: (payload: UpdatePipelineInput) => api.updatePipeline(pipelineId, payload, currentUser.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipeline', pipelineId] }),
        queryClient.invalidateQueries({ queryKey: ['pipelines'] }),
      ])
      setEditDialogOpen(false)
    },
  })

  if (pipelineQuery.isLoading) {
    return (
      <Stack spacing={2} sx={{ py: 8, alignItems: 'center' }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading pipeline detail...</Typography>
      </Stack>
    )
  }

  if (pipelineQuery.isError) {
    return <Alert severity="error">{pipelineQuery.error.message}</Alert>
  }

  const pipeline = pipelineQuery.data!
  const dataset = (datasetsQuery.data ?? []).find((item) => item.id === pipeline.datasetId)
  const successfulRuns = (runsQuery.data ?? []).filter((run) => run.status === 'success').length
  const failedRuns = (runsQuery.data ?? []).filter((run) => run.status === 'failed').length
  const averageRuntime =
    (runsQuery.data ?? []).filter((run) => run.runtimeSeconds !== null).reduce((sum, run) => sum + (run.runtimeSeconds ?? 0), 0) /
      Math.max((runsQuery.data ?? []).filter((run) => run.runtimeSeconds !== null).length, 1) || 0

  return (
    <Stack spacing={3}>
      <PageHeader
        title={pipeline.name}
        description={pipeline.description || 'Pipeline with manual and scheduled run support.'}
        actions={
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {can('admin') && (
              <>
                <Button startIcon={<EditRoundedIcon />} variant="outlined" onClick={() => setEditDialogOpen(true)}>
                  Edit pipeline
                </Button>
                <Button
                  variant="outlined"
                  color={pipeline.active ? 'warning' : 'success'}
                  onClick={() => updatePipelineMutation.mutate({ active: !pipeline.active })}
                  disabled={updatePipelineMutation.isPending}
                >
                  {pipeline.active ? 'Deactivate pipeline' : 'Activate pipeline'}
                </Button>
              </>
            )}
            {can('admin', 'operator') && (
              <Button
                startIcon={<PlayArrowRoundedIcon />}
                variant="contained"
                onClick={() => runPipelineMutation.mutate()}
                disabled={!pipeline.active || runPipelineMutation.isPending}
              >
                Run pipeline
              </Button>
            )}
          </Stack>
        }
      />

      {(runPipelineMutation.isError || updatePipelineMutation.isError) && (
        <Alert severity="error">{runPipelineMutation.error?.message || updatePipelineMutation.error?.message}</Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            lg: 'minmax(0, 1fr) minmax(0, 1.1fr)',
          },
        }}
      >
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>
            Metadata
          </Typography>
          <Stack spacing={1.2}>
            <Typography>
              <strong>Dataset:</strong> {dataset?.name ?? `Dataset #${pipeline.datasetId}`}
            </Typography>
            <Typography>
              <strong>Schedule:</strong> {describeSchedule(pipeline.schedule)}
            </Typography>
            <Typography>
              <strong>Source:</strong> {describeSource(pipeline.sourceType, pipeline.kaggleDatasetRef, pipeline.kaggleCategory)}
            </Typography>
            <Typography color="text.secondary">
              <strong>Cron:</strong> {scheduleDetail(pipeline.schedule)}
            </Typography>
            <Typography>
              <strong>Version:</strong> {pipeline.currentVersionNumber}
            </Typography>
            <Typography>
              <strong>State:</strong> {pipeline.active ? 'Active' : 'Inactive'}
            </Typography>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>
            Operational snapshot
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: 'repeat(1, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
            }}
          >
            <Paper sx={{ p: 2 }}>
              <Typography color="text.secondary">Successful runs</Typography>
              <Typography variant="h4">{successfulRuns}</Typography>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography color="text.secondary">Failed runs</Typography>
              <Typography variant="h4">{failedRuns}</Typography>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography color="text.secondary">Average runtime</Typography>
              <Typography variant="h4">{formatDuration(Math.round(averageRuntime))}</Typography>
            </Paper>
          </Box>
        </Paper>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            xl: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
          },
        }}
      >
        <Paper sx={{ p: 2.5 }}>
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
              {(runsQuery.data ?? []).slice(0, 8).map((run) => (
                <TableRow key={run.id}>
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
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" gutterBottom>
              Alert rules
            </Typography>
            <Stack spacing={1.25}>
              {(rulesQuery.data ?? []).map((rule) => (
                <Box key={rule.id} sx={{ borderRadius: 3, bgcolor: 'rgba(11,93,92,0.06)', p: 1.5 }}>
                  <Typography component={RouterLink} to={`/alert-rules/${rule.id}`} sx={{ color: 'primary.main' }}>
                    {rule.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {rule.ruleType} {rule.thresholdSeconds ? `· ${rule.thresholdSeconds}s` : ''}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" gutterBottom>
              Recent alerts
            </Typography>
            <Stack spacing={1.25}>
              {(alertsQuery.data ?? []).slice(0, 4).map((alertItem) => (
                <Box key={alertItem.id} sx={{ borderRadius: 3, bgcolor: 'rgba(183,58,58,0.06)', p: 1.5 }}>
                  <Typography component={RouterLink} to={`/alerts/${alertItem.id}`} sx={{ color: 'primary.main' }}>
                    Alert #{alertItem.id}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {alertItem.message}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Box>

      <EditPipelineDialog
        key={`${pipeline.id}-${pipeline.updatedAt}`}
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        pipeline={pipeline}
        onSubmit={(payload) => updatePipelineMutation.mutate(payload)}
        loading={updatePipelineMutation.isPending}
      />
    </Stack>
  )
}
