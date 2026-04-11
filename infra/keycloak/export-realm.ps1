param(
  [string]$Realm = "pipeline-monitor"
)

$ErrorActionPreference = "Stop"
$realmUrl = "http://localhost:8080/realms/$Realm/.well-known/openid-configuration"

Write-Host "Ensuring Keycloak realm '$Realm' is available before export..."
docker compose --profile keycloak up -d keycloak | Out-Host

for ($i = 0; $i -lt 24; $i++) {
  try {
    Invoke-WebRequest -Uri $realmUrl -UseBasicParsing | Out-Null
    break
  } catch {
    Start-Sleep -Seconds 5
  }
}

Write-Host "Stopping Keycloak before export..."
docker compose --profile keycloak stop keycloak | Out-Host

Write-Host "Exporting realm '$Realm' with users into infra/keycloak/ ..."
docker compose --profile keycloak run --rm --no-deps keycloak `
  export `
  --dir /opt/keycloak/data/import `
  --realm $Realm `
  --users realm_file | Out-Host

Write-Host "Starting Keycloak again..."
docker compose --profile keycloak up -d keycloak | Out-Host

Write-Host "Done. Updated file:"
Write-Host "  infra/keycloak/$Realm-realm.json"
