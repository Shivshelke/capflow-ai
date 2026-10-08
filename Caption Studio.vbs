' Starts Caption Studio with no console window, then opens the browser.
' Double-click this. To stop it, run "Stop Caption Studio.bat".
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)

If Not fso.FileExists(here & "\.venv\Scripts\pythonw.exe") Then
  MsgBox "Caption Studio is not installed yet." & vbCrLf & vbCrLf & _
         "Please run SETUP.bat first.", 48, "Caption Studio"
  sh.Run """" & here & "\SETUP.bat""", 1, False
  WScript.Quit
End If

' already running? just open the browser
Set http = CreateObject("MSXML2.XMLHTTP")
On Error Resume Next
http.open "GET", "http://localhost:8756/api/ping", False
http.send
alreadyUp = (Err.Number = 0 And http.status = 200)
On Error Goto 0

If Not alreadyUp Then
  sh.CurrentDirectory = here
  sh.Run """" & here & "\.venv\Scripts\pythonw.exe"" server.py", 0, False
  WScript.Sleep 6000
End If

sh.Run "http://localhost:8756", 1, False
