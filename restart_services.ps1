# Restart Services Script for PeiApp

function Stop-ProcessByName {
    param([string]$name)
    $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
    if ($procs) {
        Write-Host "Stopping $name..."
        Stop-Process -Name $name -Force
    }
}

# 1. Kill existing processes (optional but recommended for 'restart')
Stop-ProcessByName "node"
Stop-ProcessByName "npm"

# 2. Start Server
Write-Host "Starting Server..."
Start-Process cmd -ArgumentList "/c npm run start:dev" -WorkingDirectory "c:\trabajos\test\test13\server" -WindowStyle Hidden

# 3. Start Notification Service
Write-Host "Starting Notification Service..."
Start-Process cmd -ArgumentList "/c npm start" -WorkingDirectory "c:\trabajos\test\test13\notification-service" -WindowStyle Hidden

# 4. Start WSS Server
Write-Host "Starting WSS Server..."
Start-Process cmd -ArgumentList "/c npm run start:dev" -WorkingDirectory "c:\trabajos\test\test13\wss-server" -WindowStyle Hidden

# 5. Start Ticket Web
Write-Host "Starting Ticket Web..."
Start-Process cmd -ArgumentList "/c npm run dev" -WorkingDirectory "c:\trabajos\test\test13\ticket-web" -WindowStyle Hidden

# 6. Start Expo App
Write-Host "Starting Expo App..."
Start-Process cmd -ArgumentList "/c npx expo start" -WorkingDirectory "c:\trabajos\test\test13\app" -WindowStyle Hidden

Write-Host "All services started in background."
