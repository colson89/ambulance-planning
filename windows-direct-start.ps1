# Direct Windows Start Script - Bypass PM2 issues
Write-Host "=== DIRECT WINDOWS START ===" -ForegroundColor Green

# Kill any existing processes
Write-Host "Stopping existing processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Set environment variables
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://ambulance_user:DGHKempen005@localhost:5432/ambulance_planning"
$env:SESSION_SECRET = "a0afebaec184434b5ec6950bb0f5fc2b"

Write-Host "Environment set:" -ForegroundColor Yellow
Write-Host "  NODE_ENV: $env:NODE_ENV"
Write-Host "  DATABASE_URL: $env:DATABASE_URL"
Write-Host "  SESSION_SECRET: [HIDDEN]"

# Change to project directory
Set-Location "C:\ambulance-planning"

# Start directly with Node.js (not PM2)
Write-Host "`nStarting server directly with Node.js..." -ForegroundColor Green
Write-Host "Command: node node_modules/tsx/dist/cli.mjs server/index.ts" -ForegroundColor Blue

try {
    # Start the server in the background
    Start-Process -FilePath "node" -ArgumentList "node_modules/tsx/dist/cli.mjs", "server/index.ts" -NoNewWindow -PassThru
    
    Write-Host "Server started! Waiting 5 seconds..." -ForegroundColor Green
    Start-Sleep -Seconds 5
    
    # Test the API
    Write-Host "Testing API..." -ForegroundColor Yellow
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/stations" -Method GET -TimeoutSec 10
    Write-Host "Success! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
    
    Write-Host "`n=== SERVER RUNNING SUCCESSFULLY ===" -ForegroundColor Green
    Write-Host "Visit: http://localhost:5000" -ForegroundColor Cyan
    Write-Host "To stop: Get-Process -Name node | Stop-Process" -ForegroundColor Yellow
    
} catch {
    Write-Host "Failed to start or test: $_" -ForegroundColor Red
}