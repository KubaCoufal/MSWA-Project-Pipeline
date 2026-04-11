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
import { Link as RouterLink, useParams } from 'react-router-dom'

import { api } from '../api/client'
import { PageHeader } from '../components/common/PageHeader'
import { formatDateTime } from '../utils/format'

export function DatasetDetailPage() {
  const params = useParams()
  const datasetId = Number(params.datasetId)

  const datasetQuery = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: () => api.getDataset(datasetId),
  })
  const pipelinesQuery = useQuery({ queryKey: ['pipelines'], queryFn: api.getPipelines })

  if (datasetQuery.isLoading) {
    return (
      <Stack spacing={2} sx={{ py: 8, alignItems: 'center' }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading dataset detail...</Typography>
      </Stack>
    )
  }

  if (datasetQuery.isError) {
    return <Alert severity="error">{datasetQuery.error.message}</Alert>
  }

  const dataset = datasetQuery.data!
  const relatedPipelines = (pipelinesQuery.data ?? []).filter((pipeline) => pipeline.datasetId === datasetId)

  return (
    <Stack spacing={3}>
      <PageHeader
        title={dataset.name}
        description={dataset.description || 'Metadata-only dataset used as an input source for pipelines.'}
      />

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
            Metadata
          </Typography>
          <Stack spacing={1.5}>
            <Typography>
              <strong>Owner:</strong> {dataset.owner}
            </Typography>
            <Typography>
              <strong>Schema version:</strong> {dataset.schemaVersion}
            </Typography>
            <Typography>
              <strong>Created:</strong> {formatDateTime(dataset.createdAt)}
            </Typography>
            <Typography>
              <strong>Updated:</strong> {formatDateTime(dataset.updatedAt)}
            </Typography>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" gutterBottom>
            Referencing pipelines
          </Typography>
          {relatedPipelines.length === 0 ? (
            <Alert severity="info">No pipelines reference this dataset yet.</Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pipeline</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {relatedPipelines.map((pipeline) => (
                  <TableRow key={pipeline.id}>
                    <TableCell>
                      <Typography component={RouterLink} to={`/pipelines/${pipeline.id}`} sx={{ color: 'primary.main' }}>
                        {pipeline.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{pipeline.schedule || 'No schedule'}</TableCell>
                    <TableCell>{pipeline.active ? 'Active' : 'Inactive'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>
    </Stack>
  )
}
