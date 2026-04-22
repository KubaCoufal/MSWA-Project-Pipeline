output "connection_url" {
  description = "SQLAlchemy-compatible connection URL for the backend"
  value       = "postgresql+psycopg://${var.postgres_user}:${var.postgres_password}@${docker_container.postgres.name}:5432/${var.postgres_db}"
  sensitive   = true
}

output "container_name" {
  value = docker_container.postgres.name
}
