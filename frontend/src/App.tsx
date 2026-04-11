import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth/AuthContext'
import { AppShell } from './components/layout/AppShell'
import { AlertDetailPage } from './pages/AlertDetailPage'
import { AlertRuleDetailPage } from './pages/AlertRuleDetailPage'
import { AlertRulesPage } from './pages/AlertRulesPage'
import { AlertsPage } from './pages/AlertsPage'
import { DashboardPage } from './pages/DashboardPage'
import { DatasetDetailPage } from './pages/DatasetDetailPage'
import { DatasetsPage } from './pages/DatasetsPage'
import { PipelineDetailPage } from './pages/PipelineDetailPage'
import { PipelinesPage } from './pages/PipelinesPage'
import { RunDetailPage } from './pages/RunDetailPage'
import { RunsPage } from './pages/RunsPage'
import { theme } from './theme'

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
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
            </AppShell>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
