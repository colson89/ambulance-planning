# Complete Windows Server 2022 Fix Script
Write-Host "=== WINDOWS SERVER 2022 COMPLETE FIX ===" -ForegroundColor Green

# Change to project directory first
try {
    Set-Location "C:\ambulance-planning"
    Write-Host "Changed to C:\ambulance-planning" -ForegroundColor Green
} catch {
    Write-Host "Could not find C:\ambulance-planning" -ForegroundColor Red
    exit 1
}

# Kill all Node.js processes
Write-Host "`n1. Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "pm2" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# Set environment variables
Write-Host "`n2. Setting environment variables..." -ForegroundColor Yellow
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://ambulance_user:DGHKempen005@localhost:5432/ambulance_planning"
$env:SESSION_SECRET = "a0afebaec184434b5ec6950bb0f5fc2b"

Write-Host "Environment variables set:" -ForegroundColor Green
Write-Host "  NODE_ENV: $env:NODE_ENV"
Write-Host "  DATABASE_URL: $env:DATABASE_URL"
Write-Host "  SESSION_SECRET: [HIDDEN]"

# Test database connection first
Write-Host "`n3. Testing database connection..." -ForegroundColor Yellow
$pgPaths = @(
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin", 
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files (x86)\PostgreSQL\17\bin"
)

$psqlPath = $null
foreach ($path in $pgPaths) {
    if (Test-Path "$path\psql.exe") {
        $psqlPath = "$path\psql.exe"
        Write-Host "Found psql at: $path" -ForegroundColor Green
        break
    }
}

if ($psqlPath) {
    try {
        $env:PGPASSWORD = "DGHKempen005"
        Write-Host "Testing database connection..." -ForegroundColor Blue
        $result = & $psqlPath -U ambulance_user -d ambulance_planning -h localhost -c "SELECT 'OK' as status;" -t
        if ($result -match "OK") {
            Write-Host "Database connection successful" -ForegroundColor Green
            
            # Check and add stations if needed
            $stationCount = & $psqlPath -U ambulance_user -d ambulance_planning -h localhost -c "SELECT COUNT(*) FROM stations;" -t
            Write-Host "Stations found: $($stationCount.Trim())" -ForegroundColor Green
            
            if ($stationCount.Trim() -eq "0") {
                Write-Host "Adding stations..." -ForegroundColor Yellow
                & $psqlPath -U ambulance_user -d ambulance_planning -h localhost -c @"
                    INSERT INTO stations (name, code, display_name, created_at, updated_at) 
                    VALUES 
                    ('westerlo', 'westerlo', 'ZW Westerlo', NOW(), NOW()),
                    ('mol', 'mol', 'PIT Mol', NOW(), NOW())
                    ON CONFLICT (code) DO NOTHING;
"@
                Write-Host "Stations added" -ForegroundColor Green
            }
        } else {
            Write-Host "Database connection failed" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "Database test failed: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "psql.exe not found in standard locations" -ForegroundColor Red
    Write-Host "Please ensure PostgreSQL is installed" -ForegroundColor Yellow
    exit 1
}

# Check critical files
Write-Host "`n4. Checking project files..." -ForegroundColor Yellow
$requiredFiles = @(
    "server\index.ts",
    "server\routes.ts", 
    "server\db.ts",
    "package.json",
    "node_modules\tsx\dist\cli.mjs"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "$file" -ForegroundColor Green
    } else {
        Write-Host "$file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "Missing critical files. Please ensure project is complete." -ForegroundColor Red
    exit 1
}

# Test Node.js
Write-Host "`n5. Testing Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found or not working" -ForegroundColor Red
    exit 1
}

# Start the server
Write-Host "`n6. Starting ambulance planning server..." -ForegroundColor Yellow
Write-Host "Command: node node_modules\tsx\dist\cli.mjs server\index.ts" -ForegroundColor Blue

# Start server as background job
$serverJob = Start-Job -ScriptBlock {
    param($projectPath, $dbUrl, $sessionSecret)
    Set-Location $projectPath
    $env:NODE_ENV = "development"
    $env:DATABASE_URL = $dbUrl
    $env:SESSION_SECRET = $sessionSecret
    node node_modules\tsx\dist\cli.mjs server\index.ts
} -ArgumentList (Get-Location).Path, $env:DATABASE_URL, $env:SESSION_SECRET

# Wait for server to start
Write-Host "Waiting for server startup (15 seconds)..." -ForegroundColor Blue
Start-Sleep -Seconds 15

# Test the API multiple times
Write-Host "`n7. Testing API endpoints..." -ForegroundColor Yellow
$testSuccess = $false
for ($i = 1; $i -le 3; $i++) {
    Write-Host "API Test attempt $i..." -ForegroundColor Blue
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/stations" -Method GET -TimeoutSec 20
        if ($response -and $response.Count -gt 0) {
            Write-Host "API SUCCESS!" -ForegroundColor Green
            Write-Host "Stations found: $($response.Count)" -ForegroundColor Green
            Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
            $testSuccess = $true
            break
        }
    } catch {
        Write-Host "API Test $i failed: $_" -ForegroundColor Red
        if ($i -lt 3) {
            Write-Host "Retrying in 5 seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    }
}

# Check server output if tests failed
if (-not $testSuccess) {
    Write-Host "`n8. Server diagnostics..." -ForegroundColor Yellow
    $jobOutput = Receive-Job -Job $serverJob -ErrorAction SilentlyContinue
    if ($jobOutput) {
        Write-Host "Server output:" -ForegroundColor Gray
        $jobOutput | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
    } else {
        Write-Host "No server output available" -ForegroundColor Gray
    }
    
    Write-Host "`nChecking if port 5000 is in use..." -ForegroundColor Blue
    $portCheck = netstat -an | findstr ":5000"
    if ($portCheck) {
        Write-Host "Port 5000 status:" -ForegroundColor Green
        Write-Host $portCheck -ForegroundColor Gray
    } else {
        Write-Host "Port 5000 not in use - server may not have started" -ForegroundColor Red
    }
}

# Clean up
Write-Host "`n9. Cleanup..." -ForegroundColor Yellow
if ($testSuccess) {
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "Ambulance Planning System is running on http://localhost:5000" -ForegroundColor Cyan
    Write-Host "The server is running in the background. Close this window when done." -ForegroundColor Yellow
    Write-Host "To stop the server later: Get-Process -Name node | Stop-Process" -ForegroundColor Yellow
    
    # Keep the server running
    Wait-Job -Job $serverJob
} else {
    Write-Host "=== FAILED! ===" -ForegroundColor Red
    Write-Host "Server could not be started or API is not responding" -ForegroundColor Red
    Stop-Job -Job $serverJob -ErrorAction SilentlyContinue
}

Remove-Job -Job $serverJob -ErrorAction SilentlyContinue