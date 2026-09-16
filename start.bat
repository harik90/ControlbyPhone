@echo off
title PC REMOTE CONTROL SERVER
cls
echo ============================================================
echo      PC REMOTE CONTROL SERVER - ONE CLICK LAUNCHER
echo ============================================================
echo.
echo Starting unified server on Port 8000...
echo.
cd /d "%~dp0"
python server.py
pause
