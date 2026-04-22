resource "docker_image" "redis" {
  name = "redis:7-alpine"
}

resource "docker_container" "redis" {
  name     = "${var.project_name}-redis"
  image    = docker_image.redis.image_id
  restart  = "unless-stopped"
  must_run = true

  networks_advanced {
    name = var.network_name
  }

  ports {
    internal = 6379
    external = var.host_port
  }

  healthcheck {
    test     = ["CMD", "redis-cli", "ping"]
    interval = "5s"
    timeout  = "5s"
    retries  = 10
  }
}
