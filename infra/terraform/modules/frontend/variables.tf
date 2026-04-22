variable "project_name" {
  type = string
}

variable "network_name" {
  type = string
}

variable "backend_url" {
  description = "Public URL of the backend API, embedded at frontend build time"
  type        = string
}

variable "host_port" {
  type = number
}

variable "repo_root" {
  description = "Absolute path to the repository root, used to locate the frontend build context"
  type        = string
}
