# Kill processes running on port 3005 and background Node.js processes for podBoardGame
Write-Host "Stopping processes on port 3005..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3005 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "Stopping background Node.js processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Done! All project processes terminated successfully." -ForegroundColor Green
