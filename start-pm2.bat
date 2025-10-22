%date% %time%
cd /d "C:\ambulance-planning"
set NODE_ENV=production
set PATH=%PATH%;%APPDATA%\npm
pm2 resurrect
pm2 status

