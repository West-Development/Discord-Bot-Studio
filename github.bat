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

:: Initialize git repo if it hasn't been initialized yet
if not exist ".git" (
  git init
  git branch -M main
  git remote add origin %REPO_URL%
) else (
  git remote remove origin >nul 2>&1
  git remote add origin %REPO_URL%
)

:: Remove Projects or dist from git tracking if they were ever cached before
git rm -rf --cached Projects >nul 2>&1
git rm -rf --cached dist >nul 2>&1
git rm -rf --cached node_modules >nul 2>&1
git rm -rf --cached Base/node_modules >nul 2>&1

:: Ask for a commit message
set /p MSG="Enter commit message (press Enter for default): "
if "%MSG%"=="" set MSG=Update Discord Bot Studio source code

echo.
echo Staging files...
git add .

echo Committing changes...
git commit -m "%MSG%"

echo Syncing with GitHub (main)...
git pull origin main --allow-unrelated-histories --no-edit >nul 2>&1

echo Pushing to GitHub (main)...
git push -u origin main

echo.
echo ============================================
echo   Done! Check %REPO_URL%
echo ============================================
pause
