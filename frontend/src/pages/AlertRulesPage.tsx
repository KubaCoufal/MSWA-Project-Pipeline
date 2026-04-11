import AddRoundedIcon from '@mui/icons-material/AddRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { Alert, Button, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { api } from '../api/client'
import type { CreateAlertRuleInput } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/common/PageHeader'
import { StatusChip } from '../components/common/StatusChip'
import { CreateAlertRuleDialog } from '../components/forms/CreateAlertRuleDialog'
import { formatDateTime } from '../utils/format'

export function AlertRulesPage() {
  const { currentUser, can } = useAuth()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const rulesQuery = useQuery({ queryKey: ['alert-rules'], queryFn: () => api.getAlertRules() })
  const pipelinesQuery = useQuery({ queryKey: ['pipelines'], queryFn: api.getPipelines })
  const rules = rulesQuery.data ?? []

  const createRuleMutation = useMutation({
    mutationFn: (payload: CreateAlertRuleInput) => api.createAlertRule(payload, currentUser.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
      setDialogOpen(false)
    },
  })

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Alert Rules"
        description="Define the simple rule engine that turns failed or slow runs into operator-visible alerts."
        actions={
          can('admin') ? (
            <Button startIcon={<AddRoundedIcon />} variant="contained" onClick={() => setDialogOpen(true)}>
              Add rule
            </Button>
          ) : undefined
        }
      />

      {createRuleMutation.isError && <Alert severity="error">{createRuleMutation.error.message}</Alert>}

      <Paper sx={{ p: 2.5 }}>
        {rulesQuery.isLoading ? (
          <Stack spacing={2} sx={{ py: 6, alignItems: 'center' }}>
            <CircularProgress />
            <Typography color="text.secondary">Loading alert rules...</Typography>
          </Stack>
        ) : rulesQuery.isError ? (
          <Alert severity="error">{rulesQuery.error.message}</Alert>
        ) : rules.length === 0 ? (
          <Alert severity="info">No alert rules yet. Add a rule to trigger alerts from runtime or failures.</Alert>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Pipeline</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Detail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((rule) => {
                const pipelineName =
                  pipelinesQuery.data?.find((pipeline) => pipeline.id === rule.pipelineId)?.name ?? `Pipeline #${rule.pipelineId}`
                return (
                  <TableRow key={rule.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">{rule.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Typography>
                    </TableCell>
                    <TableCell>{pipelineName}</TableCell>
                    <TableCell>
                      {rule.ruleType}
                      {rule.thresholdSeconds ? ` · ${rule.thresholdSeconds}s` : ''}
                    </TableCell>
                    <TableCell>
                      <StatusChip value={rule.severity} />
                    </TableCell>
                    <TableCell>{formatDateTime(rule.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Button component={RouterLink} to={`/alert-rules/${rule.id}`} endIcon={<OpenInNewRoundedIcon />}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <CreateAlertRuleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        pipelines={pipelinesQuery.data ?? []}
        onSubmit={(payload) => createRuleMutation.mutate(payload)}
        loading={createRuleMutation.isPending}
      />
    </Stack>
  )
}
