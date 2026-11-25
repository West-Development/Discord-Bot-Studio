@echo off
title Push Discord Bot Studio to GitHub
cd /d "%~dp0"

set REPO_URL=https://github.com

echo ============================================
echo   Uploading Discord Bot Studio to GitHub
echo   Target: %REPO_URL%
echo   (Excluding Projects, dist, node_modules)
echo ============================================
echo.

:: Ensure .gitignore excludes personal Projects, build outputs, and node_modules
(
  echo node_modules/
  echo Base/node_modules/
  echo Projects/
  echo dist/
  echo .env
  echo Base/.env
  echo *.log
) > .gitignore

:: Initialize git repo if needed
if not exist ".git" (
  git init
  git branch -M main
)

:: Always reset origin to the exact .git URL
git remote remove origin >nul 2>&1
git remote add origin "%REPO_URL%"

:: Ensure Git user name & email are set locally so commit never fails
git config user.name >nul 2>&1 || git config user.name "WestDevs"
git config user.email >nul 2>&1 || git config user.email "westdevs@users.noreply.github.com"

:: Remove Projects or dist from git tracking if cached
git rm -rf --cached Projects >nul 2>&1
git rm -rf --cached dist >nul 2>&1
git rm -rf --cached node_modules >nul 2>&1
git rm -rf --cached Base/node_modules >nul 2>&1

:: Ask for a commit message
set /p MSG="Enter commit message (press Enter for default): "
if "%MSG%"=="" set MSG=Upload Discord Bot Studio source code

echo.
echo Staging files...
git add .

echo Committing changes...
git commit -m "%MSG%"

echo.
echo Pulling existing README and LICENSE from GitHub...
git pull origin main --allow-unrelated-histories --no-edit

echo.
echo Pushing to GitHub (main)...
git push -u origin main

echo.
echo ============================================
echo   Finished! Refresh your GitHub page.
echo ============================================
pause
