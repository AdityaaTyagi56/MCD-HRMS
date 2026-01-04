@echo off
REM ===========================================
REM MCD UNIFIED HRMS - Windows Start Script
REM ===========================================

echo.
echo MCD UNIFIED HRMS - Starting Setup...
echo =========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js 18+ from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER% detected

REM Install dependencies if needed
if not exist "node_modules" (
    echo.
    echo Installing Node.js dependencies...
    call npm install
    echo [OK] Dependencies installed
) else (
    echo [OK] node_modules already exists
)

REM Create .env.local if not exists
if not exist ".env.local" (
    echo.
    echo Creating .env.local...
    (
        echo API_KEY=hackathon-demo-key
        echo ALLOWED_ORIGINS=http://localhost:7001,http://localhost:7010,http://localhost:7002
        echo PORT=7010
    ) > .env.local
    echo [OK] .env.local created
)

REM Kill existing processes
echo.
echo Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :7001 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :7010 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul
echo [OK] Ports cleared

REM Start services
echo.
echo Starting services...
echo.

REM Start API server in new window
start "MCD API Server" cmd /c "npm run server"
timeout /t 2 >nul

REM Start frontend in new window  
start "MCD Frontend" cmd /c "npm run dev"
timeout /t 3 >nul

echo.
echo =========================================
echo MCD HRMS is running!
echo =========================================
echo.
echo   Frontend:    http://localhost:7001
echo   API Server:  http://localhost:7010
echo.
echo Close this window to stop the services
echo.

REM Open browser
start http://localhost:7001

pause
