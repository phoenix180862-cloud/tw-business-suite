@echo off
title TW Business Suite - Lokaler Webserver
echo.
echo ============================================
echo   TW BUSINESS SUITE - Server starten
echo ============================================
echo.
echo Server wird gestartet auf http://localhost:8080
echo.
echo WICHTIG: Dieses Fenster NICHT schliessen!
echo          Zum Beenden: Ctrl+C druecken
echo.

:: Browser oeffnen nach 2 Sekunden
start "" "http://localhost:8080/index.html"

:: PowerShell Webserver starten (funktioniert auf jedem Windows 10/11)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:8080/'); $listener.Start(); Write-Host ''; Write-Host 'Server laeuft! Browser oeffnet sich...'; Write-Host 'Zum Beenden: Ctrl+C'; Write-Host ''; while ($listener.IsListening) { $context = $listener.GetContext(); $request = $context.Request; $response = $context.Response; $path = $request.Url.LocalPath; if ($path -eq '/') { $path = '/index.html' }; $filePath = Join-Path (Get-Location) $path.TrimStart('/'); if (Test-Path $filePath -PathType Leaf) { $ext = [System.IO.Path]::GetExtension($filePath).ToLower(); $mime = switch ($ext) { '.html' {'text/html; charset=utf-8'} '.js' {'application/javascript'} '.css' {'text/css'} '.json' {'application/json'} '.png' {'image/png'} '.jpg' {'image/jpeg'} '.svg' {'image/svg+xml'} '.ico' {'image/x-icon'} '.woff' {'font/woff'} '.woff2' {'font/woff2'} default {'application/octet-stream'} }; $response.ContentType = $mime; $response.Headers.Add('Access-Control-Allow-Origin', '*'); $response.Headers.Add('Access-Control-Allow-Headers', '*'); $buffer = [System.IO.File]::ReadAllBytes($filePath); $response.ContentLength64 = $buffer.Length; $response.OutputStream.Write($buffer, 0, $buffer.Length) } else { $response.StatusCode = 404; $buffer = [System.Text.Encoding]::UTF8.GetBytes('404 - Datei nicht gefunden'); $response.ContentLength64 = $buffer.Length; $response.OutputStream.Write($buffer, 0, $buffer.Length) }; $response.OutputStream.Close(); Write-Host \"$([DateTime]::Now.ToString('HH:mm:ss')) $($request.HttpMethod) $($request.Url.LocalPath)\" }"
