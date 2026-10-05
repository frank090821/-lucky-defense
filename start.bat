@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

echo ========================================
echo       LUCKY DEFENSE WEB 18.0
echo ========================================
echo.
echo [1/2] 기존 LUCKY DEFENSE 서버 확인 중...

for /f "tokens=5" %%P in ('netstat -ano ^| findstr LISTENING ^| findstr ":3000 "') do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-Process -Id %%P -ErrorAction SilentlyContinue; if($p -and $p.ProcessName -eq 'node'){Stop-Process -Id %%P -Force}"
)

echo [2/2] 게임 서버 시작...
echo.
npm.cmd start
pause
