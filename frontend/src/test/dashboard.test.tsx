import { screen } from '@testing-library/react'
import { vi } from 'vitest'

import { DashboardPage } from '../pages/DashboardPage'
import { renderWithProviders } from './test-utils'

function mockResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('renders dashboard summary cards', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        mockResponse({
          datasetCount: 2,
          pipelineCount: 3,
          activePipelineCount: 2,
          recentRunCount: 9,
          failedRunCount: 1,
          openAlertCount: 2,
        }),
      )
      .mockResolvedValueOnce(
        mockResponse([
          {
            id: 1,
            datasetId: 1,
            name: 'daily-revenue-aggregation',
            description: null,
            schedule: '0 2 * * *',
            active: true,
            currentVersionNumber: 1,
            latestRunStatus: 'success',
            latestRunStartedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      )
      .mockResolvedValueOnce(
        mockResponse([
          {
            id: 91,
            pipelineId: 1,
            pipelineVersionNumber: 1,
            status: 'success',
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            recordsProcessed: 50000,
            errorMessage: null,
            runtimeSeconds: 180,
            createdAt: new Date().toISOString(),
          },
        ]),
      )
      .mockResolvedValueOnce(
        mockResponse([
          {
            id: 11,
            ruleId: 7,
            runId: 91,
            pipelineId: 1,
            message: 'Demo alert',
            severity: 'medium',
            status: 'open',
            createdAt: new Date().toISOString(),
          },
        ]),
      ),
  )

  renderWithProviders(<DashboardPage />, { route: '/dashboard' })

  expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  expect(await screen.findByText('9')).toBeInTheDocument()
  expect(screen.getByText('Run activity, last 7 days')).toBeInTheDocument()
  expect(screen.getByText('Processed records, last 7 days')).toBeInTheDocument()
  expect(screen.getByText('Daily at 02:00 UTC')).toBeInTheDocument()
  expect(screen.getAllByText('Open alerts').length).toBeGreaterThan(0)
})
