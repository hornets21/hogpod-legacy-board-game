@echo off
echo Stopping project processes (port 3005 & node)...
powershell -Command "Get-NetTCPConnection -LocalPort 3005 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"
echo Done! All project processes terminated.
pause
