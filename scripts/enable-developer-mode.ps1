# Enable Windows Developer Mode
# This script must be run as Administrator
# Developer Mode allows creation of symbolic links without elevated privileges

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Enable Windows Developer Mode" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERROR] This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "3. Navigate to project directory" -ForegroundColor White
    Write-Host "4. Run: .\scripts\enable-developer-mode.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "[INFO] Running as Administrator - OK" -ForegroundColor Green
Write-Host ""

# Registry path for Developer Mode
$regPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock"
$regName = "AllowDevelopmentWithoutDevLicense"
$regValue = 1

# Check if registry path exists
if (-not (Test-Path $regPath)) {
    Write-Host "[INFO] Creating registry path..." -ForegroundColor Yellow
    New-Item -Path $regPath -Force | Out-Null
}

# Check current value
$currentValue = Get-ItemProperty -Path $regPath -Name $regName -ErrorAction SilentlyContinue

if ($currentValue -and $currentValue.$regName -eq $regValue) {
    Write-Host "[SUCCESS] Developer Mode is already enabled!" -ForegroundColor Green
    Write-Host "  Registry value: $regName = $regValue" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run: npm run dist:win" -ForegroundColor Cyan
    exit 0
}

Write-Host "[INFO] Enabling Developer Mode..." -ForegroundColor Yellow
Write-Host "  Setting registry: $regPath\$regName = $regValue" -ForegroundColor White

# Set registry value
Set-ItemProperty -Path $regPath -Name $regName -Value $regValue -Type DWord

# Verify
$verify = Get-ItemProperty -Path $regPath -Name $regName -ErrorAction SilentlyContinue

if ($verify -and $verify.$regName -eq $regValue) {
    Write-Host ""
    Write-Host "[SUCCESS] Developer Mode enabled successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Close and reopen your terminal/PowerShell" -ForegroundColor White
    Write-Host "2. Run: npm run dist:win" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: You may need to restart your terminal for changes to take effect." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "[ERROR] Failed to enable Developer Mode" -ForegroundColor Red
    Write-Host "Please try enabling it manually:" -ForegroundColor Yellow
    Write-Host "1. Open Windows Settings (Win + I)" -ForegroundColor White
    Write-Host "2. Go to Privacy & Security > For developers" -ForegroundColor White
    Write-Host "3. Turn ON 'Developer Mode'" -ForegroundColor White
    exit 1
}
