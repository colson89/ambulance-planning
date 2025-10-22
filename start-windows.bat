@echo off
REM Windows batch script om de applicatie te starten
REM Stel environment variables in
set NODE_ENV=development
set PORT=5000
set DATABASE_URL=postgresql://ambulance_user:DGHKempen005@localhost:5432/ambulance_planning
set SESSION_SECRET=a0afebaec184434b5ec6950bb0f5fc2b

echo Starting ambulance planning application...
echo Database URL: %DATABASE_URL%
echo Port: %PORT%
echo.

REM Start met tsx
node_modules\.bin\tsx server\index.ts