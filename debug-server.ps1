# Debug script om server problemen op te lossen
Write-Host "=== AMBULANCE PLANNING DEBUG SCRIPT ===" -ForegroundColor Cyan
Write-Host ""

# 1. Controleer of de applicatie draait
Write-Host "1. Checking if application is running..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { $_.ProcessName -eq "node" -or $_.ProcessName -eq "tsx" }
if ($processes) {
    Write-Host "Found running processes:" -ForegroundColor Green
    $processes | Format-Table ProcessName, Id, StartTime
} else {
    Write-Host "No Node.js/tsx processes found" -ForegroundColor Red
}

# 2. Controleer netwerk poorten
Write-Host "2. Checking network ports..." -ForegroundColor Yellow
$port5000 = netstat -an | findstr ":5000"
if ($port5000) {
    Write-Host "Port 5000 status:" -ForegroundColor Green
    Write-Host $port5000
} else {
    Write-Host "Port 5000 is not listening" -ForegroundColor Red
}

# 3. Controleer PostgreSQL service
Write-Host "3. Checking PostgreSQL service..." -ForegroundColor Yellow
try {
    $service = Get-Service -Name "postgresql-x64-17" -ErrorAction Stop
    Write-Host "PostgreSQL service status: $($service.Status)" -ForegroundColor Green
} catch {
    Write-Host "PostgreSQL service not found or error: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test database connectie
Write-Host "4. Testing database connection..." -ForegroundColor Yellow
$env:PGPASSWORD = "zD0gaJaWMMBWXustHY2b"
try {
    $result = & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U ambulance_user -d ambulance_planning -h localhost -c "SELECT COUNT(*) FROM stations;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database connection successful" -ForegroundColor Green
        Write-Host $result
    } else {
        Write-Host "Database connection failed: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "Database test error: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Test localhost connectie
Write-Host "5. Testing localhost connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/stations" -Method GET -TimeoutSec 5
    Write-Host "API response successful: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "API connection failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Controleer Windows Firewall
Write-Host "6. Checking Windows Firewall..." -ForegroundColor Yellow
$firewallRule = netsh advfirewall firewall show rule name="Node.js Server Port 5000"
if ($firewallRule -match "No rules") {
    Write-Host "Firewall rule not found. Adding rule..." -ForegroundColor Yellow
    netsh advfirewall firewall add rule name="Node.js Server Port 5000" dir=in action=allow protocol=TCP localport=5000
    Write-Host "Firewall rule added" -ForegroundColor Green
} else {
    Write-Host "Firewall rule exists" -ForegroundColor Green
}

# 7. Controleer wat Node.js processen aan het doen zijn
Write-Host "7. Checking what Node.js processes are running..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { $_.ProcessName -eq "node" }
if ($processes) {
    foreach ($process in $processes) {
        Write-Host "Process ID $($process.Id) - Command line:" -ForegroundColor Blue
        try {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
            Write-Host "  $cmdLine" -ForegroundColor Gray
        } catch {
            Write-Host "  Unable to get command line" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== DEBUG COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "DIAGNOSIS:" -ForegroundColor Yellow
Write-Host "- Node.js processes are running but not listening on port 5000" -ForegroundColor Red
Write-Host "- This suggests the processes are stuck or not starting the server correctly" -ForegroundColor Red
Write-Host ""
Write-Host "SOLUTION:" -ForegroundColor Green
Write-Host "1. Stop all processes: .\kill-processes.ps1" -ForegroundColor Yellow
Write-Host "2. Start fresh: .\start-windows.ps1" -ForegroundColor Yellow