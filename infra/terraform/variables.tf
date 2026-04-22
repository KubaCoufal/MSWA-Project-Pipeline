variable "project_name" {
  description = "Prefix applied to all Docker resource names"
  type        = string
  default     = "pipeline-monitor"
}

variable "postgres_db" {
  description = "PostgreSQL database name"
  type        = string
  default     = "pipeline_monitor"
}

variable "postgres_user" {
  description = "PostgreSQL user"
  type        = string
  default     = "pipeline"
}

variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
  default     = "pipeline"
}

variable "postgres_port" {
  description = "Host port exposed for PostgreSQL"
  type        = number
  default     = 5432
}

variable "redis_port" {
  description = "Host port exposed for Redis"
  type        = number
  default     = 6379
}

variable "backend_port" {
  description = "Host port exposed for the FastAPI backend"
  type        = number
  default     = 8000
}

variable "frontend_port" {
  description = "Host port exposed for the frontend"
  type        = number
  default     = 4173
}
