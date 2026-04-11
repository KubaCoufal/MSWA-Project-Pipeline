$env:AUTH_MODE = "keycloak"
$env:VITE_AUTH_MODE = "keycloak"

Write-Host "Starting Pipeline Monitor in Keycloak mode..."
Write-Host "Frontend auth mode: $env:VITE_AUTH_MODE"
Write-Host "Backend auth mode:  $env:AUTH_MODE"

docker compose --profile keycloak up --build -d
