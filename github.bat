@echo off
title Push Discord Bot Studio to GitHub
cd /d "%~dp0"

echo ============================================
echo   Uploading Discord Bot Studio to GitHub
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

:: Initialize git repo if it hasn't been initialized yet
if not exist ".git" (
  git init
  git branch -M main
  git remote add origin https://github.com
) else (
  git remote set-url origin https://github.com
)

:: Remove Projects or dist from git tracking if they were ever cached before
git rm -rf --cached Projects >nul 2>&1
git rm -rf --cached dist >nul 2>&1
git rm -rf --cached node_modules >nul 2>&1
git rm -rf --cached Base/node_modules >nul 2>&1

:: Ask for a commit message (defaults to a timestamped update if left blank)
set /p MSG="Enter commit message (press Enter for default): "
if "%MSG%"=="" set MSG=Update Discord Bot Studio source code

echo.
echo Staging files...
git add .

echo Committing changes...
git commit -m "%MSG%"

echo Pushing to GitHub (main)...
git push -u origin main

echo.
echo ============================================
echo   Done! Check your GitHub repository.
echo ============================================
pause
