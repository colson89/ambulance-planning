@echo off
echo %date% %time% - Starting Ambulance Planning >> C:\ambulance-planning\logs\batch.log
cd C:\ambulance-planning
set NODE_ENV=production
pm2 resurrect
pm2 status
