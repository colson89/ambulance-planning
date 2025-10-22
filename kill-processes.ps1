# Script om alle Node.js processen te stoppen
Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow

# Stop alle node processen
$processes = Get-Process | Where-Object { $_.ProcessName -eq "node" }
if ($processes) {
    foreach ($process in $processes) {
        Write-Host "Stopping process ID: $($process.Id)" -ForegroundColor Red
        Stop-Process -Id $process.Id -Force
    }
    Write-Host "All Node.js processes stopped" -ForegroundColor Green
} else {
    Write-Host "No Node.js processes found" -ForegroundColor Yellow
}

# Stop alle tsx processen
$tsxProcesses = Get-Process | Where-Object { $_.ProcessName -eq "tsx" }
if ($tsxProcesses) {
    foreach ($process in $tsxProcesses) {
        Write-Host "Stopping tsx process ID: $($process.Id)" -ForegroundColor Red
        Stop-Process -Id $process.Id -Force
    }
    Write-Host "All tsx processes stopped" -ForegroundColor Green
}

# Stop PM2 processen
try {
    Write-Host "Stopping PM2 processes..." -ForegroundColor Yellow
    pm2 kill
    Write-Host "PM2 processes stopped" -ForegroundColor Green
} catch {
    Write-Host "PM2 not running or error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "All processes stopped. You can now start fresh with: .\start-windows.ps1" -ForegroundColor Cyan