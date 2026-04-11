export type UserRole = 'admin' | 'operator' | 'viewer'
export type RunStatus = 'pending' | 'running' | 'success' | 'failed'
export type AlertRuleType = 'run_failed' | 'runtime_exceeded'
export type AlertSeverity = 'low' | 'medium' | 'high'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'

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
  currentVersionNumber: number
  latestRunStatus: RunStatus | null
  latestRunStartedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatePipelineInput {
  datasetId: number
  name: string
  description?: string
  schedule?: string
  active: boolean
}

export interface UpdatePipelineInput {
  name?: string
  description?: string
  schedule?: string
  active?: boolean
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
  runtimeSeconds: number | null
  createdAt: string
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
