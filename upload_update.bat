@echo off
echo ===================================================
echo Uploading updates to GitHub...
echo ===================================================
git add .
set /p commitMsg="Enter commit message (or press enter for default): "
if "%commitMsg%"=="" set commitMsg="Automated update from development environment"
git commit -m "%commitMsg%"
git push origin main
echo.
echo ===================================================
echo Update uploaded successfully!
echo ===================================================
pause
