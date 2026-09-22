@echo off
title STOP NEURAL NEXUS EVENT
color 0C

echo ===================================================
echo     STOPPING NEURAL NEXUS 2026 EVENT SERVERS
echo ===================================================
echo.
echo Stopping cloudflared tunnel...
taskkill /F /IM cloudflared.exe >nul 2>&1

echo Stopping node backend processes on port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo.
echo Event server and tunnel have been stopped.
echo ===================================================
pause
