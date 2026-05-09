export type UserRole = 'admin' | 'operator' | 'viewer'
export type RunStatus = 'pending' | 'running' | 'success' | 'failed'
export type RunStepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'
export type AlertRuleType = 'run_failed' | 'runtime_exceeded'
export type AlertSeverity = 'low' | 'medium' | 'high'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'
export type PipelineSourceType = 'simulated' | 'kaggle_specific' | 'kaggle_latest' | 'kaggle_latest_category'

export interface DemoUser {
  id: number
  email: string
  displayName: string
  role: UserRole
}

export interface DashboardSummary {
  datasetCount: number
  pipelineCount: number
  activePipelineCount: number
  recentRunCount: number
  failedRunCount: number
  openAlertCount: number
}

export interface Dataset {
  id: number
  name: string
  description: string | null
  owner: string
  schemaVersion: number
  createdAt: string
  updatedAt: string
}

export interface CreateDatasetInput {
  name: string
  description?: string
  owner: string
  schemaVersion: number
}

export interface Pipeline {
  id: number
  datasetId: number
  name: string
  description: string | null
  schedule: string | null
  active: boolean
  sourceType: PipelineSourceType | string
  kaggleDatasetRef: string | null
  kaggleCategory: string | null
  kaggleDataset: string | null
  currentVersionNumber: number
  latestRunStatus: RunStatus | null
  latestRunStartedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatePipelineInput {
  datasetId?: number
  name: string
  description?: string
  schedule?: string
  active: boolean
  sourceType: PipelineSourceType
  kaggleDatasetRef?: string
  kaggleCategory?: string
  kaggleDataset?: string
}

export interface UpdatePipelineInput {
  name?: string
  description?: string
  schedule?: string
  active?: boolean
  kaggleDataset?: string
}

export interface RunReportStat {
  count: number
  mean: number
  std: number
  min: number
  p25: number
  p50: number
  p75: number
  max: number
}

export interface RunReportTrendPoint {
  date: string
  value: number
  rolling7d: number
}

export interface RunReport {
  dataset: string
  file: string
  rowCount: number
  columns: string[]
  numericColumns: string[]
  stats: Record<string, RunReportStat>
  trend: RunReportTrendPoint[]
}

export interface Run {
  id: number
  pipelineId: number
  pipelineVersionNumber: number
  status: RunStatus
  startedAt: string | null
  finishedAt: string | null
  recordsProcessed: number
  errorMessage: string | null
  edaResult: EdaResult | null
  rqJobId: string | null
  report: RunReport | null
  runtimeSeconds: number | null
  createdAt: string
}

export interface RunStep {
  id: number
  runId: number
  stepOrder: number
  name: string
  status: RunStepStatus
  startedAt: string | null
  finishedAt: string | null
  message: string | null
  metrics: Record<string, unknown> | null
  errorMessage: string | null
  createdAt: string
}

export interface EdaResult {
  sourceType: string
  datasetRef?: string
  category?: string
  datasetUrl?: string
  fileCount: number
  files: EdaFileResult[]
}

export interface EdaFileResult {
  fileName: string
  rowCount: number
  columnCount: number
  columns: Array<{ name: string; dtype: string; missing: number }>
  missingValues: Record<string, number>
  duplicateRows: number
  numericSummary: Record<string, { mean: number | null; min: number | null; max: number | null; std: number | null }>
  categoricalSummary: Record<string, Record<string, number>>
  sampleRows: Array<Record<string, string | number | boolean | null>>
}

export interface UpdateRunInput {
  status: RunStatus
  errorMessage?: string
  recordsProcessed?: number
}

export interface AlertRule {
  id: number
  pipelineId: number
  name: string
  ruleType: AlertRuleType
  thresholdSeconds: number | null
  severity: AlertSeverity
  enabled: boolean
  createdAt: string
}

export interface CreateAlertRuleInput {
  pipelineId: number
  name: string
  ruleType: AlertRuleType
  thresholdSeconds?: number
  severity: AlertSeverity
  enabled: boolean
}

export interface AlertEvent {
  id: number
  ruleId: number
  runId: number
  pipelineId: number
  message: string
  severity: AlertSeverity
  status: AlertStatus
  createdAt: string
}

export interface UpdateAlertInput {
  status: AlertStatus
}

export interface KaggleDatasetResult {
  ref: string
  title: string
  ownerName: string
  totalBytes: number
  downloadCount: number
  lastUpdated: string | null
}
