CAPTION STUDIO - WINDOWS SETUP
==============================

This is a local captioning app for Windows 10/11.

FIRST TIME
----------
1. Extract the complete ZIP to a short path, for example:
     C:\CaptionStudio
   Do not run the app from inside the ZIP or from Google Drive preview.

2. Connect to the internet.

3. Double-click SETUP.bat.
   The setup checks or installs Python 3.12, Node.js LTS and FFmpeg, then
   downloads the local transcription and video-rendering components.
   Keep the setup window open until it says "Setup complete".

4. Double-click Caption Studio.vbs.
   The app opens at http://localhost:8756 in your browser.

EVERYDAY USE
------------
1. Drop a reel into the app.
2. Paste the exact spoken script whenever possible. This gives the cleanest
   words and the fastest transcription.
3. Choose Language and Roman/Native output.
4. Click Transcribe.
5. Correct any words, choose a template and transition, then Export MP4.

STOPPING THE APP
----------------
Double-click Stop Caption Studio.bat.

IMPORTANT
---------
- No account or API key is required.
- Transcription runs locally on your computer.
- The first transcription can be slower because the speech model downloads.
- Preview/export uses Google Fonts and may need internet access.
- Setup and models need several GB of free disk space.
- CPU transcription can take longer on older computers.
- Uploaded and rendered files are stored temporarily in this app folder.
  Old job files are cleaned when a later transcription starts.

TROUBLESHOOTING
---------------
- If setup says winget is missing, install "App Installer" from Microsoft Store.
- If a newly installed tool is not found, restart Windows and run SETUP.bat again.
- If localhost does not open, run start.bat to see the error log.
- If port 8756 is already in use, run Stop Caption Studio.bat, then start again.
- Keep the folder path short. Very long paths can cause Node installation errors.
