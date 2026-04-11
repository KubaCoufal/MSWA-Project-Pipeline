import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded'
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded'
import {
  Alert,
  Button,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { api } from '../api/client'
import type { AlertStatus } from '../api/types'
import { liveMonitorQueryOptions } from '../app/queryOptions'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/common/PageHeader'
import { StatusChip } from '../components/common/StatusChip'
import { formatDateTime } from '../utils/format'

export function AlertsPage() {
  const { currentUser, can } = useAuth()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | AlertStatus>('all')

  const alertsQuery = useQuery({ queryKey: ['alerts'], queryFn: () => api.getAlerts(), ...liveMonitorQueryOptions })
  const pipelinesQuery = useQuery({ queryKey: ['pipelines'], queryFn: api.getPipelines })
  const updateAlertMutation = useMutation({
    mutationFn: ({ alertId, status }: { alertId: number; status: 'acknowledged' | 'resolved' }) =>
      api.updateAlert(alertId, { status }, currentUser.id),
    onSuccess: async (updatedAlert) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['alert', updatedAlert.id] }),
        queryClient.invalidateQueries({ queryKey: ['alerts', updatedAlert.pipelineId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
  })

  const filteredAlerts = useMemo(() => {
    return (alertsQuery.data ?? []).filter((alertItem) => {
      return statusFilter === 'all' ? true : alertItem.status === statusFilter
    })
  }, [alertsQuery.data, statusFilter])

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Alerts"
        description="Track the incidents raised by failed or slow runs, and navigate back to the affected resources."
      />

      <Paper sx={{ p: 2.5 }}>
        <TextField
          select
          label="Alert status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | AlertStatus)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="all">All statuses</MenuItem>
          <MenuItem value="open">Open</MenuItem>
          <MenuItem value="acknowledged">Acknowledged</MenuItem>
          <MenuItem value="resolved">Resolved</MenuItem>
        </TextField>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        {updateAlertMutation.isError && <Alert severity="error">{updateAlertMutation.error.message}</Alert>}

        {alertsQuery.isLoading ? (
          <Stack spacing={2} sx={{ py: 6, alignItems: 'center' }}>
            <CircularProgress />
            <Typography color="text.secondary">Loading alerts...</Typography>
          </Stack>
        ) : alertsQuery.isError ? (
          <Alert severity="error">{alertsQuery.error.message}</Alert>
        ) : filteredAlerts.length === 0 ? (
          <Alert severity="info">No alerts match the selected filter.</Alert>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Alert</TableCell>
                <TableCell>Pipeline</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                {can('admin', 'operator') && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAlerts.map((alertItem) => {
                const pipelineName =
                  pipelinesQuery.data?.find((pipeline) => pipeline.id === alertItem.pipelineId)?.name ??
                  `Pipeline #${alertItem.pipelineId}`
                return (
                  <TableRow key={alertItem.id} hover>
                    <TableCell>
                      <Typography component={RouterLink} to={`/alerts/${alertItem.id}`} sx={{ color: 'primary.main' }}>
                        Alert #{alertItem.id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {alertItem.message}
                      </Typography>
                    </TableCell>
                    <TableCell>{pipelineName}</TableCell>
                    <TableCell>
                      <StatusChip value={alertItem.severity} />
                    </TableCell>
                    <TableCell>
                      <StatusChip value={alertItem.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(alertItem.createdAt)}</TableCell>
                    {can('admin', 'operator') && (
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }} useFlexGap>
                          {alertItem.status === 'open' && (
                            <Button
                              size="small"
                              startIcon={<MarkEmailReadRoundedIcon />}
                              onClick={() =>
                                updateAlertMutation.mutate({ alertId: alertItem.id, status: 'acknowledged' })
                              }
                              disabled={updateAlertMutation.isPending}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {alertItem.status !== 'resolved' && (
                            <Button
                              size="small"
                              color="success"
                              startIcon={<DoneAllRoundedIcon />}
                              onClick={() => updateAlertMutation.mutate({ alertId: alertItem.id, status: 'resolved' })}
                              disabled={updateAlertMutation.isPending}
                            >
                              Resolve
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Stack>
  )
}
