import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'

import { AlertDetailPage } from '../pages/AlertDetailPage'
import { AlertsPage } from '../pages/AlertsPage'
import { renderWithProviders } from './test-utils'

function response(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('operator can acknowledge an open alert', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      response({
        id: 4,
        ruleId: 1,
        runId: 22,
        pipelineId: 7,
        message: 'Runtime threshold exceeded',
        severity: 'high',
        status: 'open',
        createdAt: new Date().toISOString(),
      }),
    )
    .mockResolvedValueOnce(
      response({
        id: 4,
        ruleId: 1,
        runId: 22,
        pipelineId: 7,
        message: 'Runtime threshold exceeded',
        severity: 'high',
        status: 'acknowledged',
        createdAt: new Date().toISOString(),
      }),
    )

  vi.stubGlobal('fetch', fetchMock)

  renderWithProviders(
    <Routes>
      <Route path="/alerts/:alertId" element={<AlertDetailPage />} />
    </Routes>,
    { route: '/alerts/4', userId: 2 },
  )

  fireEvent.click(await screen.findByRole('button', { name: 'Acknowledge' }))

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/alerts/4',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'acknowledged' }),
      }),
    )
  })
})

test('viewer does not see alert action controls', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      response({
        id: 5,
        ruleId: 1,
        runId: 33,
        pipelineId: 9,
        message: 'Run failed',
        severity: 'medium',
        status: 'open',
        createdAt: new Date().toISOString(),
      }),
    ),
  )

  renderWithProviders(
    <Routes>
      <Route path="/alerts/:alertId" element={<AlertDetailPage />} />
    </Routes>,
    { route: '/alerts/5', userId: 3 },
  )

  expect(await screen.findByText('Run failed')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
})

test('operator can resolve an alert from the list page', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      response([
        {
          id: 8,
          ruleId: 3,
          runId: 55,
          pipelineId: 2,
          message: 'Run failed',
          severity: 'high',
          status: 'open',
          createdAt: new Date().toISOString(),
        },
      ]),
    )
    .mockResolvedValueOnce(
      response([
        {
          id: 2,
          datasetId: 1,
          name: 'daily-aggregation',
          description: null,
          schedule: '0 2 * * *',
          active: true,
          currentVersionNumber: 1,
          latestRunStatus: 'failed',
          latestRunStartedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    )
    .mockResolvedValueOnce(
      response({
        id: 8,
        ruleId: 3,
        runId: 55,
        pipelineId: 2,
        message: 'Run failed',
        severity: 'high',
        status: 'resolved',
        createdAt: new Date().toISOString(),
      }),
    )

  vi.stubGlobal('fetch', fetchMock)

  renderWithProviders(<AlertsPage />, { route: '/alerts', userId: 2 })

  fireEvent.click(await screen.findByRole('button', { name: 'Resolve' }))

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/alerts/8',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
      }),
    )
  })
})
