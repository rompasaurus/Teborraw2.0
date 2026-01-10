@echo off
REM Teboraw Desktop App Launcher for Windows
REM Double-click this file to start the desktop app

title Teboraw Desktop
cd /d "%~dp0"

echo.
echo   Starting Teboraw Desktop...
echo.

python scripts\start-desktop.py %*

if errorlevel 1 (
    echo.
    echo   Failed to start. Make sure Python is installed.
    echo   Press any key to exit...
    pause >nul
)
Teboraw