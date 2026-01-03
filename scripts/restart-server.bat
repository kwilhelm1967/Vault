@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0restart-server.ps1" %*
