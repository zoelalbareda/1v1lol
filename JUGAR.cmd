@echo off
cd /d "%~dp0"
curl --silent --max-time 2 http://localhost:3000/ >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:3000"
  exit /b 0
)
where node >nul 2>nul
if %errorlevel%==0 (
  set "GAME_NODE=node"
) else (
  set "GAME_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)
if not exist "%GAME_NODE%" if /i not "%GAME_NODE%"=="node" (
  echo Necesitas Node.js 18 o superior para ejecutar el servidor.
  pause
  exit /b 1
)
start "" "http://localhost:3000"
"%GAME_NODE%" server.js
pause
