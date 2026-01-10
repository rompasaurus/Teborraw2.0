@echo off
REM Clear ELECTRON_RUN_AS_NODE to ensure Electron runs properly
set ELECTRON_RUN_AS_NODE=
cd /d "%~dp0"
call npx electron-vite dev
