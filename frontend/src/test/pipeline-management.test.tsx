import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'

import { PipelineDetailPage } from '../pages/PipelineDetailPage'
import { PipelinesPage } from '../pages/PipelinesPage'
import { renderWithProviders } from './test-utils'

function response(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('admin can edit pipeline metadata from the list page', async () => {
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
          description: 'Initial description',
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
      response({
        id: 1,
        datasetId: 1,
        name: 'daily-aggregation-v2',
        description: 'Updated description',
        schedule: '0 4 * * *',
        active: true,
        currentVersionNumber: 1,
        latestRunStatus: 'success',
        latestRunStartedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    )

  vi.stubGlobal('fetch', fetchMock)

  renderWithProviders(<PipelinesPage />, { route: '/pipelines', userId: 1 })

  fireEvent.click(await screen.findByRole('button', { name: 'Edit daily-aggregation' }))
  fireEvent.change(screen.getByLabelText('Pipeline name'), { target: { value: 'daily-aggregation-v2' } })
  fireEvent.change(screen.getByDisplayValue('02:00'), { target: { value: '04:00' } })
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated description' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/pipelines/1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          name: 'daily-aggregation-v2',
          description: 'Updated description',
          schedule: '0 4 * * *',
          active: true,
        }),
      }),
    )
  })
})

test('admin can deactivate a pipeline from detail view', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      response({
        id: 1,
        datasetId: 1,
        name: 'daily-aggregation',
        description: 'Pipeline detail',
        schedule: '0 2 * * *',
        active: true,
        currentVersionNumber: 1,
        latestRunStatus: 'success',
        latestRunStartedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    )
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
    .mockResolvedValueOnce(response([]))
    .mockResolvedValueOnce(response([]))
    .mockResolvedValueOnce(response([]))
    .mockResolvedValueOnce(
      response({
        id: 1,
        datasetId: 1,
        name: 'daily-aggregation',
        description: 'Pipeline detail',
        schedule: '0 2 * * *',
        active: false,
        currentVersionNumber: 1,
        latestRunStatus: 'success',
        latestRunStartedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    )

  vi.stubGlobal('fetch', fetchMock)

  renderWithProviders(
    <Routes>
      <Route path="/pipelines/:pipelineId" element={<PipelineDetailPage />} />
    </Routes>,
    { route: '/pipelines/1', userId: 1 },
  )

  fireEvent.click(await screen.findByRole('button', { name: 'Deactivate pipeline' }))

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/pipelines/1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ active: false }),
      }),
    )
  })
})
