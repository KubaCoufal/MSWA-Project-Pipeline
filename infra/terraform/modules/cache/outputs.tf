output "connection_url" {
  value = "redis://${docker_container.redis.name}:6379/0"
}

output "container_name" {
  value = docker_container.redis.name
}
