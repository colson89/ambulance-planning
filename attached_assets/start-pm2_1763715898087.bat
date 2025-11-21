@echo off
echo ============================================ >> C:\ambulance-planning\logs\batch.log 2>&1
echo %date% %time% - Starting Ambulance Planning >> C:\ambulance-planning\logs\batch.log 2>&1
echo ============================================ >> C:\ambulance-planning\logs\batch.log 2>&1

REM Change to project directory
cd /d C:\ambulance-planning >> C:\ambulance-planning\logs\batch.log 2>&1

REM Set environment variables
set NODE_ENV=production
set PM2_HOME=C:\Users\jeva400\.pm2
set PATH=%PATH%;C:\Users\jeva400\AppData\Roaming\npm

echo Environment set: >> C:\ambulance-planning\logs\batch.log 2>&1
echo PM2_HOME=%PM2_HOME% >> C:\ambulance-planning\logs\batch.log 2>&1

REM Check if PM2 is accessible
echo Checking PM2... >> C:\ambulance-planning\logs\batch.log 2>&1
where pm2 >> C:\ambulance-planning\logs\batch.log 2>&1

REM Delete any existing PM2 processes (use || to continue even if this fails)
echo Deleting existing PM2 processes... >> C:\ambulance-planning\logs\batch.log 2>&1
pm2 delete all >> C:\ambulance-planning\logs\batch.log 2>&1 || echo No existing processes to delete >> C:\ambulance-planning\logs\batch.log 2>&1

REM Start the application directly
echo Starting ambulance-planning... >> C:\ambulance-planning\logs\batch.log 2>&1
pm2 start dist/index.js --name ambulance-planning >> C:\ambulance-planning\logs\batch.log 2>&1

REM Check if start was successful
if %ERRORLEVEL% EQU 0 (
    echo Successfully started! >> C:\ambulance-planning\logs\batch.log 2>&1
) else (
    echo ERROR: Failed to start PM2 process! Error code: %ERRORLEVEL% >> C:\ambulance-planning\logs\batch.log 2>&1
)

REM Save PM2 process list
echo Saving PM2 process list... >> C:\ambulance-planning\logs\batch.log 2>&1
pm2 save >> C:\ambulance-planning\logs\batch.log 2>&1

REM Show status
echo Current PM2 status: >> C:\ambulance-planning\logs\batch.log 2>&1
pm2 status >> C:\ambulance-planning\logs\batch.log 2>&1

echo %date% %time% - Startup complete >> C:\ambulance-planning\logs\batch.log 2>&1
echo ============================================ >> C:\ambulance-planning\logs\batch.log 2>&1
