terraform {
  required_version = ">= 1.6"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

locals {
  # path.root is the directory containing this file (infra/terraform/).
  # Going up two levels reaches the repository root.
  repo_root = abspath("${path.root}/../..")
}

module "network" {
  source = "./modules/network"
  name   = var.project_name
}

module "database" {
  source            = "./modules/database"
  project_name      = var.project_name
  network_name      = module.network.name
  postgres_db       = var.postgres_db
  postgres_user     = var.postgres_user
  postgres_password = var.postgres_password
  host_port         = var.postgres_port
}

module "cache" {
  source       = "./modules/cache"
  project_name = var.project_name
  network_name = module.network.name
  host_port    = var.redis_port
}

module "app" {
  source       = "./modules/app"
  project_name = var.project_name
  network_name = module.network.name
  database_url = module.database.connection_url
  redis_url    = module.cache.connection_url
  backend_port = var.backend_port
  repo_root    = local.repo_root

  # Terraform creates resources in parallel by default.
  # depends_on forces the database and cache to be ready before the app starts.
  depends_on = [module.database, module.cache]
}

module "frontend" {
  source       = "./modules/frontend"
  project_name = var.project_name
  network_name = module.network.name
  backend_url  = "http://localhost:${var.backend_port}"
  host_port    = var.frontend_port
  repo_root    = local.repo_root

  depends_on = [module.app]
}
