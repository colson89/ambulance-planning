# Ambulance Planning System - Windows Backup Script
# Voor Windows Server/Desktop

param(
    [string]$BackupPath = "C:\Backups\ambulance-planning",
    [string]$DBName = "ambulance_planning",
    [string]$DBUser = "ambulance_user",
    [string]$PostgreSQLPath = "C:\Program Files\PostgreSQL\15\bin"
)

# Configuratie
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$LogFile = "$BackupPath\backup_log_$Date.txt"

# Functie voor logging
function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "$Timestamp - $Message"
    Write-Host $LogMessage
    Add-Content -Path $LogFile -Value $LogMessage
}

try {
    Write-Log "Starting backup process"
    
    # Maak backup directory aan
    if (!(Test-Path $BackupPath)) {
        New-Item -ItemType Directory -Force -Path $BackupPath
        Write-Log "Created backup directory: $BackupPath"
    }

    # Database backup
    Write-Log "Creating database backup..."
    $DBBackupFile = "$BackupPath\db_backup_$Date.sql"
    
    # Controleer of pg_dump bestaat
    $PgDumpPath = "$PostgreSQLPath\pg_dump.exe"
    if (!(Test-Path $PgDumpPath)) {
        throw "pg_dump.exe not found at $PgDumpPath"
    }

    # Voer database backup uit
    $env:PGPASSWORD = $env:PGPASSWORD
    & $PgDumpPath -h localhost -U $DBUser -f $DBBackupFile $DBName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Database backup successful: $DBBackupFile"
        
        # Comprimeer database backup
        $CompressedFile = "$DBBackupFile.zip"
        Compress-Archive -Path $DBBackupFile -DestinationPath $CompressedFile -Force
        Remove-Item $DBBackupFile
        Write-Log "Database backup compressed: $CompressedFile"
    } else {
        throw "Database backup failed with exit code: $LASTEXITCODE"
    }

    # Code backup (optioneel)
    Write-Log "Creating code backup..."
    $ProjectPath = Split-Path -Parent $PSScriptRoot
    $CodeBackupFile = "$BackupPath\code_backup_$Date.zip"
    
    # Excludes voor code backup
    $ExcludeItems = @("node_modules", ".git", "logs", "dist", ".env", "*.log")
    
    # Temporary directory voor gefilterde bestanden
    $TempDir = "$env:TEMP\ambulance-backup-$Date"
    New-Item -ItemType Directory -Force -Path $TempDir
    
    # Kopieer bestanden (exclusief uitgesloten items)
    Get-ChildItem -Path $ProjectPath -Recurse | Where-Object {
        $relativePath = $_.FullName.Substring($ProjectPath.Length + 1)
        $exclude = $false
        foreach ($pattern in $ExcludeItems) {
            if ($relativePath -like "*$pattern*") {
                $exclude = $true
                break
            }
        }
        return !$exclude
    } | ForEach-Object {
        $destPath = $_.FullName.Replace($ProjectPath, $TempDir)
        $destDir = Split-Path -Parent $destPath
        if (!(Test-Path $destDir)) {
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
        }
        if (!$_.PSIsContainer) {
            Copy-Item $_.FullName $destPath
        }
    }
    
    # Comprimeer code backup
    Compress-Archive -Path "$TempDir\*" -DestinationPath $CodeBackupFile -Force
    Remove-Item -Recurse -Force $TempDir
    Write-Log "Code backup successful: $CodeBackupFile"

    # Oude backups opruimen (behoud 7 dagen)
    Write-Log "Cleaning up old backups..."
    $CutoffDate = (Get-Date).AddDays(-7)
    
    Get-ChildItem $BackupPath -Filter "db_backup_*.zip" | Where-Object {
        $_.CreationTime -lt $CutoffDate
    } | ForEach-Object {
        Remove-Item $_.FullName
        Write-Log "Removed old backup: $($_.Name)"
    }
    
    Get-ChildItem $BackupPath -Filter "code_backup_*.zip" | Where-Object {
        $_.CreationTime -lt $CutoffDate
    } | ForEach-Object {
        Remove-Item $_.FullName
        Write-Log "Removed old backup: $($_.Name)"
    }

    # Backup statistieken
    $BackupSize = (Get-ChildItem $BackupPath -Recurse | Measure-Object -Property Length -Sum).Sum
    $BackupSizeMB = [math]::Round($BackupSize / 1MB, 2)
    Write-Log "Backup directory size: $BackupSizeMB MB"
    
    $BackupCount = (Get-ChildItem $BackupPath -Filter "*.zip").Count
    Write-Log "Total backups available: $BackupCount"
    
    Write-Log "Backup process completed successfully"
    
} catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    Write-Error $_.Exception.Message
    exit 1
}

# Resultaat weergeven
Write-Host ""
Write-Host "=== Backup Summary ===" -ForegroundColor Green
Write-Host "Backup location: $BackupPath" -ForegroundColor Yellow
Write-Host "Database backup: db_backup_$Date.sql.zip" -ForegroundColor Yellow
Write-Host "Code backup: code_backup_$Date.zip" -ForegroundColor Yellow
Write-Host "Log file: backup_log_$Date.txt" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Green