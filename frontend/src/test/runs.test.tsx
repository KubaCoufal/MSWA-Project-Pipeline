import { fireEvent, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { RunsPage } from '../pages/RunsPage'
import { renderWithProviders } from './test-utils'

function response(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('filters runs by status on the client', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        response([
          {
            id: 1,
            pipelineId: 1,
            pipelineVersionNumber: 1,
            status: 'failed',
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            recordsProcessed: 0,
            errorMessage: 'Oops',
            runtimeSeconds: 12,
            createdAt: new Date().toISOString(),
          },
          {
            id: 2,
            pipelineId: 1,
            pipelineVersionNumber: 1,
            status: 'success',
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            recordsProcessed: 100,
            errorMessage: null,
            runtimeSeconds: 6,
            createdAt: new Date().toISOString(),
          },
        ]),
      )
      .mockResolvedValueOnce(
        response([
          {
            id: 1,
            datasetId: 1,
            name: 'daily-aggregation',
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
      ),
  )

  renderWithProviders(<RunsPage />, { route: '/runs' })

  expect(await screen.findByText('Run #1')).toBeInTheDocument()
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }))
  fireEvent.click(await screen.findByRole('option', { name: 'Failed' }))

  expect(await screen.findByText('Run #1')).toBeInTheDocument()
  expect(screen.queryByText('Run #2')).not.toBeInTheDocument()
})
