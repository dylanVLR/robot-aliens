# make_logo_transparent.ps1 — remove the solid navy background from logo.png
# (Gemini cannot emit alpha; OpenAI is billing-capped, so we key it out locally.)
# Flood-fills from the borders so dark pixels INSIDE the lettering are preserved,
# then feathers the edge so the glow fades out instead of clipping.
param(
  [string]$In  = '',
  [string]$Out = '',
  [int]$HardTol = 32,     # colour distance from bg treated as fully transparent
  [int]$FeatherTol = 120  # boundary pixels up to this distance get partial alpha
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
if (-not $In)  { $In  = Join-Path $Root 'assets\images\logo_navy.png' }
if (-not $Out) { $Out = Join-Path $Root 'assets\images\logo.png' }

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies 'System.Drawing' -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class LogoAlpha {
  public static string Process(string inPath, string outPath, int hardTol, int featherTol) {
    Bitmap src = new Bitmap(inPath);
    Bitmap bmp = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb);
    using (Graphics g = Graphics.FromImage(bmp)) { g.DrawImage(src, 0, 0, src.Width, src.Height); }
    src.Dispose();

    int w = bmp.Width, h = bmp.Height;
    BitmapData d = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int stride = d.Stride;
    byte[] px = new byte[stride * h];
    Marshal.Copy(d.Scan0, px, 0, px.Length);

    // background colour = average of all border pixels
    long sb = 0, sg = 0, sr = 0, n = 0;
    for (int x = 0; x < w; x++) {
      int t = x * 4, b = (h - 1) * stride + x * 4;
      sb += px[t] + px[b]; sg += px[t + 1] + px[b + 1]; sr += px[t + 2] + px[b + 2]; n += 2;
    }
    for (int y = 0; y < h; y++) {
      int l = y * stride, r = y * stride + (w - 1) * 4;
      sb += px[l] + px[r]; sg += px[l + 1] + px[r + 1]; sr += px[l + 2] + px[r + 2]; n += 2;
    }
    double bb = sb / (double)n, bg = sg / (double)n, br = sr / (double)n;

    long hard2 = (long)hardTol * hardTol;
    bool[] cleared = new bool[w * h];
    Queue<int> q = new Queue<int>();

    for (int x = 0; x < w; x++) { q.Enqueue(x); q.Enqueue((h - 1) * w + x); }
    for (int y = 0; y < h; y++) { q.Enqueue(y * w); q.Enqueue(y * w + (w - 1)); }

    long clearedCount = 0;
    while (q.Count > 0) {
      int idx = q.Dequeue();
      if (cleared[idx]) continue;
      int y = idx / w, x = idx % w;
      int i = y * stride + x * 4;
      double db = px[i] - bb, dg = px[i + 1] - bg, dr = px[i + 2] - br;
      double dist2 = db * db + dg * dg + dr * dr;
      if (dist2 > hard2) continue;
      cleared[idx] = true; clearedCount++;
      px[i + 3] = 0;
      if (x > 0) q.Enqueue(idx - 1);
      if (x < w - 1) q.Enqueue(idx + 1);
      if (y > 0) q.Enqueue(idx - w);
      if (y < h - 1) q.Enqueue(idx + w);
    }

    // feather: un-cleared pixels touching the cleared region fade by distance-from-bg
    long feathered = 0;
    double span = featherTol - hardTol; if (span < 1) span = 1;
    byte[] alphaOut = new byte[w * h];
    for (int k = 0; k < alphaOut.Length; k++) alphaOut[k] = 255;
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        int idx = y * w + x;
        if (cleared[idx]) { alphaOut[idx] = 0; continue; }
        bool nearClear =
          (x > 0 && cleared[idx - 1]) || (x < w - 1 && cleared[idx + 1]) ||
          (y > 0 && cleared[idx - w]) || (y < h - 1 && cleared[idx + w]);
        if (!nearClear) continue;
        int i = y * stride + x * 4;
        double db = px[i] - bb, dg = px[i + 1] - bg, dr = px[i + 2] - br;
        double dist = Math.Sqrt(db * db + dg * dg + dr * dr);
        if (dist >= featherTol) continue;
        double a = (dist - hardTol) / span;
        if (a < 0) a = 0; if (a > 1) a = 1;
        alphaOut[idx] = (byte)(a * 255);
        feathered++;
      }
    }
    for (int y = 0; y < h; y++)
      for (int x = 0; x < w; x++)
        px[y * stride + x * 4 + 3] = alphaOut[y * w + x];

    Marshal.Copy(px, 0, d.Scan0, px.Length);
    bmp.UnlockBits(d);
    bmp.Save(outPath, ImageFormat.Png);
    bmp.Dispose();

    double pct = 100.0 * clearedCount / (w * h);
    return "bg=(" + Math.Round(br) + "," + Math.Round(bg) + "," + Math.Round(bb) + ") cleared=" +
           clearedCount + " (" + Math.Round(pct, 1) + "%) feathered=" + feathered;
  }
}
'@

$stats = [LogoAlpha]::Process($In, $Out, $HardTol, $FeatherTol)
Write-Host ("STATS " + $stats)
Write-Host ("Wrote " + $Out)
