import { Alert, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { api } from '../api/client'
import { PageHeader } from '../components/common/PageHeader'
import { StatusChip } from '../components/common/StatusChip'
import { formatDateTime } from '../utils/format'

export function AlertRuleDetailPage() {
  const params = useParams()
  const ruleId = Number(params.ruleId)

  const ruleQuery = useQuery({
    queryKey: ['alert-rule', ruleId],
    queryFn: () => api.getAlertRule(ruleId),
  })
  const pipelinesQuery = useQuery({ queryKey: ['pipelines'], queryFn: api.getPipelines })

  if (ruleQuery.isLoading) {
    return (
      <Stack spacing={2} sx={{ py: 8, alignItems: 'center' }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading alert rule detail...</Typography>
      </Stack>
    )
  }

  if (ruleQuery.isError) {
    return <Alert severity="error">{ruleQuery.error.message}</Alert>
  }

  const rule = ruleQuery.data!
  const pipelineName =
    pipelinesQuery.data?.find((pipeline) => pipeline.id === rule.pipelineId)?.name ?? `Pipeline #${rule.pipelineId}`

  return (
    <Stack spacing={3}>
      <PageHeader
        title={rule.name}
        description="Structured rule definition for converting runtime conditions into alerts."
      />

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography>
            <strong>Pipeline:</strong> {pipelineName}
          </Typography>
          <Typography>
            <strong>Rule type:</strong> {rule.ruleType}
          </Typography>
          <Typography>
            <strong>Threshold seconds:</strong> {rule.thresholdSeconds ?? 'Not applicable'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography>
              <strong>Severity:</strong>
            </Typography>
            <StatusChip value={rule.severity} />
          </Stack>
          <Typography>
            <strong>Enabled:</strong> {rule.enabled ? 'Yes' : 'No'}
          </Typography>
          <Typography>
            <strong>Created:</strong> {formatDateTime(rule.createdAt)}
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  )
}
