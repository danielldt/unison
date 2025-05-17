@echo off
echo Creating CSS directory structure...
mkdir src\client\dist\assets 2>NUL
echo Copying CSS...
copy src\client\public\main.css src\client\dist\assets\index.css
echo CSS fix complete.
echo.
echo Now stop and restart your Docker container with:
echo docker-compose down
echo docker-compose build
echo docker-compose up -d
pause 