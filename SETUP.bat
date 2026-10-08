@echo off
cd /d "%~dp0"
title Caption Studio Setup
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
echo.
pause
