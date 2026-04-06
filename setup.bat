@echo off
ECHO ========================================
ECHO  Brightleaf Academy - Quick Setup Script
ECHO ========================================
ECHO.

ECHO [1/5] Checking prerequisites...
WHERE node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR: Node.js is not installed!
    ECHO Please install Node.js from https://nodejs.org
    PAUSE
    EXIT /B 1
)

WHERE mysql >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO WARNING: MySQL command line not found in PATH.
    ECHO Please use MySQL Workbench to import database.sql
    ECHO.
)

ECHO ✅ Node.js found
ECHO.

ECHO [2/5] Installing Node.js dependencies...
CALL npm install
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR: Failed to install dependencies
    PAUSE
    EXIT /B 1
)
ECHO ✅ Dependencies installed
ECHO.

ECHO [3/5] Database Setup
ECHO ========================================
ECHO Please complete these steps manually:
ECHO.
ECHO 1. Open MySQL Workbench or MySQL Command Line
ECHO 2. Connect to MySQL Server
ECHO 3. Run this command:
ECHO.
ECHO     SOURCE E:\work\website\database.sql;
ECHO.
ECHO OR import the file:
ECHO     File -^> Open SQL Script
ECHO     Select: E:\work\website\database.sql
ECHO     Click lightning bolt to execute
ECHO.
ECHO 4. Verify database:
ECHO.
ECHO     SHOW DATABASES;
ECHO     USE brightleaf_academy;
ECHO     SHOW TABLES;
ECHO.
ECHO 5. (Optional) Update admin password:
ECHO.
ECHO     UPDATE admins SET password = 'admin123' WHERE username = 'admin';
ECHO.
PAUSE

ECHO.
ECHO [4/5] Configuration
ECHO ========================================
ECHO IMPORTANT: Update MySQL password in server.js
ECHO.
ECHO Location: E:\work\website\server.js (line ~39)
ECHO Change:
ECHO     password: '',
ECHO To:
ECHO     password: 'YOUR_MYSQL_PASSWORD',
ECHO.
ECHO Press any key after updating the password...
PAUSE >nul

ECHO.
ECHO [5/5] Starting Server
ECHO ========================================
ECHO.
CALL npm start
PAUSE