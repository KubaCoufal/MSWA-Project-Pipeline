output "backend_container_name" {
  value = docker_container.backend.name
}

output "worker_container_name" {
  value = docker_container.worker.name
}
