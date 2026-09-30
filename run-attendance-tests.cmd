@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-attendance-tests.ps1" %*
exit /b %ERRORLEVEL%
