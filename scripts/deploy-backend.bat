@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0deploy-backend.ps1" %*
