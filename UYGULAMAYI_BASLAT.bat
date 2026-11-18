@echo off
cd /d "%~dp0"
title Matematik Akademi

echo ========================================================
echo          MATEMATIK AKADEMI YEREL CALISMA SISTEMI
echo ========================================================
echo.
echo Tarayiciniz aciliyor: http://localhost:3000/giris
echo.
echo Sistemi durdurmak icin bu siyah pencereyi kapatabilirsiniz.
echo ========================================================
echo.

start "" "http://localhost:3000/giris"

call npm.cmd run dev

pause
