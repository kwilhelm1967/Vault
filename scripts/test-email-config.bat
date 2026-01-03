@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0test-email-config.ps1" %*
