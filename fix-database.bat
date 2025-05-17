@echo off
echo ===== Unison RPG Database Fix Tool =====
echo.
echo This script will:
echo 1. Stop running Docker containers
echo 2. Run database fixes
echo 3. Rebuild and restart the containers
echo.
echo Press Ctrl+C to cancel or any key to continue...
pause > nul

echo.
echo Stopping containers...
docker-compose down

echo.
echo Running database fix script...
node fix-database.js
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Database fix failed. Please check the errors above.
  pause
  exit /b 1
)

echo.
echo Rebuilding and starting containers...
docker-compose build --no-cache
docker-compose up -d

echo.
echo Process completed! The application should be running with the fixed database.
echo You can view logs with: docker-compose logs -f
echo.
pause 