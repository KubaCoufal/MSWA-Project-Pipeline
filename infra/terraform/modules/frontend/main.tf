resource "docker_image" "frontend" {
  name         = "${var.project_name}-frontend:latest"
  keep_locally = true

  build {
    context    = "${var.repo_root}/frontend"
    dockerfile = "Dockerfile"
    build_arg = {
      VITE_API_BASE_URL       = var.backend_url
      VITE_AUTH_MODE          = "demo"
      VITE_KEYCLOAK_URL       = "http://localhost:8080"
      VITE_KEYCLOAK_REALM     = "pipeline-monitor"
      VITE_KEYCLOAK_CLIENT_ID = "pipeline-monitor-web"
    }
  }

  triggers = {
    dockerfile_hash = filesha1("${var.repo_root}/frontend/Dockerfile")
  }
}

resource "docker_container" "frontend" {
  name     = "${var.project_name}-frontend"
  image    = docker_image.frontend.image_id
  restart  = "unless-stopped"
  must_run = true

  networks_advanced {
    name = var.network_name
  }

  ports {
    internal = 80
    external = var.host_port
  }
}
