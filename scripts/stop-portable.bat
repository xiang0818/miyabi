@echo off
setlocal
chcp 65001 >nul

rem Stops the portable Miyabi build packaged next to this script. The
rem window-less miyabi.exe has no close button, so ending the process is the
rem only way to quit it.

set "STOPPED="
taskkill /F /IM miyabi.exe >nul 2>&1 && set "STOPPED=1"
taskkill /F /IM miyabi-console.exe >nul 2>&1 && set "STOPPED=1"

if defined STOPPED (
    echo Miyabi 已停止。
) else (
    echo 未发现运行中的 Miyabi。
)
pause
