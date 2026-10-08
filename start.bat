@echo off
cd /d "%~dp0"
title Caption Studio
if not exist ".venv\Scripts\python.exe" (
  echo.
  echo   Caption Studio is not set up yet.
  echo   Double-click SETUP.bat first.
  echo.
  pause
  exit /b 1
)
echo.
echo   Caption Studio  --  http://localhost:8756
echo.
echo   This window shows the log. To run it WITHOUT a window,
echo   use "Caption Studio.vbs" instead.
echo.
start "" cmd /c "timeout /t 6 /nobreak >nul & start "" http://localhost:8756"

:run
".venv\Scripts\python.exe" server.py
if errorlevel 3 (
  echo.
  echo   Another copy is already running - nothing to do.
  timeout /t 4 /nobreak >nul
  exit /b
)
echo.
echo   Server stopped - restarting in 3s. Close this window to quit for good.
timeout /t 3 /nobreak >nul
goto run
