@echo off
setlocal

title AL-SADEN - Cloudflare Quick Tunnel

echo ========================================
echo  AL-SADEN - Cloudflare Quick Tunnel
echo ========================================
echo.
echo Local Gateway:
echo http://localhost:80
echo.
echo Tunnel Target:
echo http://localhost:80
echo.
echo [1/3] Checking cloudflared...

where cloudflared >nul 2>nul
if %errorlevel% neq 0 goto :cloudflared_missing

echo [OK] cloudflared is installed.
echo.
echo [2/3] Checking Nginx gateway and HTTP responsiveness on port 80...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$conn = Get-NetTCPConnection -State Listen -LocalPort 80 -ErrorAction SilentlyContinue; if (!$conn) { exit 1 }; try { $res = Invoke-WebRequest -Uri 'http://localhost/' -UseBasicParsing -TimeoutSec 3; if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500) { exit 0 } else { exit 2 } } catch { if ($_.Exception.Response.StatusCode.value__ -lt 500) { exit 0 } else { exit 2 } }" >nul 2>nul
set HTTP_CHECK_RESULT=%errorlevel%

if %HTTP_CHECK_RESULT% equ 1 goto :port80_missing
if %HTTP_CHECK_RESULT% equ 2 goto :gateway_502

echo [OK] Port 80 is active and responding.
echo.
echo [3/3] Checking for existing cloudflared processes...

tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I /N "cloudflared.exe">nul
if %errorlevel% equ 0 (
    echo [INFO] Found existing cloudflared process. Terminating stale instance...
    taskkill /F /IM cloudflared.exe >nul 2>nul
    timeout /t 1 /nobreak >nul
)
echo [OK] Ready to establish Quick Tunnel.
echo.
echo ======================================================================
echo Starting Cloudflare Quick Tunnel...
echo.
echo Keep this window open.
echo Your public trycloudflare.com URL will appear below.
echo ======================================================================
echo.

cloudflared tunnel --url http://localhost:80

echo.
echo ======================================================================
echo Cloudflare tunnel has stopped.
pause
exit /b 0

:cloudflared_missing
echo.
echo [ERROR] 'cloudflared' command was not found on this system.
echo.
echo Please install cloudflared using one of the following official methods:
echo   1. Windows Package Manager (Winget):
echo      winget install --id Cloudflare.cloudflared
echo.
echo   2. Direct Download from Official Cloudflare:
echo      https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/
echo.
echo After installing, restart this script.
echo.
pause
exit /b 1

:port80_missing
echo.
echo [ERROR] Port 80 is NOT listening on localhost!
echo.
echo Nginx gateway must be running on port 80 before starting the tunnel.
echo Please ensure Docker / Nginx reverse proxy is started (e.g. docker start math_platform_nginx).
echo.
pause
exit /b 1

:gateway_502
echo.
echo [ERROR] Port 80 is listening, but the Nginx upstream returned a 502/server error.
echo.
echo Please ensure Vite dev server is running on port 5173 and backend services are active.
echo.
pause
exit /b 1
