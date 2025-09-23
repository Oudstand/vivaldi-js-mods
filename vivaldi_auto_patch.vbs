' === JS\patch_silent.vbs ===
' Struktur:
' <root>\
'   JS\                  (hier liegen patch.bat & patch_silent.vbs)
'   Application\ <ver>\  (es gibt immer genau EINEN passenden <ver>-Ordner)
'     resources\vivaldi\window.html

Option Explicit

' ======= Einstellung =======
Const AutoStartVivaldi = False  ' False = kein Autostart bei vorhandenem Backup
' ===========================

Dim WshShell, FSO
Set WshShell = CreateObject("WScript.Shell")
Set FSO      = CreateObject("Scripting.FileSystemObject")

Dim jsFolder, rootFolder, appDir
jsFolder   = FSO.GetParentFolderName(WScript.ScriptFullName) ' ...\<root>\JS
rootFolder = FSO.GetParentFolderName(jsFolder)                ' ...\<root>
appDir     = rootFolder & "\Application"

If Not FSO.FolderExists(appDir) Then
  WshShell.Run """" & jsFolder & "\patch.bat""", 0, True
  WScript.Quit 0
End If

' --- Hilfsfunktionen ---
Function IsVersionName(name)
  Dim re: Set re = CreateObject("VBScript.RegExp")
  re.Pattern    = "^\d+(\.\d+)*$"
  re.IgnoreCase = True
  re.Global     = False
  IsVersionName = re.Test(name)
End Function

' --- Versionsordner finden ---
Dim folder, subf, versionDir
Set folder = FSO.GetFolder(appDir)
versionDir = ""

For Each subf In folder.SubFolders
  If IsVersionName(subf.Name) Then
    versionDir = subf.Path
    Exit For  ' es gibt nur einen Versionsordner
  End If
Next

If versionDir = "" Then
  ' Kein Versionsordner gefunden -> trotzdem Patch versuchen
  WshShell.Run """" & jsFolder & "\patch.bat""", 0, True
  WScript.Quit 0
End If

Dim resFolder, bakPath, exePath
resFolder = versionDir & "\resources\vivaldi"
bakPath   = resFolder & "\window.bak.html"

If Not FSO.FolderExists(resFolder) Then
  WshShell.Run """" & jsFolder & "\patch.bat""", 0, True
  WScript.Quit 0
End If

' --- Hauptlogik ---
If Not FSO.FileExists(bakPath) Then
  ' Kein Backup -> patchen
  WshShell.Run """" & jsFolder & "\patch.bat""", 0, True
Else
  ' Bereits gepatcht -> optional Vivaldi starten
  If AutoStartVivaldi Then
    ' 1) Bevorzugt Application\vivaldi.exe (Launcher)
    exePath = appDir & "\vivaldi.exe"
    If Not FSO.FileExists(exePath) Then
      ' 2) Fallback: vivaldi.exe direkt im Versionsordner
      exePath = versionDir & "\vivaldi.exe"
    End If
    If FSO.FileExists(exePath) Then
      WshShell.Run """" & exePath & """", 0, False
    End If
  End If
End If
