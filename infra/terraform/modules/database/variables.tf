variable "project_name" {
  type = string
}

variable "network_name" {
  type = string
}

variable "postgres_db" {
  type = string
}

variable "postgres_user" {
  type = string
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

variable "host_port" {
  type = number
}
