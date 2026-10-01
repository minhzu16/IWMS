# PowerShell PostgreSQL Backup & Disaster Recovery Script
param (
    [string]$DbName = "iwms",
    [string]$DbUser = "postgres",
    [string]$DbHost = "127.0.0.1",
    [int]$DbPort = 5432,
    [string]$BackupDir = "./backups"
)

$dateStr = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = "$BackupDir/${DbName}_backup_$dateStr.sql"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

Write-Host "[Backup] Bắt đầu sao lưu cơ sở dữ liệu $DbName lúc $(Get-Date)..." -ForegroundColor Cyan

& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -h $DbHost -p $DbPort -U $DbUser -d $DbName -F c -b -v -f $backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "[Backup] Sao lưu thành công: $backupFile" -ForegroundColor Green
    
    # Retention Policy: Giữ 7 bản gần nhất
    Get-ChildItem -Path $BackupDir -Filter "${DbName}_backup_*.sql" |
        Sort-Object CreationTime -Descending |
        Select-Object -Skip 7 |
        Remove-Item -Force
    Write-Host "[Backup] Đã dọn dẹp các bản sao lưu cũ vượt quá 7 ngày." -ForegroundColor Yellow
} else {
    Write-Host "[Backup] Sao lưu thất bại!" -ForegroundColor Red
}
