@echo off
title AL-SADEN Environment Stopper

echo ==============================================
echo Stopping AL-SADEN Development Environment...
echo ==============================================
echo.

echo Stopping Frontend...
taskkill /FI "WINDOWTITLE eq ALSADEN_Frontend*" /T /F >nul 2>&1

echo Stopping Auth Service...
taskkill /FI "WINDOWTITLE eq ALSADEN_Auth*" /T /F >nul 2>&1

echo Stopping User Service...
taskkill /FI "WINDOWTITLE eq ALSADEN_User*" /T /F >nul 2>&1

echo Stopping Course Service...
taskkill /FI "WINDOWTITLE eq ALSADEN_Course*" /T /F >nul 2>&1

echo Stopping AI Service...
taskkill /FI "WINDOWTITLE eq ALSADEN_AI*" /T /F >nul 2>&1

echo Stopping Analytics Service...
taskkill /FI "WINDOWTITLE eq ALSADEN_Analytics*" /T /F >nul 2>&1

echo.
echo ==============================================
echo All development servers and APIs have been successfully stopped.
echo ==============================================
echo.
pause
