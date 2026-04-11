import type {
  AlertEvent,
  AlertRule,
  CreateAlertRuleInput,
  CreateDatasetInput,
  CreatePipelineInput,
  DashboardSummary,
  Dataset,
  Pipeline,
  Run,
  UpdatePipelineInput,
  UpdateRunInput,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function apiFetch<T>(path: string, init: RequestInit = {}, userId?: number): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (userId) {
    headers.set('X-Demo-User-Id', String(userId))
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const payload = (await response.json()) as { detail?: string }
      message = payload.detail ?? message
    } catch {
      message = response.statusText || message
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function buildQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })

  const query = search.toString()
  return query ? `?${query}` : ''
}

export const api = {
  getDashboardSummary: () => apiFetch<DashboardSummary>('/dashboard/summary'),
  getDatasets: () => apiFetch<Dataset[]>('/datasets'),
  getDataset: (datasetId: number) => apiFetch<Dataset>(`/datasets/${datasetId}`),
  createDataset: (payload: CreateDatasetInput, userId: number) =>
    apiFetch<Dataset>('/datasets', { method: 'POST', body: JSON.stringify(payload) }, userId),

  getPipelines: () => apiFetch<Pipeline[]>('/pipelines'),
  getPipeline: (pipelineId: number) => apiFetch<Pipeline>(`/pipelines/${pipelineId}`),
  createPipeline: (payload: CreatePipelineInput, userId: number) =>
    apiFetch<Pipeline>('/pipelines', { method: 'POST', body: JSON.stringify(payload) }, userId),
  updatePipeline: (pipelineId: number, payload: UpdatePipelineInput, userId: number) =>
    apiFetch<Pipeline>(`/pipelines/${pipelineId}`, { method: 'PATCH', body: JSON.stringify(payload) }, userId),
  runPipeline: (pipelineId: number, userId: number) =>
    apiFetch<Run>(`/pipelines/${pipelineId}/run`, { method: 'POST' }, userId),

  getRuns: (filters: { pipelineId?: number; status?: string } = {}) =>
    apiFetch<Run[]>(`/runs${buildQuery(filters)}`),
  getRun: (runId: number) => apiFetch<Run>(`/runs/${runId}`),
  updateRun: (runId: number, payload: UpdateRunInput, userId: number) =>
    apiFetch<Run>(`/runs/${runId}`, { method: 'PATCH', body: JSON.stringify(payload) }, userId),

  getAlertRules: (filters: { pipelineId?: number } = {}) =>
    apiFetch<AlertRule[]>(`/alert-rules${buildQuery(filters)}`),
  getAlertRule: (ruleId: number) => apiFetch<AlertRule>(`/alert-rules/${ruleId}`),
  createAlertRule: (payload: CreateAlertRuleInput, userId: number) =>
    apiFetch<AlertRule>('/alert-rules', { method: 'POST', body: JSON.stringify(payload) }, userId),

  getAlerts: (filters: { pipelineId?: number; status?: string } = {}) =>
    apiFetch<AlertEvent[]>(`/alerts${buildQuery(filters)}`),
  getAlert: (alertId: number) => apiFetch<AlertEvent>(`/alerts/${alertId}`),
}
