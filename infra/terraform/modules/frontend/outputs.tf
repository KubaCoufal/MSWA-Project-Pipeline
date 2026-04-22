output "frontend_url" {
  value = "http://localhost:${var.host_port}"
}

output "container_name" {
  value = docker_container.frontend.name
}
