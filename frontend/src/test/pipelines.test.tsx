import { fireEvent, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

import { PipelinesPage } from '../pages/PipelinesPage'
import { renderWithProviders } from './test-utils'

function response(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('operator can trigger a pipeline run', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      response([
        {
          id: 1,
          name: 'transactions',
          owner: 'analytics',
          description: null,
          schemaVersion: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          latestRunStatus: null,
          latestRunStartedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    )
    .mockResolvedValueOnce(
      response({
        id: 44,
        pipelineId: 1,
        pipelineVersionNumber: 1,
        status: 'pending',
        startedAt: null,
        finishedAt: null,
        recordsProcessed: 0,
        errorMessage: null,
        runtimeSeconds: null,
        createdAt: new Date().toISOString(),
      }),
    )
    .mockResolvedValueOnce(response([]))
    .mockResolvedValueOnce(response([]))

  vi.stubGlobal('fetch', fetchMock)

  renderWithProviders(<PipelinesPage />, { route: '/pipelines', userId: 2 })

  const runButton = await screen.findByRole('button', { name: 'Run' })
  fireEvent.click(runButton)

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/pipelines/1/run',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })
})

test('viewer does not see pipeline creation controls', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => Promise.resolve(response([]))),
  )

  renderWithProviders(<PipelinesPage />, { route: '/pipelines', userId: 3 })

  expect(await screen.findByText('No pipelines yet. Create one after you have a dataset.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /add pipeline/i })).not.toBeInTheDocument()
})
