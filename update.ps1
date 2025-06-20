# Ambulance Planning System - Windows Update Script
# Behoudt database en gebruikersdata tijdens updates

param(
    [switch]$Force,
    [string]$BackupPath = "C:\Backups\ambulance-planning"
)

# Kleurcodes voor PowerShell
function Write-Success { 
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green 
}

function Write-Warning { 
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow 
}

function Write-Error { 
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red 
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Ambulance Planning System - Update" -ForegroundColor Cyan  
Write-Host "======================================" -ForegroundColor Cyan

try {
    # Controleer Administrator rechten
    if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
        Write-Error "Script moet als Administrator worden uitgevoerd"
        exit 1
    }

    # Controleer of we in de juiste directory zijn
    if (!(Test-Path "package.json")) {
        Write-Error "Niet in project directory. Ga naar ambulance-planning directory"
        exit 1
    }

    # Stap 1: Pre-update backup
    Write-Host "Stap 1: Backup maken..."
    if (Test-Path ".\windows-backup.ps1") {
        & .\windows-backup.ps1
        Write-Success "Backup voltooid"
    } else {
        Write-Warning "Backup script niet gevonden - handmatige backup aanbevolen"
    }

    # Stap 2: Service status controleren
    Write-Host "Stap 2: Service status controleren..."
    $service = Get-Service -Name "Ambulance Planning System" -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            Write-Success "Service draait normaal"
            $serviceRunning = $true
        } else {
            Write-Warning "Service niet actief"
            $serviceRunning = $false
        }
    } else {
        Write-Warning "Windows Service niet gevonden"
        $serviceRunning = $false
    }

    # Stap 3: Database connectie testen
    Write-Host "Stap 3: Database connectie testen..."
    $dbTest = & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -h localhost -U ambulance_user -d ambulance_planning -c "SELECT 1;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database connectie OK"
    } else {
        Write-Error "Database connectie fout - update gestopt"
        exit 1
    }

    # Stap 4: Service stoppen
    if ($serviceRunning) {
        Write-Host "Stap 4: Service stoppen..."
        Stop-Service -Name "Ambulance Planning System" -Force
        Write-Success "Service gestopt"
    }

    # Stap 5: Code updates
    Write-Host "Stap 5: Code bijwerken..."
    if (Test-Path ".git") {
        $currentCommit = & git rev-parse HEAD
        Write-Warning "Huidige commit: $currentCommit"
        
        & git fetch origin
        & git pull origin main
        
        $newCommit = & git rev-parse HEAD
        
        if ($currentCommit -ne $newCommit) {
            Write-Success "Code bijgewerkt naar: $newCommit"
        } else {
            Write-Warning "Geen nieuwe code wijzigingen"
        }
    } else {
        Write-Warning "Geen Git repository - handmatige code update vereist"
    }

    # Stap 6: Dependencies bijwerken
    Write-Host "Stap 6: Dependencies bijwerken..."
    & npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies bijgewerkt"
    } else {
        throw "NPM install failed"
    }

    # Stap 7: Database schema bijwerken (veilig)
    Write-Host "Stap 7: Database schema controleren..."
    
    # Aantal records voor update
    $userCountBefore = & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -h localhost -U ambulance_user -d ambulance_planning -t -c "SELECT COUNT(*) FROM users;" | Out-String
    $shiftCountBefore = & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -h localhost -U ambulance_user -d ambulance_planning -t -c "SELECT COUNT(*) FROM shifts;" | Out-String
    
    $userCountBefore = $userCountBefore.Trim()
    $shiftCountBefore = $shiftCountBefore.Trim()
    
    Write-Warning "Database voor update: $userCountBefore gebruikers, $shiftCountBefore shifts"

    # Schema update
    & npm run db:push
    if ($LASTEXITCODE -ne 0) {
        throw "Database schema update failed"
    }

    # Controleer data integriteit na update
    $userCountAfter = & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -h localhost -U ambulance_user -d ambulance_planning -t -c "SELECT COUNT(*) FROM users;" | Out-String
    $shiftCountAfter = & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -h localhost -U ambulance_user -d ambulance_planning -t -c "SELECT COUNT(*) FROM shifts;" | Out-String
    
    $userCountAfter = $userCountAfter.Trim()
    $shiftCountAfter = $shiftCountAfter.Trim()

    if ($userCountBefore -eq $userCountAfter -and $shiftCountBefore -eq $shiftCountAfter) {
        Write-Success "Database integriteit gecontroleerd - data behouden"
    } else {
        Write-Error "Database data inconsistentie gedetecteerd!"
        Write-Error "Voor: $userCountBefore gebruikers, $shiftCountBefore shifts"
        Write-Error "Na: $userCountAfter gebruikers, $shiftCountAfter shifts"
        
        if (!$Force) {
            $response = Read-Host "Wilt u doorgaan? (y/N)"
            if ($response -notmatch '^[Yy]$') {
                Write-Error "Update geannuleerd"
                exit 1
            }
        }
    }

    # Stap 8: Applicatie rebuilden
    Write-Host "Stap 8: Applicatie rebuilden..."
    & npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Build voltooid"
    } else {
        throw "Build failed"
    }

    # Stap 9: Service herstarten
    Write-Host "Stap 9: Service herstarten..."
    if ($service) {
        Start-Service -Name "Ambulance Planning System"
        
        # Wacht op startup
        Start-Sleep 5
        
        $serviceAfter = Get-Service -Name "Ambulance Planning System"
        if ($serviceAfter.Status -eq "Running") {
            Write-Success "Service herstart succesvol"
        } else {
            Write-Error "Service start problemen"
            Get-EventLog -LogName Application -Source "Ambulance Planning System" -Newest 5
            exit 1
        }
    } else {
        Write-Warning "Start applicatie handmatig: npm start"
    }

    # Stap 10: Functionaliteit testen
    Write-Host "Stap 10: Functionaliteit testen..."

    # Test HTTP response
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "HTTP server reageert"
        } else {
            throw "HTTP server unexpected response: $($response.StatusCode)"
        }
    } catch {
        Write-Error "HTTP server niet bereikbaar: $($_.Exception.Message)"
        exit 1
    }

    # Test database queries
    $dbQueryTest = & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -h localhost -U ambulance_user -d ambulance_planning -c "SELECT username FROM users LIMIT 1;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database queries werken"
    } else {
        Write-Error "Database query problemen"
        exit 1
    }

    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Success "Update succesvol voltooid!"
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Post-update verificatie:"
    Write-Host "- Website: http://localhost:5000"
    Write-Host "- Database: $userCountAfter gebruikers, $shiftCountAfter shifts"
    Write-Host "- Service: Get-Service 'Ambulance Planning System'"
    Write-Host ""
    Write-Host "Bij problemen:"
    Write-Host "- Rollback: git checkout $currentCommit"
    Write-Host "- Restore DB: Gebruik laatste backup"
    Write-Host "- Logs: Get-EventLog -LogName Application -Source 'Ambulance Planning System'"

} catch {
    Write-Error "Update gefaald: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Rollback aanbevolen:"
    Write-Host "1. Stop service: Stop-Service 'Ambulance Planning System'"
    Write-Host "2. Rollback code: git checkout HEAD~1"
    Write-Host "3. Restore database van backup"
    Write-Host "4. Rebuild: npm install && npm run build"
    Write-Host "5. Start service: Start-Service 'Ambulance Planning System'"
    
    exit 1
}