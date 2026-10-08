$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root

Write-Host ""
Write-Host "  Caption Studio - first-time setup" -ForegroundColor Cyan
Write-Host "  Keep this window open. Downloads can take several minutes." -ForegroundColor DarkGray
Write-Host ""

function Find-Python312 {
    try {
        $resolved = (& py -3.12 -c "import sys; print(sys.executable)" 2>$null | Select-Object -Last 1).Trim()
        if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $resolved)) { return $resolved }
    } catch {}

    $known = @(
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:ProgramFiles\Python312\python.exe"
    )
    foreach ($candidate in $known) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }

    $cmd = Get-Command python.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd -and $cmd.Source -notmatch "WindowsApps") {
        try {
            $version = & $cmd.Source -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
            if ($LASTEXITCODE -eq 0 -and $version -eq "3.12") { return $cmd.Source }
        } catch {}
    }
    return $null
}

function Find-Node {
    $cmd = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) { return $cmd.Source }
    $known = "$env:ProgramFiles\nodejs\node.exe"
    if (Test-Path -LiteralPath $known) { return $known }
    return $null
}

function Find-FFmpeg {
    $cmd = Get-Command ffmpeg.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) { return $cmd.Source }
    $base = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages"
    if (Test-Path -LiteralPath $base) {
        $hit = Get-ChildItem -LiteralPath $base -Directory -Filter "Gyan.FFmpeg*" -ErrorAction SilentlyContinue |
            ForEach-Object { Get-ChildItem -LiteralPath $_.FullName -Recurse -File -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue } |
            Select-Object -First 1
        if ($hit) { return $hit.FullName }
    }
    return $null
}

function Require-Winget {
    if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
        throw "Windows Package Manager (winget) is missing. Install 'App Installer' from Microsoft Store, then run SETUP.bat again."
    }
}

$python = Find-Python312
if (-not $python) {
    Require-Winget
    Write-Host "Installing Python 3.12..." -ForegroundColor Yellow
    & winget install --exact --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { throw "Python installation failed (exit $LASTEXITCODE)." }
    $python = Find-Python312
    if (-not $python) { throw "Python installed but was not found. Restart Windows and run SETUP.bat again." }
}

$node = Find-Node
if (-not $node) {
    Require-Winget
    Write-Host "Installing Node.js LTS..." -ForegroundColor Yellow
    & winget install --exact --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { throw "Node.js installation failed (exit $LASTEXITCODE)." }
    $node = Find-Node
    if (-not $node) { throw "Node.js installed but was not found. Restart Windows and run SETUP.bat again." }
}

$ffmpeg = Find-FFmpeg
if (-not $ffmpeg) {
    Require-Winget
    Write-Host "Installing FFmpeg..." -ForegroundColor Yellow
    & winget install --exact --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { throw "FFmpeg installation failed (exit $LASTEXITCODE)." }
    $ffmpeg = Find-FFmpeg
    if (-not $ffmpeg) { throw "FFmpeg installed but was not found. Restart Windows and run SETUP.bat again." }
}

$nodeDir = Split-Path -Parent $node
$ffmpegDir = Split-Path -Parent $ffmpeg
Set-Content -LiteralPath (Join-Path $root "runtime-path.txt") -Value ($nodeDir + ";" + $ffmpegDir) -Encoding UTF8
$env:PATH = $nodeDir + ";" + $ffmpegDir + ";" + $env:PATH

$venv = Join-Path $root ".venv"
$venvPython = Join-Path $venv "Scripts\python.exe"
if (Test-Path -LiteralPath $venvPython) {
    & $venvPython --version *> $null
    if ($LASTEXITCODE -ne 0) {
        Remove-Item -LiteralPath $venv -Recurse -Force
    }
}
if (-not (Test-Path -LiteralPath $venvPython)) {
    Write-Host "Creating the local Python environment..." -ForegroundColor Yellow
    & $python -m venv $venv
    if ($LASTEXITCODE -ne 0) { throw "Could not create the Python environment." }
}

Write-Host "Installing transcription components..." -ForegroundColor Yellow
& $venvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw "pip upgrade failed." }
& $venvPython -m pip install -r (Join-Path $root "requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Python package installation failed." }

$npm = Join-Path $nodeDir "npm.cmd"
if (-not (Test-Path -LiteralPath $npm)) { throw "npm.cmd was not found next to Node.js." }
Write-Host "Installing video-rendering components..." -ForegroundColor Yellow
Push-Location (Join-Path $root "remotion")
try {
    & $npm ci
    if ($LASTEXITCODE -ne 0) { throw "Node package installation failed." }
    & $node (Join-Path $root "remotion\build.mjs")
    if ($LASTEXITCODE -ne 0) { throw "Player build failed." }
} finally {
    Pop-Location
}

Set-Content -LiteralPath (Join-Path $root ".setup-complete") -Value (Get-Date -Format "yyyy-MM-dd HH:mm:ss") -Encoding ASCII
Write-Host ""
Write-Host "  Setup complete." -ForegroundColor Green
Write-Host "  Double-click 'Caption Studio.vbs' to start." -ForegroundColor Green
Write-Host "  The first transcription may download a speech model." -ForegroundColor DarkGray
