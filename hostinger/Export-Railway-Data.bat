@echo off
rem Railway (Postgres) ka poora data Hostinger/phpMyAdmin ke liye .sql files me nikaalta hai.
rem Isse project folder me chalao (jahan node_modules hai).
cd /d "%~dp0.."
echo.
echo  Railway ^> Postgres service ^> Variables ^> DATABASE_PUBLIC_URL copy karke yahan paste karo
echo  (postgresql://postgres:...@....proxy.rlwy.net:PORT/railway)
echo.
set /p DATABASE_URL=DATABASE_PUBLIC_URL:
if "%DATABASE_URL%"=="" (echo URL nahi diya. & pause & exit /b 1)
node tools\export-postgres-to-mysql.js "%CD%\export"
echo.
echo  Files "export" folder me hain. Inhe phpMyAdmin me leon-data-01.sql se shuru karke Import karo.
pause
