@echo off
title NEURAL NEXUS 2026 - EVENT LAUNCHER
color 0A

echo ===================================================
echo     NEURAL NEXUS 2026 - LIVE EVENT SERVER
echo     Department of AI ^& Data Science
echo ===================================================
echo.
echo Starting Backend Server on port 5000...
start "Neural Nexus Backend Server" cmd /k "cd /d %~dp0server && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Cloudflare Live Tunnel...
start "Neural Nexus Cloudflare Tunnel" cmd /k "cd /d %~dp0 && cloudflared.exe tunnel --url http://localhost:5000"

echo.
echo ===================================================
echo  Both Server and Live Tunnel are now running!
echo  Admin URL: http://localhost:5000/admin (or via tunnel/pages)
echo  Admin Password: #25me1a5476
echo ===================================================
pause
