# ============================================================================
# generate_images.ps1 — Skybound Protocol build-time image generation
# Reads API keys from ..\.env (NEVER printed). Writes PNGs to ..\assets\images\
#
# Provider chain (auto mode): OpenAI gpt-image-1 -> dall-e-3 (on 403/verify)
#   -> Gemini (on billing/auth/model-retired). Budget: max 2 API calls/image.
# Verified 2026-07-11: OpenAI account has hit its billing hard limit and
#   dall-e-3 is retired from the API, so run with -Provider gemini.
# Gemini cannot emit transparency -> solid #0b1020 navy background instead.
# Gemini may emit JPEG -> converted to real PNG locally via System.Drawing.
# ============================================================================
param(
  [string]$Only = '',        # optional comma-separated filenames to (re)generate
  [ValidateSet('auto','openai','gemini')]
  [string]$Provider = 'auto'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName System.Drawing

$Root   = Split-Path -Parent $PSScriptRoot
$ImgDir = Join-Path $Root 'assets\images'
New-Item -ItemType Directory -Force -Path $ImgDir | Out-Null

# ---- read keys from .env (values are secrets: never echo them) -------------
$keys = @{}
foreach ($line in (Get-Content (Join-Path $Root '.env'))) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$') {
    $keys[$Matches[1]] = $Matches[2]
  }
}
$script:OpenAIKey = $keys['OPENAI_API_KEY']
$script:GoogleKey = $keys['GOOGLE_API_KEY']

# ---- manifest ---------------------------------------------------------------
$Style = 'glossy comic-book mecha style, bold ink linework, dramatic rim lighting, dark storm-sky palette accents, centered emblem composition, high detail, no text, no watermark, original robot design'
$StyleWild = $Style.Replace('no text,', 'no other text,')
$Guard = 'completely original design, not based on any existing franchise, no trademarks or existing logos'

# Character cast (display names): AETHERON (symbol_aerion.png), PYRAXIS (symbol_voltrix.png),
# SERAPHEX (symbol_nimbus.png), DUSKRAZOR (symbol_razorwing.png). Filenames/ids unchanged.
$Manifest = @(
  @{ f='symbol_aerion.png';    s='1024x1024'; t=$true;  p=('Dynamic full-body action pose of an original heroic transforming robot sky-sentinel diving forward through storm clouds, three-quarter view, one fist thrust toward the viewer, back thrusters blazing cyan, azure blue and brushed-silver armor, glowing cyan eyes, jet-intake shoulders, dramatic foreshortening, whole figure large and centered filling the frame, ' + $Style + ', ' + $Guard) },
  @{ f='symbol_voltrix.png';   s='1024x1024'; t=$true;  p=('Dynamic full-body action pose of an original rugged transforming robot storm-charger mid-lunge, three-quarter view, crackling lightning arcing between raised fists, turbine chest glowing hot, crimson and burnt-orange armor, crackling amber eyes, dust and sparks, whole figure large and centered filling the frame, ' + $Style + ', ' + $Guard) },
  @{ f='symbol_nimbus.png';    s='1024x1024'; t=$true;  p=('Dynamic full-body action pose of an original noble transforming robot cloud-carrier soaring upward, seen from a heroic low angle, massive golden mechanical wings spread wide, arms outstretched, ivory-white and gold armor, warm golden eyes, sunbeams breaking through clouds, whole figure large and centered filling the frame, ' + $Style + ', ' + $Guard) },
  @{ f='symbol_razorwing.png'; s='1024x1024'; t=$true;  p=('Dynamic full-body action pose of an original sinister villain transforming robot interceptor in a swooping attack dive, three-quarter view, blade-like wings flared, clawed hand slashing forward, violet and gunmetal-black angular armor, piercing red eyes, menacing energy trails, whole figure large and centered filling the frame, ' + $Style + ', ' + $Guard) },
  @{ f='symbol_crystal.png';   s='1024x1024'; t=$true;  p=('A jagged glowing cyan energy crystal cluster radiating power, faceted, inner light, ' + $Style + ', ' + $Guard) },
  @{ f='symbol_gear.png';      s='1024x1024'; t=$true;  p=('A heavy golden mechanical gear cog with worn metal teeth, subtle energy glow in the hub, ' + $Style + ', ' + $Guard) },
  @{ f='symbol_wings.png';     s='1024x1024'; t=$true;  p=('A silver mechanical winged emblem, twin swept metal wings around a small turbine core, ' + $Style + ', ' + $Guard) },
  @{ f='symbol_thruster.png';  s='1024x1024'; t=$true;  p=('A single jet thruster engine nozzle with blue afterburner flame, angled dynamically, ' + $Style + ', ' + $Guard) },
  @{ f='symbol_wild.png';      s='1024x1024'; t=$true;  p=('A glowing cube artifact mid-transformation, panels unfolding, radiant teal energy seams, the word WILD engraved in bold metallic letters on its face, ' + $StyleWild + ', ' + $Guard) },
  @{ f='symbol_scatter.png';   s='1024x1024'; t=$true;  p=('A swirling storm vortex portal ringed with lightning, deep purple and electric blue, ' + $Style + ', ' + $Guard) },
  @{ f='background.png';       s='1536x1024'; t=$false; p=('Vast floating sky citadel above roiling storm clouds at dusk, distant lightning, epic comic splash-page style, deep indigo and teal palette with orange dusk highlights, painterly, no characters, no text, ' + $Guard) },
  @{ f='logo.png';             s='1536x1024'; t=$true;  p=('Metallic chrome game-logo lettering reading "SKYBOUND PROTOCOL" in bold angular sci-fi typeface with lightning accents and subtle blue glow, comic-book style, on transparent background, nothing else, ' + $Guard) }
)

# ---- HTTP helper (HttpClient: reliable status + error bodies in PS 5.1) ----
$script:Http = New-Object System.Net.Http.HttpClient
$script:Http.Timeout = [TimeSpan]::FromSeconds(420)

function Invoke-JsonPost {
  param([string]$Uri, [hashtable]$Headers, [string]$Json)
  $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, $Uri)
  foreach ($h in $Headers.Keys) { [void]$req.Headers.TryAddWithoutValidation($h, $Headers[$h]) }
  $req.Content = New-Object System.Net.Http.StringContent($Json, [Text.Encoding]::UTF8, 'application/json')
  try {
    $resp = $script:Http.SendAsync($req).GetAwaiter().GetResult()
    $body = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    return @{ Status = [int]$resp.StatusCode; Body = $body }
  }
  catch {
    return @{ Status = 0; Body = ('transport error: ' + $_.Exception.Message) }
  }
  finally { $req.Dispose() }
}

function ConvertTo-PngBytes {
  # Gemini sometimes returns JPEG; the game + validation require real PNG.
  param([byte[]]$Bytes)
  if ($Bytes.Length -ge 4 -and $Bytes[0] -eq 0x89 -and $Bytes[1] -eq 0x50 -and $Bytes[2] -eq 0x4E -and $Bytes[3] -eq 0x47) {
    return $Bytes
  }
  $ms  = New-Object System.IO.MemoryStream(,$Bytes)
  $img = [System.Drawing.Image]::FromStream($ms)
  $out = New-Object System.IO.MemoryStream
  $img.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $img.Dispose(); $ms.Dispose()
  $res = $out.ToArray(); $out.Dispose()
  return $res
}

function Test-Png {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  $fi = Get-Item -LiteralPath $Path
  if ($fi.Length -le 20480) { return $false }
  $fs = [IO.File]::OpenRead($Path)
  try { $b = New-Object byte[] 4; [void]$fs.Read($b, 0, 4) } finally { $fs.Close() }
  return ($b[0] -eq 0x89 -and $b[1] -eq 0x50 -and $b[2] -eq 0x4E -and $b[3] -eq 0x47)
}

function Add-NavyBackground {
  param([string]$Prompt)
  if ($Prompt -match 'on transparent background') {
    return ($Prompt -replace 'on transparent background', 'on a solid very dark navy (#0b1020) background')
  }
  return ($Prompt + ', on a solid very dark navy (#0b1020) background')
}

# ---- OpenAI -----------------------------------------------------------------
function Invoke-OpenAIImage {
  # returns @{ Ok; B64; Status; Err }
  param([string]$Model, [string]$Prompt, [string]$Size, [bool]$Transparent)
  $p = $Prompt
  $body = @{ model = $Model; n = 1 }
  if ($Model -eq 'gpt-image-1') {
    $body.size    = $Size
    $body.quality = 'medium'
    if ($Transparent) { $body.background = 'transparent' }
  }
  else {
    if ($Size -eq '1536x1024') { $body.size = '1792x1024' } else { $body.size = '1024x1024' }
    if ($Transparent) { $p = Add-NavyBackground $p }
  }
  $body.prompt = $p
  $r = Invoke-JsonPost -Uri 'https://api.openai.com/v1/images/generations' `
        -Headers @{ 'Authorization' = ('Bearer ' + $script:OpenAIKey) } `
        -Json ($body | ConvertTo-Json -Compress)
  if ($r.Status -eq 200) {
    $obj = $r.Body | ConvertFrom-Json
    if ($obj.data[0].b64_json) { return @{ Ok = $true; B64 = $obj.data[0].b64_json } }
    return @{ Ok = $false; Status = 200; Err = 'no b64_json in response (url-only?)' }
  }
  $snip = $r.Body; if ($snip.Length -gt 300) { $snip = $snip.Substring(0, 300) }
  return @{ Ok = $false; Status = $r.Status; Err = ('HTTP ' + $r.Status + ' ' + $snip) }
}

# ---- Gemini -----------------------------------------------------------------
function Invoke-GeminiImage {
  # returns @{ Ok; B64; Status; Err }
  param([string]$Model, [string]$Prompt, [string]$Size, [bool]$Transparent, [bool]$UseImageConfig)
  $p = $Prompt
  if ($Transparent) { $p = Add-NavyBackground $p }
  $gen = @{ responseModalities = @('TEXT', 'IMAGE') }
  if ($UseImageConfig) {
    $ar = '1:1'; if ($Size -eq '1536x1024') { $ar = '3:2' }
    $gen.imageConfig = @{ aspectRatio = $ar }
  }
  elseif ($Size -eq '1536x1024') {
    $p = $p + ', wide landscape 3:2 composition'
  }
  $bodyObj = @{ contents = @(@{ parts = @(@{ text = $p }) }); generationConfig = $gen }
  $uri = 'https://generativelanguage.googleapis.com/v1beta/models/' + $Model + ':generateContent'
  $r = Invoke-JsonPost -Uri $uri -Headers @{ 'x-goog-api-key' = $script:GoogleKey } `
        -Json ($bodyObj | ConvertTo-Json -Depth 10 -Compress)
  if ($r.Status -eq 200) {
    $obj = $r.Body | ConvertFrom-Json
    foreach ($part in $obj.candidates[0].content.parts) {
      if ($part.inlineData -and $part.inlineData.data) { return @{ Ok = $true; B64 = $part.inlineData.data } }
    }
    return @{ Ok = $false; Status = 200; Err = '200 but no inlineData image part' }
  }
  $snip = $r.Body; if ($snip.Length -gt 300) { $snip = $snip.Substring(0, 300) }
  return @{ Ok = $false; Status = $r.Status; Err = ('HTTP ' + $r.Status + ' ' + $snip) }
}

# ---- main loop ---------------------------------------------------------------
$script:OpenAIModel  = 'gpt-image-1'
$script:ActiveProv   = $Provider
if ($script:ActiveProv -eq 'auto') { $script:ActiveProv = 'openai' }
$GeminiPrimary  = 'gemini-3.1-flash-image'   # verified accessible; may return JPEG (converted)
$GeminiFallback = 'gemini-2.5-flash-image'   # verified accessible; returns PNG

if ($script:ActiveProv -eq 'openai' -and -not $script:OpenAIKey) { $script:ActiveProv = 'gemini' }
if ($script:ActiveProv -eq 'gemini' -and -not $script:GoogleKey) { Write-Host 'FATAL: no usable API key in .env'; exit 1 }

$results = @()

foreach ($item in $Manifest) {
  if ($Only -and (($Only -split ',') -notcontains $item.f)) { continue }
  $out = Join-Path $ImgDir $item.f

  if (Test-Png $out) {
    $sz = (Get-Item -LiteralPath $out).Length
    Write-Host ('RESULT|' + $item.f + '|OK|' + $sz + '|existing|already valid, skipped')
    $results += New-Object PSObject -Property @{ file=$item.f; ok=$true; bytes=$sz; source='existing'; note='already valid, skipped' }
    continue
  }

  $ok = $false; $src = ''; $note = ''
  for ($attempt = 1; ($attempt -le 2) -and (-not $ok); $attempt++) {
    $r = $null
    if ($script:ActiveProv -eq 'openai') {
      $src = $script:OpenAIModel
      Write-Host ('[' + $item.f + '] attempt ' + $attempt + ' via ' + $src + ' ...')
      $r = Invoke-OpenAIImage -Model $script:OpenAIModel -Prompt $item.p -Size $item.s -Transparent $item.t
      if (-not $r.Ok) {
        $lower = ('' + $r.Err).ToLower()
        if ($script:OpenAIModel -eq 'gpt-image-1' -and
            ($r.Status -eq 403 -or $lower -match 'verif|must be verified|does not have access')) {
          Write-Host 'NOTE: switching OpenAI model to dall-e-3.'
          $script:OpenAIModel = 'dall-e-3'
        }
        elseif ($r.Status -eq 401 -or $lower -match 'billing_hard_limit|billing hard limit|invalid_api_key|incorrect api key|insufficient_quota|does not exist') {
          Write-Host 'NOTE: OpenAI unusable, switching provider to Gemini.'
          $script:ActiveProv = 'gemini'
        }
      }
    }
    else {
      # attempt 1: newest flash-image model with aspectRatio config
      # attempt 2: proven-plain gemini-2.5-flash-image call (no imageConfig)
      $model = $GeminiPrimary;  $useCfg = $true
      if ($attempt -eq 2) { $model = $GeminiFallback; $useCfg = $false }
      $src = $model
      Write-Host ('[' + $item.f + '] attempt ' + $attempt + ' via ' + $src + ' ...')
      $r = Invoke-GeminiImage -Model $model -Prompt $item.p -Size $item.s -Transparent $item.t -UseImageConfig $useCfg
      if ((-not $r.Ok) -and $r.Status -eq 429 -and $attempt -eq 1) {
        Write-Host 'NOTE: 429 rate limit, pausing 25 s before retry.'
        Start-Sleep -Seconds 25
      }
    }

    if ($r.Ok) {
      try {
        $bytes = ConvertTo-PngBytes ([Convert]::FromBase64String($r.B64))
        [IO.File]::WriteAllBytes($out, $bytes)
        if (Test-Png $out) { $ok = $true; $note = '' }
        else { $note = 'validation failed (PNG magic / size <= 20KB)'; Write-Host ('[' + $item.f + '] ' + $note) }
      }
      catch {
        $note = ('decode/convert failed: ' + $_.Exception.Message)
        Write-Host ('[' + $item.f + '] ' + $note)
      }
    }
    else {
      $note = $r.Err
      Write-Host ('[' + $item.f + '] attempt ' + $attempt + ' failed: ' + $note)
    }
  }

  $size = 0
  if ($ok) {
    $size = (Get-Item -LiteralPath $out).Length
  }
  elseif (Test-Path -LiteralPath $out) {
    Remove-Item -LiteralPath $out -Force -Confirm:$false   # never leave a corrupt file
  }
  $flag = 'FAIL'; if ($ok) { $flag = 'OK' }
  Write-Host ('RESULT|' + $item.f + '|' + $flag + '|' + $size + '|' + $src + '|' + $note)
  $results += New-Object PSObject -Property @{ file=$item.f; ok=$ok; bytes=$size; source=$src; note=$note }

  Start-Sleep -Seconds 2   # gentle pacing for rate limits
}

$results | ConvertTo-Json | Out-File -FilePath (Join-Path $Root 'tools\image_build_status.json') -Encoding utf8
Write-Host 'DONE'
