@echo off
setlocal

REM Log startup
echo ============================================ >> C:\ambulance-planning\logs\batch.log 2>&1
echo %date% %time% - Starting Ambulance Planning >> C:\ambulance-planning\logs\batch.log 2>&1
echo ============================================ >> C:\ambulance-planning\logs\batch.log 2>&1

REM Change to project directory
cd /d C:\ambulance-planning

REM Set environment variables
set NODE_ENV=production
set PM2_HOME=C:\Users\jeva400\.pm2
set PATH=%PATH%;C:\Users\jeva400\AppData\Roaming\npm

echo Environment configured >> C:\ambulance-planning\logs\batch.log 2>&1

REM Start the application using pm2 resurrect (restore saved processes)
echo Running pm2 resurrect... >> C:\ambulance-planning\logs\batch.log 2>&1
call pm2 resurrect >> C:\ambulance-planning\logs\batch.log 2>&1

REM Wait a moment for PM2 to start
timeout /t 2 /nobreak >nul

REM Show final status
echo Final PM2 status: >> C:\ambulance-planning\logs\batch.log 2>&1
call pm2 list >> C:\ambulance-planning\logs\batch.log 2>&1

echo %date% %time% - Startup script complete >> C:\ambulance-planning\logs\batch.log 2>&1
echo ============================================ >> C:\ambulance-planning\logs\batch.log 2>&1

endlocal
