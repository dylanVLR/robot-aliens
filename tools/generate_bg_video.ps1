# ============================================================================
# generate_bg_video.ps1 — optional Runway image-to-video motion background
# Requires assets\images\background.png. Writes assets\video\bg_loop.mp4.
# ANY failure (auth/credits/timeout) -> skip gracefully; the game works without it.
# ============================================================================
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root   = Split-Path -Parent $PSScriptRoot
$Bg     = Join-Path $Root 'assets\images\background.png'
$VidDir = Join-Path $Root 'assets\video'
$OutMp4 = Join-Path $VidDir 'bg_loop.mp4'

if (-not (Test-Path -LiteralPath $Bg)) { Write-Host 'RUNWAY|SKIPPED|background.png missing'; exit 0 }

$keys = @{}
foreach ($line in (Get-Content (Join-Path $Root '.env'))) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$') { $keys[$Matches[1]] = $Matches[2] }
}
$Rw = $keys['RUNWAYML_API_SECRET']
if (-not $Rw) { Write-Host 'RUNWAY|SKIPPED|no RUNWAYML_API_SECRET in .env'; exit 0 }

New-Item -ItemType Directory -Force -Path $VidDir | Out-Null

$hdr = @{ 'Authorization' = ('Bearer ' + $Rw); 'X-Runway-Version' = '2024-11-06' }
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($Bg))
$bodyObj = @{
  model       = 'gen4_turbo'
  promptImage = ('data:image/png;base64,' + $b64)
  promptText  = 'slow drifting storm clouds, subtle lightning flickers, gentle ambient motion, cinematic, static camera'
  ratio       = '1280:720'
  duration    = 5
}
$body = [Text.Encoding]::UTF8.GetBytes(($bodyObj | ConvertTo-Json -Compress))

function Get-ErrText {
  param($ErrRecord)
  $status = 0; $b = ''
  $ex = $ErrRecord.Exception
  if ($ex -is [System.Net.WebException] -and $ex.Response) {
    try { $status = [int]$ex.Response.StatusCode } catch {}
    try {
      $reader = New-Object System.IO.StreamReader($ex.Response.GetResponseStream())
      $b = $reader.ReadToEnd()
    } catch {}
  }
  if ($b.Length -gt 300) { $b = $b.Substring(0, 300) }
  return ('HTTP ' + $status + ' ' + $b + ' ' + $ex.Message).Trim()
}

# create task (max 2 tries; hard auth/credit errors do not retry)
$taskId = $null
for ($i = 1; ($i -le 2) -and (-not $taskId); $i++) {
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Method Post `
      -Uri 'https://api.dev.runwayml.com/v1/image_to_video' `
      -Headers $hdr -ContentType 'application/json' -Body $body -TimeoutSec 180
    $taskId = ($resp.Content | ConvertFrom-Json).id
  }
  catch {
    $e = Get-ErrText $_
    Write-Host ('create attempt ' + $i + ' failed: ' + $e)
    if ($e -match 'HTTP 401|HTTP 403|credit|insufficient') { break }
  }
}
if (-not $taskId) { Write-Host 'RUNWAY|SKIPPED|task creation failed'; exit 0 }
Write-Host ('task created: ' + $taskId)

# poll every 10 s, up to 6 minutes
$deadline  = (Get-Date).AddMinutes(6)
$status    = ''
$outputUrl = $null
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 10
  try {
    $t = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 `
          -Uri ('https://api.dev.runwayml.com/v1/tasks/' + $taskId) -Headers $hdr).Content | ConvertFrom-Json
    $status = $t.status
    Write-Host ('poll: ' + $status)
    if ($status -eq 'SUCCEEDED') { $outputUrl = $t.output[0]; break }
    if ($status -eq 'FAILED' -or $status -eq 'CANCELLED') {
      Write-Host ('failure detail: ' + $t.failure)
      break
    }
  }
  catch { Write-Host ('poll error: ' + $_.Exception.Message) }
}

if (-not $outputUrl) { Write-Host ('RUNWAY|SKIPPED|final status=' + $status); exit 0 }

try {
  Invoke-WebRequest -UseBasicParsing -Uri $outputUrl -OutFile $OutMp4 -TimeoutSec 300
  if ((Test-Path -LiteralPath $OutMp4) -and ((Get-Item -LiteralPath $OutMp4).Length -gt 102400)) {
    Write-Host ('RUNWAY|OK|' + (Get-Item -LiteralPath $OutMp4).Length)
  } else {
    if (Test-Path -LiteralPath $OutMp4) { Remove-Item -LiteralPath $OutMp4 -Force -Confirm:$false }
    Write-Host 'RUNWAY|FAIL|downloaded file too small'
  }
}
catch { Write-Host ('RUNWAY|FAIL|download error: ' + $_.Exception.Message) }
