param([int]$Port = 4173)

$root = Split-Path -Parent $PSScriptRoot
$mime = @{
  ".html"="text/html"; ".css"="text/css"; ".js"="application/javascript";
  ".png"="image/png"; ".jpg"="image/jpeg"; ".gif"="image/gif"; ".svg"="image/svg+xml";
  ".mp3"="audio/mpeg"; ".wav"="audio/wav"; ".mp4"="video/mp4"; ".webm"="video/webm"; ".json"="application/json";
  ".ico"="image/x-icon"; ".woff"="font/woff"; ".woff2"="font/woff2"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/"

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()

    # Build-time helper: POST /__upload?name=<file> writes the request body
    # into assets\video\ (used by the in-browser video re-encoder).
    if ($ctx.Request.HttpMethod -eq 'POST' -and $ctx.Request.Url.AbsolutePath -eq '/__upload') {
      $name = $ctx.Request.QueryString['name']
      if ($name -and $name -match '^[A-Za-z0-9._-]+$') {
        $vidDir = Join-Path $root 'assets\video'
        New-Item -ItemType Directory -Force -Path $vidDir | Out-Null
        $ms = New-Object System.IO.MemoryStream
        $ctx.Request.InputStream.CopyTo($ms)
        [IO.File]::WriteAllBytes((Join-Path $vidDir $name), $ms.ToArray())
        $ms.Dispose()
        $bytes = [Text.Encoding]::UTF8.GetBytes("OK")
        $ctx.Response.StatusCode = 200
      } else {
        $bytes = [Text.Encoding]::UTF8.GetBytes("bad name")
        $ctx.Response.StatusCode = 400
      }
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $ctx.Response.OutputStream.Close()
      continue
    }

    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq "") { $rel = "index.html" }
    $path = Join-Path $root $rel
    $full = [IO.Path]::GetFullPath($path)
    if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) {
      $ctx.Response.StatusCode = 404
      $bytes = [Text.Encoding]::UTF8.GetBytes("404")
    } else {
      $ext = [IO.Path]::GetExtension($full).ToLower()
      $ct = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
      $ctx.Response.ContentType = $ct
      $bytes = [IO.File]::ReadAllBytes($full)
    }
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.OutputStream.Close()
  } catch { }
}
