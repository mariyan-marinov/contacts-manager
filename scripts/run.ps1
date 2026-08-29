#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Starts PostgreSQL (Docker), the API and the Angular dev server, all at once.

.DESCRIPTION
    Brings up the `db` service from compose.yml, waits for its health check, starts
    the API on http://localhost:5272, waits for it to listen, then starts the
    Angular dev server on http://localhost:4200. Output from both processes is
    interleaved in this console. Ctrl+C stops the API and the dev server; the
    database container is left running unless -StopDb is given.

.PARAMETER Environment
    ASPNETCORE_ENVIRONMENT for the API. 'Development' (default) or 'Test'.
    'Test' additionally exposes POST /api/test/reset, which the e2e suite uses.

.PARAMETER NoBrowser
    Do not open the app in the default browser once everything is up.

.PARAMETER SkipInstall
    Do not run `npm ci` even when web/node_modules is missing.

.PARAMETER StopDb
    Stop the Postgres container on exit as well. The volume is kept either way.

.EXAMPLE
    ./scripts/run.ps1

.EXAMPLE
    ./scripts/run.ps1 -Environment Test -StopDb
#>
[CmdletBinding()]
param(
  [ValidateSet('Development', 'Test')]
  [string]$Environment = 'Development',
  [switch]$NoBrowser,
  [switch]$SkipInstall,
  [switch]$StopDb
)

# ASCII only, deliberately: Windows PowerShell reads a BOM-less file as ANSI, and
# some UTF-8 bytes decode there to curly quotes, which it treats as string delimiters.

$ErrorActionPreference = 'Stop'

$root    = Split-Path -Parent $PSScriptRoot
$webDir  = Join-Path $root 'web'
$apiProj = Join-Path $root 'src/ContactsManager.Api'
$apiUrl  = 'http://localhost:5272'
$webUrl  = 'http://localhost:4200'
$apiPort = 5272
$webPort = 4200
$dbName  = 'contacts-db'
$isWin   = ($env:OS -eq 'Windows_NT')
$npm     = if ($isWin) { 'npm.cmd' } else { 'npm' }

function Write-Step([string]$message) {
  Write-Host ''
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Write-Note([string]$message) {
  Write-Host "    $message" -ForegroundColor DarkGray
}

function Assert-Tool([string]$name, [string]$hint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name was not found on PATH. $hint"
  }
}

function Test-Listening([int]$port) {
  # Enumerate listeners rather than dial one: the Angular dev server binds the IPv6
  # loopback only, and a TcpClient aimed at 'localhost' resolves to 127.0.0.1 and
  # is refused. This sees a listener on any interface, in either address family.
  $listeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
  foreach ($listener in $listeners) {
    if ($listener.Port -eq $port) { return $true }
  }
  return $false
}

function Assert-PortFree([int]$port, [string]$what) {
  if (-not (Test-Listening $port)) { return }
  $owner = ''
  if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    $connection = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($connection) {
      $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
      if ($process) { $owner = " It is held by $($process.ProcessName) (pid $($process.Id))." }
    }
  }
  throw "Port $port is already in use, so $what cannot start.$owner Stop it and run this again."
}

function Open-Browser([string]$url) {
  try {
    if ($isWin) {
      Start-Process $url | Out-Null
    } elseif (Get-Command 'open' -ErrorAction SilentlyContinue) {
      & open $url
    } elseif (Get-Command 'xdg-open' -ErrorAction SilentlyContinue) {
      & xdg-open $url
    } else {
      Write-Note "open $url to see the app"
      return
    }
    Write-Note "opened $url in the default browser"
  } catch {
    # A missing or unwilling browser is no reason to take the whole stack down.
    Write-Note "could not open a browser: $($_.Exception.Message)"
  }
}

function Wait-Until([string]$what, [scriptblock]$probe, [int]$timeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (& $probe) { return }
    Start-Sleep -Milliseconds 500
  }
  throw "Timed out after $timeoutSeconds seconds waiting for $what."
}

function Stop-Tree($process, [string]$label) {
  if ($null -eq $process -or $process.HasExited) { return }
  Write-Note "stopping $label (pid $($process.Id))"
  if ($isWin) {
    # `dotnet run` and `npm` each spawn the real process as a child, so kill the tree.
    & taskkill /T /F /PID $process.Id | Out-Null
  } else {
    try { $process.Kill($true) } catch { }
  }
}

$api = $null
$web = $null
$dbStarted = $false

try {
  Assert-Tool 'docker' 'Install Docker Desktop and make sure the engine is running.'
  Assert-Tool 'dotnet' 'Install the .NET SDK 10.0.303 or a later 10.0 feature band.'
  Assert-Tool $npm 'Install Node.js 24.'

  # A port that is already taken would otherwise look like a successful start,
  # because the readiness probe cannot tell our process from someone else's.
  Assert-PortFree $apiPort 'the API'
  Assert-PortFree $webPort 'the dev server'

  # --- .env -----------------------------------------------------------------
  $envFile = Join-Path $root '.env'
  if (-not (Test-Path $envFile)) {
    Write-Step 'Creating .env from .env.example'
    Copy-Item (Join-Path $root '.env.example') $envFile
  }

  # --- database -------------------------------------------------------------
  Write-Step 'Starting PostgreSQL'
  Push-Location $root
  try {
    & docker compose up -d db
    if ($LASTEXITCODE -ne 0) { throw 'docker compose up -d db failed. Is the Docker engine running?' }
    $dbStarted = $true
  } finally {
    Pop-Location
  }

  Write-Note 'waiting for the health check'
  Wait-Until 'PostgreSQL to become healthy' {
    $status = & docker inspect -f '{{.State.Health.Status}}' $dbName
    if ($LASTEXITCODE -ne 0) { return $false }
    return ($status -eq 'healthy')
  } 90
  Write-Note "$dbName is healthy"

  # --- frontend dependencies ------------------------------------------------
  if (-not $SkipInstall -and -not (Test-Path (Join-Path $webDir 'node_modules'))) {
    Write-Step 'Installing frontend dependencies (npm ci)'
    Push-Location $webDir
    try {
      & $npm ci
      if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
    } finally {
      Pop-Location
    }
  }

  # --- api ------------------------------------------------------------------
  Write-Step "Starting the API on $apiUrl ($Environment)"
  # --no-launch-profile so these win over launchSettings.json, which is fixed to Development.
  $env:ASPNETCORE_ENVIRONMENT = $Environment
  $env:ASPNETCORE_URLS = $apiUrl
  $api = Start-Process -FilePath 'dotnet' -PassThru -NoNewWindow -WorkingDirectory $root `
    -ArgumentList @('run', '--project', $apiProj, '--no-launch-profile')

  Wait-Until "the API to listen on $apiPort" {
    if ($api.HasExited) { throw "The API exited with code $($api.ExitCode) before it started listening." }
    return (Test-Listening $apiPort)
  } 180
  Write-Note "api is up - openapi at $apiUrl/openapi/v1.json"

  # --- frontend -------------------------------------------------------------
  Write-Step "Starting the Angular dev server on $webUrl"
  $web = Start-Process -FilePath $npm -PassThru -NoNewWindow -WorkingDirectory $webDir `
    -ArgumentList @('start')

  Wait-Until "the dev server to listen on $webPort" {
    if ($web.HasExited) { throw "The dev server exited with code $($web.ExitCode)." }
    return (Test-Listening $webPort)
  } 180

  Write-Step 'All three are running'
  Write-Host "    app       $webUrl"
  Write-Host "    api       $apiUrl"
  Write-Host "    swagger   $apiUrl/swagger"
  Write-Host "    scalar    $apiUrl/scalar"
  Write-Host "    database  $dbName (docker)"
  Write-Host ''

  if (-not $NoBrowser) {
    Open-Browser $webUrl
  }

  Write-Host '    Press Ctrl+C to stop.' -ForegroundColor Yellow

  # Read Ctrl+C as input rather than as a pipeline stop, so the cleanup below always runs.
  $trapsCtrlC = $false
  try {
    [Console]::TreatControlCAsInput = $true
    $trapsCtrlC = $true
  } catch { }

  while ($true) {
    if ($api.HasExited) { Write-Host ''; Write-Warning "The API exited with code $($api.ExitCode)."; break }
    if ($web.HasExited) { Write-Host ''; Write-Warning "The dev server exited with code $($web.ExitCode)."; break }
    if ($trapsCtrlC -and [Console]::KeyAvailable) {
      $key = [Console]::ReadKey($true)
      if (($key.Modifiers -band [System.ConsoleModifiers]::Control) -and $key.Key -eq 'C') {
        Write-Host ''
        break
      }
    }
    Start-Sleep -Milliseconds 250
  }
} finally {
  try { [Console]::TreatControlCAsInput = $false } catch { }

  # Nothing to unwind if we failed before anything was started.
  if ($api -or $web -or $dbStarted) {
    Write-Step 'Shutting down'
    Stop-Tree $web 'the dev server'
    Stop-Tree $api 'the API'

    if ($dbStarted -and $StopDb) {
      Write-Note 'stopping the database container'
      Push-Location $root
      try { & docker compose stop db | Out-Null } finally { Pop-Location }
    } elseif ($dbStarted) {
      Write-Note "$dbName is still running - 'docker compose stop db' to stop it"
    }
  }
}
