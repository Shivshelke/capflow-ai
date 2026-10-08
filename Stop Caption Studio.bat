@echo off
title Stop Caption Studio
echo.
echo   Stopping Caption Studio...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8756" ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>&1
echo   Stopped.
timeout /t 2 /nobreak >nul
