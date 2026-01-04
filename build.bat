@echo off
echo ========================================
echo Building Barn Manager v1.0.9
echo ========================================
echo.

echo [1/3] Building web app...
call npm run build
if errorlevel 1 (
    echo ERROR: Web build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Syncing with Capacitor...
call npx cap sync
if errorlevel 1 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Building Android APK...
cd android
call gradlew assembleRelease
if errorlevel 1 (
    echo ERROR: Android build failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo BUILD SUCCESS!
echo ========================================
echo APK Location: android\app\build\outputs\apk\release\app-release.apk
echo.
pause
