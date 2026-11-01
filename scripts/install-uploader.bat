@echo off
rem Registers the island-upload:// URL protocol for the CURRENT USER only (HKCU, no admin needed).
rem Clicking "upload" on the website then opens a terminal running scripts\upload.ps1.
rem The command ignores any arguments sent by web pages, so a page cannot pass files or paths.
set "PS1=%~dp0upload.ps1"
reg add "HKCU\Software\Classes\island-upload" /ve /d "URL:Island Upload" /f >nul
reg add "HKCU\Software\Classes\island-upload" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\island-upload\shell\open\command" /ve /d "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"%PS1%\"" /f >nul
echo Installed. Visit the site once with ?owner then use the Upload button in the drive panel.
echo To remove: run uninstall-uploader.bat
pause
