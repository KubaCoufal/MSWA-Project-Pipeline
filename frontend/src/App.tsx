import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth/AuthContext'
import { AppShell } from './components/layout/AppShell'
import { theme } from './theme'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })))
const DatasetsPage = lazy(() => import('./pages/DatasetsPage').then(({ DatasetsPage }) => ({ default: DatasetsPage })))
const DatasetDetailPage = lazy(() =>
  import('./pages/DatasetDetailPage').then(({ DatasetDetailPage }) => ({ default: DatasetDetailPage })),
)
const PipelinesPage = lazy(() => import('./pages/PipelinesPage').then(({ PipelinesPage }) => ({ default: PipelinesPage })))
const PipelineDetailPage = lazy(() =>
  import('./pages/PipelineDetailPage').then(({ PipelineDetailPage }) => ({ default: PipelineDetailPage })),
)
const RunsPage = lazy(() => import('./pages/RunsPage').then(({ RunsPage }) => ({ default: RunsPage })))
const RunDetailPage = lazy(() => import('./pages/RunDetailPage').then(({ RunDetailPage }) => ({ default: RunDetailPage })))
const AlertRulesPage = lazy(() =>
  import('./pages/AlertRulesPage').then(({ AlertRulesPage }) => ({ default: AlertRulesPage })),
)
const AlertRuleDetailPage = lazy(() =>
  import('./pages/AlertRuleDetailPage').then(({ AlertRuleDetailPage }) => ({ default: AlertRuleDetailPage })),
)
const AlertsPage = lazy(() => import('./pages/AlertsPage').then(({ AlertsPage }) => ({ default: AlertsPage })))
const AlertDetailPage = lazy(() =>
  import('./pages/AlertDetailPage').then(({ AlertDetailPage }) => ({ default: AlertDetailPage })),
)

function PageFallback() {
  return (
    <Box role="status" aria-label="Loading page" sx={{ py: 3 }}>
      <LinearProgress />
    </Box>
  )
}

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 2000,
          },
        },
      }),
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AppShell>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/datasets" element={<DatasetsPage />} />
                  <Route path="/datasets/:datasetId" element={<DatasetDetailPage />} />
                  <Route path="/pipelines" element={<PipelinesPage />} />
                  <Route path="/pipelines/:pipelineId" element={<PipelineDetailPage />} />
                  <Route path="/runs" element={<RunsPage />} />
                  <Route path="/runs/:runId" element={<RunDetailPage />} />
                  <Route path="/alert-rules" element={<AlertRulesPage />} />
                  <Route path="/alert-rules/:ruleId" element={<AlertRuleDetailPage />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/alerts/:alertId" element={<AlertDetailPage />} />
                </Routes>
              </Suspense>
            </AppShell>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
