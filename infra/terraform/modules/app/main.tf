# Both the backend API and the worker share the same Docker image.
# The command field overrides the Dockerfile CMD at runtime.
resource "docker_image" "backend" {
  name         = "${var.project_name}-backend:latest"
  keep_locally = true

  build {
    context    = "${var.repo_root}/backend"
    dockerfile = "Dockerfile"
  }

  # Changing this hash (when the Dockerfile is edited) forces Terraform
  # to rebuild the image. For broader source-change detection, hash all
  # files with: sha1(join("", [for f in fileset(...) : filesha1(...)]))
  triggers = {
    dockerfile_hash = filesha1("${var.repo_root}/backend/Dockerfile")
  }
}

resource "docker_container" "backend" {
  name     = "${var.project_name}-backend"
  image    = docker_image.backend.image_id
  restart  = "unless-stopped"
  must_run = true

  command = [
    "sh", "-c",
    "python -m alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000",
  ]

  env = [
    "DATABASE_URL=${var.database_url}",
    "REDIS_URL=${var.redis_url}",
    "SIMULATION_RUNTIME_SECONDS=2",
    "DEFAULT_RECORDS_PROCESSED=1200",
    "AUTH_MODE=demo",
  ]

  networks_advanced {
    name = var.network_name
  }

  ports {
    internal = 8000
    external = var.backend_port
  }
}

resource "docker_container" "worker" {
  name     = "${var.project_name}-worker"
  image    = docker_image.backend.image_id
  restart  = "unless-stopped"
  must_run = true

  command = ["python", "-m", "app.workers.worker"]

  env = [
    "DATABASE_URL=${var.database_url}",
    "REDIS_URL=${var.redis_url}",
    "SIMULATION_RUNTIME_SECONDS=2",
    "DEFAULT_RECORDS_PROCESSED=1200",
  ]

  networks_advanced {
    name = var.network_name
  }

  depends_on = [docker_container.backend]
}
