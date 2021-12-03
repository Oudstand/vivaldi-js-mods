:::::::::::::::::::::::::::::::::::::::::::
:: Script to copy over your Vivaldi mods ::
:: by Christoph142                       ::
:::::::::::::::::::::::::::::::::::::::::::



@echo off
setlocal enabledelayedexpansion

:: This is a list of your Vivaldi installations' Application folders (you can use the Vivaldi folder, too, but it takes longer to find the file):
set installPaths="D:\Vivaldi Snapshot\Application\" 

:: Don't alter anything below this point ;)



set nrOfInstalls=0
set "SuccessfulPatched=Couldn't Patch :^("

for %%i in (%installPaths%) do (
	<NUL set /p=Searching for newest browser.html in %%~dpi... 
	set /a nrOfInstalls=nrOfInstalls+1

	set installPath=%%~dpi
	set latestVersionFolder=

	for /f "tokens=*" %%a in ('dir /a:-d /b /s "!installPath!"') do (
		if "%%~nxa"=="browser.html" set latestVersionFolder=%%~dpa
	)

	if not defined latestVersionFolder (
		set cnt=any
		echo.
		echo Couldn't find it. :(
		echo Is !installPath! the correct Vivaldi Application folder?
		echo.
	) else (
		echo Found it.
		echo.

		if exist !latestVersionFolder!\browser.bak.html (
			echo Backup is already in place.
		) else (
			echo Creating a backup of your original browser.html file.
			copy /y "!latestVersionFolder!\browser.html" "!latestVersionFolder!\browser.bak.html"
		)
		echo.

findstr /v Compiled_User_JS.js "!latestVersionFolder!\browser.html" > temp0.txt





setlocal disabledelayedexpansion 

(
  FOR /F "tokens=*" %%A IN (temp0.txt) DO (
    ECHO %%A
    IF "%%A" EQU "<script src="bundle.js"></script>" (
      echo ^<script src="Compiled_User_JS.js"^>^</script^>
    )
  )
) >temp.txt

setlocal enabledelayedexpansion 



type *.js > !latestVersionFolder!\Compiled_User_JS.js
move /Y temp.txt "!latestVersionFolder!browser.html"
del temp0.txt
echo.
echo Copied files^^!


set cnt=0
for %%A in (*.js) do set /a cnt+=1
set "SuccessfulPatched=Succesfully Patched"




)
)
echo.
echo.
echo All done^^! :)   !SuccessfulPatched! !cnt! .js files^^!
echo.
echo.
timeout 3
exit