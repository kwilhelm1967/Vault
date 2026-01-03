@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0verify-backend-health.ps1" %*
