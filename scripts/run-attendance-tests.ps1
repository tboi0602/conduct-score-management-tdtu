param(
  [ValidateRange(1, 5000)]
  [int]$StudentCount = 1000,
  [string]$ApiBaseUrl = "http://localhost"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$server = Join-Path $root "server"
$artifactDir = Join-Path $server "tests\.artifacts"
$dockerEnvFile = Join-Path $root ".env.docker"

function Read-EnvFile([string]$Path) {
  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^([A-Z][A-Z0-9_]*)=(.*)$') {
      $values[$matches[1]] = $matches[2]
    }
  }
  return $values
}

function Invoke-Checked([string]$Label, [scriptblock]$Action) {
  Write-Host "`n=== $Label ===" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

function New-Fixture {
  Invoke-Checked "Prepare $StudentCount attendance students" {
    & npm.cmd run test:attendance:prepare
  }
}

function Verify-Scenario([string]$Name) {
  Invoke-Checked "Verify $Name" {
    & npm.cmd run test:attendance:verify
  }
  Copy-Item -LiteralPath (Join-Path $artifactDir "attendance-verification.json") `
    -Destination (Join-Path $artifactDir "$Name-verification.json") -Force
}

function Assert-Infrastructure {
  try {
    $health = Invoke-RestMethod -Uri "$ApiBaseUrl/health" -TimeoutSec 10
    if (-not $health.ok) { throw "API health endpoint returned ok=false" }
  } catch {
    throw "Attendance infrastructure is not ready at $ApiBaseUrl/health. $($_.Exception.Message)"
  }
}

if (-not (Test-Path -LiteralPath $dockerEnvFile)) {
  throw "Missing $dockerEnvFile. Copy .env.example to .env.docker and configure it first."
}

$config = Read-EnvFile $dockerEnvFile
if (-not $config.ContainsKey("PROMETHEUS_PORT") -or -not $config.PROMETHEUS_PORT) {
  $config.PROMETHEUS_PORT = "9090"
}
$required = @(
  "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "POSTGRES_PORT",
  "REDIS_PASSWORD", "REDIS_PORT", "RABBITMQ_USER", "RABBITMQ_PASSWORD",
  "RABBITMQ_PORT", "JWT_SECRET", "ATTENDANCE_QR_SECRET"
)
$missing = @($required | Where-Object { -not $config.ContainsKey($_) -or -not $config[$_] })
if ($missing.Count -gt 0) {
  throw "Missing required values in .env.docker: $($missing -join ', ')"
}

$k6 = Get-ChildItem (Join-Path $root ".tools\k6") -Filter "k6.exe" -Recurse `
  -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if (-not $k6) {
  throw "k6 portable was not found under .tools\k6."
}

Assert-Infrastructure

New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
Get-ChildItem -LiteralPath $artifactDir -Force -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force
$env:DATABASE_URL = "postgresql://$($config.POSTGRES_USER):$($config.POSTGRES_PASSWORD)@127.0.0.1:$($config.POSTGRES_PORT)/$($config.POSTGRES_DB)?schema=public"
$env:REDIS_URL = "redis://:$($config.REDIS_PASSWORD)@127.0.0.1:$($config.REDIS_PORT)"
$env:RABBITMQ_URL = "amqp://$($config.RABBITMQ_USER):$($config.RABBITMQ_PASSWORD)@127.0.0.1:$($config.RABBITMQ_PORT)/"
$env:JWT_SECRET = $config.JWT_SECRET
$env:ATTENDANCE_QR_SECRET = $config.ATTENDANCE_QR_SECRET
$env:ATTENDANCE_TEST_STUDENTS = [string]$StudentCount
$env:STUDENT_COUNT = [string]$StudentCount
$env:EXPECTED_ATTENDANCE_RECORDS = [string]$StudentCount
$env:API_BASE_URL = $ApiBaseUrl
$env:ATTENDANCE_TEST_RUN_ID = Get-Date -Format "yyyyMMdd-HHmmss"

Push-Location $server
$runError = $null
$reportError = $null
try {
  Remove-Item Env:RUN_ATTENDANCE_INTEGRATION -ErrorAction SilentlyContinue
  Invoke-Checked "Attendance unit tests and JUnit" {
    & npm.cmd run test:attendance:junit
  }

  New-Fixture
  $env:RUN_ATTENDANCE_INTEGRATION = "true"
  Invoke-Checked "Live attendance integration tests" {
    & npm.cmd run test:attendance:integration
  }
  Remove-Item Env:RUN_ATTENDANCE_INTEGRATION -ErrorAction SilentlyContinue

  New-Fixture
  $env:K6_SUMMARY_PATH = (Join-Path $artifactDir "qr-1000-k6-summary.json").Replace("\", "/")
  $env:RAMP_UP_SECONDS = "60"
  Assert-Infrastructure
  Invoke-Checked "k6 QR load test ($StudentCount students)" {
    & $k6 run (Join-Path $server "tests\attendance\load\qr-1000.js")
  }
  Verify-Scenario "qr-1000"

  New-Fixture
  $env:SCANNER_COUNT = "2"
  $env:K6_SUMMARY_PATH = (Join-Path $artifactDir "barcode-2-scanners-summary.json").Replace("\", "/")
  Assert-Infrastructure
  Invoke-Checked "k6 barcode load test (2 scanners)" {
    & $k6 run (Join-Path $server "tests\attendance\load\barcode-parallel.js")
  }
  Verify-Scenario "barcode-2-scanners"

  New-Fixture
  $env:SCANNER_COUNT = "3"
  $env:K6_SUMMARY_PATH = (Join-Path $artifactDir "barcode-3-scanners-summary.json").Replace("\", "/")
  Assert-Infrastructure
  Invoke-Checked "k6 barcode load test (3 scanners)" {
    & $k6 run (Join-Path $server "tests\attendance\load\barcode-parallel.js")
  }
  Verify-Scenario "barcode-3-scanners"

  try {
    Invoke-WebRequest -Uri "http://localhost:$($config.PROMETHEUS_PORT)/api/v1/query?query=up" `
      -UseBasicParsing -TimeoutSec 10 -OutFile (Join-Path $artifactDir "prometheus-metrics.json")
  } catch {
    Write-Warning "Prometheus snapshot was not captured: $($_.Exception.Message)"
  }

} catch {
  $runError = $_
} finally {
  try {
    Invoke-Checked "Generate attendance DOCX report" {
      & npm.cmd run test:attendance:artifacts
    }
  } catch {
    $reportError = $_
  }
  Pop-Location
}

$reportPath = Join-Path $root "Docs\testing-results\$env:ATTENDANCE_TEST_RUN_ID\ATTENDANCE_TEST_REPORT.docx"
if ($reportError) {
  throw "Could not generate attendance DOCX report. Intermediate artifacts were preserved. $($reportError.Exception.Message)"
}
if ($runError) {
  Write-Host "`nAttendance test suite failed. Review the DOCX report." -ForegroundColor Red
  Write-Host "Report: $reportPath"
  throw $runError
}
Write-Host "`nAttendance test suite completed successfully." -ForegroundColor Green
Write-Host "Report: $reportPath"
