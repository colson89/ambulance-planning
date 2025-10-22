# Windows Server Environment Fix Script
Write-Host "=== FIXING WINDOWS SERVER ENVIRONMENT ===" -ForegroundColor Green

# Stop alle Node.js processen
Write-Host "`n1. Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Set correct environment variables
Write-Host "`n2. Setting environment variables..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://ambulance_user:DGHKempen005@localhost:5432/ambulance_planning"
$env:SESSION_SECRET = "a0afebaec184434b5ec6950bb0f5fc2b"
$env:NODE_ENV = "development"

Write-Host "DATABASE_URL: $env:DATABASE_URL"
Write-Host "SESSION_SECRET: Set (hidden)"
Write-Host "NODE_ENV: $env:NODE_ENV"

# Add PostgreSQL to PATH temporarily
Write-Host "`n3. Adding PostgreSQL to PATH..." -ForegroundColor Yellow
$pgPath = "C:\Program Files\PostgreSQL\17\bin"
if (Test-Path $pgPath) {
    $env:PATH += ";$pgPath"
    Write-Host "PostgreSQL path added: $pgPath" -ForegroundColor Green
} else {
    Write-Host "PostgreSQL path not found: $pgPath" -ForegroundColor Red
    # Try alternative paths
    $altPaths = @(
        "C:\Program Files\PostgreSQL\16\bin",
        "C:\Program Files\PostgreSQL\15\bin",
        "C:\Program Files (x86)\PostgreSQL\17\bin"
    )
    foreach ($path in $altPaths) {
        if (Test-Path $path) {
            $env:PATH += ";$path"
            Write-Host "Found PostgreSQL at: $path" -ForegroundColor Green
            break
        }
    }
}

# Test database connection
Write-Host "`n4. Testing database connection..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = "DGHKempen005"
    $result = psql -U ambulance_user -d ambulance_planning -c "SELECT 'Connection successful!' as status;" -t
    Write-Host "Database test result: $result" -ForegroundColor Green
    
    # Check if stations exist
    $stations = psql -U ambulance_user -d ambulance_planning -c "SELECT COUNT(*) FROM stations;" -t
    Write-Host "Stations in database: $stations" -ForegroundColor Green
    
    if ($stations -eq 0) {
        Write-Host "Adding stations to database..." -ForegroundColor Yellow
        psql -U ambulance_user -d ambulance_planning -c "
            INSERT INTO stations (name, code, display_name, created_at, updated_at) 
            VALUES 
            ('westerlo', 'westerlo', 'ZW Westerlo', NOW(), NOW()),
            ('mol', 'mol', 'PIT Mol', NOW(), NOW())
            ON CONFLICT (code) DO NOTHING;
        "
        Write-Host "Stations added!" -ForegroundColor Green
    }
    
} catch {
    Write-Host "Database connection failed: $_" -ForegroundColor Red
}

# Start the application
Write-Host "`n5. Starting application..." -ForegroundColor Yellow
Write-Host "Starting with PM2..." -ForegroundColor Blue

# Use PM2 to start with environment variables
pm2 start ecosystem.config.cjs --env production

Write-Host "`n6. Checking application status..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
pm2 status

# Test the API
Write-Host "`n7. Testing API after restart..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/stations" -Method GET -TimeoutSec 10
    Write-Host "API Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "API Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "API still failing: $_" -ForegroundColor Red
}

Write-Host "`n=== ENVIRONMENT FIX COMPLETE ===" -ForegroundColor Green
Write-Host "If API still fails, check PM2 logs with: pm2 logs" -ForegroundColor Yellow