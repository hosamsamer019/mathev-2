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
echo Checking cloudflared...

where cloudflared >nul 2>nul
if %errorlevel% neq 0 goto :cloudflared_missing

echo [OK] cloudflared is installed.
echo.
echo Checking Nginx / port 80...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$conn = Get-NetTCPConnection -State Listen -LocalPort 80 -ErrorAction SilentlyContinue; if ($conn) { exit 0 } else { exit 1 }" >nul 2>nul
if %errorlevel% neq 0 goto :port80_missing

echo [OK] Port 80 is active and listening.
echo.
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
echo Please ensure the Nginx reverse proxy is started and try again.
echo.
pause
exit /b 1
