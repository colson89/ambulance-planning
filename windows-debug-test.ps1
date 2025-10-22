# Windows Server Debug Test Script
Write-Host "=== AMBULANCE PLANNING DEBUG TEST ===" -ForegroundColor Green

# Test 1: Check if PostgreSQL is running
Write-Host "`n1. PostgreSQL Service Status:" -ForegroundColor Yellow
Get-Service postgresql-x64-17 | Select-Object Name, Status, StartType

# Test 2: Test database connection
Write-Host "`n2. Database Connection Test:" -ForegroundColor Yellow
try {
    $env:PGPASSWORD = "DGHKempen005"
    $result = psql -U ambulance_user -d ambulance_planning -c "SELECT COUNT(*) FROM stations;" -t
    Write-Host "Stations count: $result" -ForegroundColor Green
    
    $userCount = psql -U ambulance_user -d ambulance_planning -c "SELECT COUNT(*) FROM users;" -t
    Write-Host "Users count: $userCount" -ForegroundColor Green
} catch {
    Write-Host "Database connection failed: $_" -ForegroundColor Red
}

# Test 3: Check if Node.js processes are running
Write-Host "`n3. Node.js Processes:" -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime

# Test 4: Test API endpoint
Write-Host "`n4. API Test (localhost):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/stations" -Method GET -TimeoutSec 10
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "API test failed: $_" -ForegroundColor Red
    
    # Test with 127.0.0.1
    Write-Host "`n4b. API Test (127.0.0.1):" -ForegroundColor Yellow
    try {
        $response2 = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/stations" -Method GET -TimeoutSec 10
        Write-Host "Status: $($response2.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response2.Content)" -ForegroundColor Green
    } catch {
        Write-Host "127.0.0.1 also failed: $_" -ForegroundColor Red
    }
}

# Test 5: Check environment variables
Write-Host "`n5. Environment Variables:" -ForegroundColor Yellow
Write-Host "DATABASE_URL: $env:DATABASE_URL"
Write-Host "NODE_ENV: $env:NODE_ENV"

# Test 6: Check if port 5000 is in use
Write-Host "`n6. Port 5000 Status:" -ForegroundColor Yellow
netstat -an | findstr ":5000"

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Green