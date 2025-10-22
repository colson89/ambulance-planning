# Windows PowerShell script om de applicatie te starten
# Stel environment variables in
$env:NODE_ENV = "development"
$env:PORT = "5000"
$env:DATABASE_URL = "postgresql://ambulance_user:DGHKempen005@localhost:5432/ambulance_planning"
$env:SESSION_SECRET = "a0afebaec184434b5ec6950bb0f5fc2b"

# Start de applicatie
Write-Host "Starting ambulance planning application..."
Write-Host "Database URL: $env:DATABASE_URL"
Write-Host "Port: $env:PORT"
Write-Host ""

# Test database connectie eerst
Write-Host "Testing database connection..."
try {
    # Test of PostgreSQL service draait
    $service = Get-Service -Name "postgresql-x64-17" -ErrorAction Stop
    if ($service.Status -eq "Running") {
        Write-Host "PostgreSQL service is running" -ForegroundColor Green
    } else {
        Write-Host "PostgreSQL service is not running, starting..." -ForegroundColor Yellow
        Start-Service -Name "postgresql-x64-17"
    }
} catch {
    Write-Host "Warning: Could not check PostgreSQL service status" -ForegroundColor Yellow
}

Write-Host "Starting server..."
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Blue
Write-Host "Node.js version: $(node --version)" -ForegroundColor Blue
Write-Host "Environment variables set:" -ForegroundColor Blue
Write-Host "  NODE_ENV: $env:NODE_ENV"
Write-Host "  PORT: $env:PORT"
Write-Host "  DATABASE_URL: $env:DATABASE_URL"
Write-Host ""

# Test of tsx bestaat
if (Test-Path "node_modules/.bin/tsx") {
    Write-Host "tsx found, starting application..." -ForegroundColor Green
    
    # Test of server/index.ts bestaat
    if (Test-Path "server/index.ts") {
        Write-Host "server/index.ts found, starting..." -ForegroundColor Green
        Write-Host "Command: node_modules/.bin/tsx server/index.ts" -ForegroundColor Blue
        
        # Start met tsx en wacht op output
        & "node_modules/.bin/tsx" server/index.ts
    } else {
        Write-Host "server/index.ts not found!" -ForegroundColor Red
        Write-Host "Current directory contents:" -ForegroundColor Yellow
        Get-ChildItem | Format-Table Name, Mode
    }
} else {
    Write-Host "tsx not found in node_modules/.bin/" -ForegroundColor Red
    Write-Host "Available files in node_modules/.bin/:" -ForegroundColor Yellow
    if (Test-Path "node_modules/.bin/") {
        Get-ChildItem "node_modules/.bin/" | Select-Object Name | Format-Table
    } else {
        Write-Host "node_modules/.bin/ directory not found!" -ForegroundColor Red
    }
    Write-Host "Trying alternative start method..." -ForegroundColor Yellow
    npm run dev
}