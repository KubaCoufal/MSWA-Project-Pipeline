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
      .mockResolvedValueOnce(mockResponse([]))
      .mockResolvedValueOnce(mockResponse([]))
      .mockResolvedValueOnce(mockResponse([])),
  )

  renderWithProviders(<DashboardPage />, { route: '/dashboard' })

  expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  expect(await screen.findByText('9')).toBeInTheDocument()
  expect(screen.getAllByText('Open alerts').length).toBeGreaterThan(0)
})
