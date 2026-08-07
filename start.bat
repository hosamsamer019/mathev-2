@echo off
setlocal enabledelayedexpansion
title AL-SADEN Environment Launcher

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo ==============================================
echo Starting AL-SADEN Development Environment...
echo ==============================================

echo.
echo [1/6] Starting Auth Service...
start "ALSADEN_Auth" cmd /k "npm run dev:auth"
timeout /t 3 /nobreak > nul

echo [2/6] Starting User Service...
start "ALSADEN_User" cmd /k "npm run dev:user"
timeout /t 3 /nobreak > nul

echo [3/6] Starting Course Service...
start "ALSADEN_Course" cmd /k "npm run dev:course"
timeout /t 3 /nobreak > nul

echo [4/6] Starting AI Service...
start "ALSADEN_AI" cmd /k "npm run dev:ai"
timeout /t 3 /nobreak > nul

echo [5/6] Starting Analytics Service...
start "ALSADEN_Analytics" cmd /k "npm run dev:analytics"
timeout /t 3 /nobreak > nul

echo [6/6] Starting Frontend (Vite)...
start "ALSADEN_Frontend" cmd /k "npm run dev:frontend"

echo.
echo ==============================================
echo Development environment is starting.
echo Waiting for the frontend to become ready...
echo ==============================================

:: Wait a bit for Vite to start up
timeout /t 5 /nobreak > nul

:: Detect the port dynamically
set PORT=5173
set MAX_PORT=5183

:check_port
netstat -ano | findstr /R /C:":!PORT! .*LISTENING" >nul
if %errorlevel% equ 0 goto found_port
set /a PORT+=1
if !PORT! gtr !MAX_PORT! goto not_found
goto check_port

:found_port
echo Frontend successfully detected on port !PORT!
echo Opening browser to http://localhost:!PORT!
start http://localhost:!PORT!
goto end

:not_found
echo Could not detect frontend port within range (5173-5183).
echo Assuming default port 5173.
start http://localhost:5173

:end
echo.
echo Everything is running! Keep the terminal windows open.
echo You can run stop.bat later to cleanly shut down all services.
echo.
pause
