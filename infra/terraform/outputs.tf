output "frontend_url" {
  description = "URL of the frontend application"
  value       = "http://localhost:${var.frontend_port}"
}

output "backend_url" {
  description = "URL of the backend API"
  value       = "http://localhost:${var.backend_port}"
}

output "api_docs_url" {
  description = "URL of the FastAPI interactive docs"
  value       = "http://localhost:${var.backend_port}/docs"
}
