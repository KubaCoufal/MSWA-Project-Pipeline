variable "project_name" {
  type = string
}

variable "network_name" {
  type = string
}

variable "database_url" {
  type      = string
  sensitive = true
}

variable "redis_url" {
  type = string
}

variable "backend_port" {
  type = number
}

variable "repo_root" {
  description = "Absolute path to the repository root, used to locate the backend build context"
  type        = string
}
