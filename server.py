"""
Caption Studio — local web app.  Run:  start.bat   (or  .venv\\Scripts\\python.exe server.py)
Open  http://localhost:8756
"""
import asyncio, json, os, re, subprocess, sys, uuid, shutil, time
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, UploadFile, Form, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).parent
WORK = ROOT / "work"; WORK.mkdir(exist_ok=True)
STATIC = ROOT / "static"; STATIC.mkdir(exist_ok=True)
REMOTION = ROOT / "remotion"
PUBLIC = REMOTION / "public"; PUBLIC.mkdir(exist_ok=True)
if (ROOT / ".venv" / "Scripts" / "python.exe").is_file():
    PY = str(ROOT / ".venv" / "Scripts" / "python.exe")
elif (ROOT / ".venv" / "bin" / "python").is_file():
    PY = str(ROOT / ".venv" / "bin" / "python")
else:
    PY = sys.executable
# setup.ps1 records tool folders here so the app still works immediately after
# installing Node/ffmpeg, without asking the user to restart Windows.
RUNTIME_PATH = ROOT / "runtime-path.txt"
if RUNTIME_PATH.is_file():
    paths = [p.strip().lstrip("\ufeff") for p in RUNTIME_PATH.read_text(encoding="utf-8").split(";") if p.strip()]
    os.environ["PATH"] = os.pathsep.join(paths + [os.environ.get("PATH", "")])
NODE = shutil.which("node") or "node"
ENV = {**os.environ, "PYTHONIOENCODING": "utf-8", "HF_HUB_DISABLE_SYMLINKS_WARNING": "1"}

PORT = 8756
HEX12 = re.compile(r"^[0-9a-f]{12}$")
SAFE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$")
# templates live in remotion/src/templates.js — the renderer falls back to
# "clean" for anything it doesn't know, so we only need the id to be safe to
# put in a filename.
TEMPLATE_ID = re.compile(r"^[a-z][a-z0-9]{1,23}$")
LANG_CODE = re.compile(r"^[a-z]{2,3}(-[a-z]{2})?$")   # en, hi, gu, yue, hi-en …
TRANSITIONS = {"none", "fade", "pop", "zoom", "scale", "slide-left", "slide-up"}
# Only this machine may drive the app. Matching on the HOST (not an exact
# "http://localhost:8756" string) means any local spelling works — localhost,
# 127.0.0.1, [::1], a different port — while a real cross-site page, which
# always sends its own public origin, is still blocked.
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "[::1]"}
MAX_UPLOAD = 2 * 1024 * 1024 * 1024   # 2 GB — 4K reels off a phone are big

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")


def is_local_origin(origin: str) -> bool:
    try:
        host = urlparse(origin).hostname or ""
        return host in LOCAL_HOSTS or host.endswith(".netlify.app") or host.startswith("192.168.") or host.startswith("10.") or host.startswith("172.")
    except ValueError:
        return True



# ---------- helpers ----------
def job_dir(job: str) -> Path:
    if not HEX12.match(job or ""):
        raise HTTPException(400, "bad job id")
    d = WORK / job
    if not d.is_dir():
        raise HTTPException(404, "unknown job — re-upload")
    return d


def num(v, lo, hi, default):
    try:
        return max(lo, min(hi, float(v)))
    except (TypeError, ValueError):
        return default


def probe(video: Path):
    j = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height:stream_side_data=rotation:format=duration",
         "-of", "json", str(video)],
        capture_output=True, text=True).stdout)
    s = j["streams"][0]
    w, h = int(s["width"]), int(s["height"])
    rot = 0
    for sd in s.get("side_data_list", []):
        if "rotation" in sd:
            rot = abs(int(sd["rotation"])) % 180
    if rot == 90:
        w, h = h, w
    dur = float(j["format"]["duration"])
    if w > 1080:
        h = round(h * 1080 / w); h += h % 2; w = 1080
    return w, h, dur


def sweep_old(hours=24):
    cutoff = time.time() - hours * 3600
    for d in WORK.glob("*"):
        try:
            if d.is_dir() and d.stat().st_mtime < cutoff:
                shutil.rmtree(d, ignore_errors=True)
                (PUBLIC / f"{d.name}.mp4").unlink(missing_ok=True)
                (REMOTION / ".bundle" / "public" / f"{d.name}.mp4").unlink(missing_ok=True)
        except OSError:
            pass


# ---------- routes ----------
@app.get("/")
def index():
    return HTMLResponse((ROOT / "index.html").read_text(encoding="utf-8"))


@app.get("/api/ping")
def ping():
    return {"ok": True}


def set_progress(job: Path, stage: str, pct: int):
    try:
        (job / "progress.json").write_text(json.dumps({"stage": stage, "pct": pct}), encoding="utf-8")
    except OSError:
        pass


@app.get("/api/progress/{job}")
def progress(job: str):
    if not HEX12.match(job or ""):
        raise HTTPException(400, "bad job id")
    f = WORK / job / "progress.json"
    if f.is_file():
        try:
            return json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"stage": "starting", "pct": 0}


def transcode_1080(src: Path, dst: Path, w: int, h: int, dur: float, job: Path):
    """ffmpeg downscale, reporting real progress (this is the slow step for 4K clips)."""
    p = subprocess.Popen(
        ["ffmpeg", "-y", "-i", str(src),
         "-vf", f"scale={w}:{h}:flags=bicubic,format=yuv420p",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
         "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
         "-progress", "pipe:1", "-nostats", str(dst)],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    for line in p.stdout or []:
        if line.startswith("out_time_ms=") and dur > 0:
            try:
                done = int(line.split("=", 1)[1]) / 1_000_000
                set_progress(job, "processing video", 12 + int(76 * min(1.0, done / dur)))
            except ValueError:
                pass
    p.wait()
    return p.returncode == 0 and dst.exists()


@app.post("/api/transcribe")
async def transcribe(video: UploadFile, script: str = Form(""), job: str = Form(""),
                     lang: str = Form(""), roman: str = Form("auto")):
    sweep_old()
    name = job if HEX12.match(job or "") and not (WORK / job).exists() else uuid.uuid4().hex[:12]
    jd = WORK / name
    jd.mkdir()
    set_progress(jd, "uploading", 2)

    suffix = Path(video.filename or "v.mp4").suffix.lower()
    if suffix not in {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}:
        suffix = ".mp4"
    vpath = jd / ("src" + suffix)
    size = 0
    with open(vpath, "wb") as f:
        while chunk := await video.read(1 << 20):
            size += len(chunk)
            if size > MAX_UPLOAD:
                f.close(); shutil.rmtree(jd, ignore_errors=True)
                return JSONResponse({"error": "file too large (max 2 GB)"}, 413)
            f.write(chunk)

    set_progress(jd, "aligning captions" if script.strip() else "transcribing", 8)
    cmd = [PY, str(ROOT / "transcribe.py"), str(vpath)]
    if script.strip():
        sp = jd / "script.txt"; sp.write_text(script[:20000], encoding="utf-8")
        cmd += ["--script", str(sp)]
    # "hi-en" is the UI's Hinglish shortcut; the rest are plain Whisper codes.
    if LANG_CODE.match(lang or ""):
        cmd += ["--lang", lang]
    if roman in {"0", "1", "auto"}:
        cmd += ["--roman", roman]
    r = await asyncio.to_thread(subprocess.run, cmd, capture_output=True, text=True, env=ENV)
    wj = vpath.with_suffix(".words.json")
    if r.returncode != 0 or not wj.exists():
        return JSONResponse({"error": r.stderr[-2500:] or "transcription failed"}, status_code=500)

    w, h, dur = await asyncio.to_thread(probe, vpath)
    set_progress(jd, "processing video", 12)
    staged = PUBLIC / f"{name}.mp4"
    ok = await asyncio.to_thread(transcode_1080, vpath, staged, w, h, dur, jd)
    if not ok:
        shutil.copy(vpath, staged)
    words = json.loads(wj.read_text(encoding="utf-8"))["words"]

    set_progress(jd, "done", 100)
    return {
        "job": name, "words": words,
        "video_url": f"/api/file/{name}/{vpath.name}",
        "width": w, "height": h, "duration": dur,
    }


@app.get("/api/file/{job}/{name}")
def file(job: str, name: str):
    d = job_dir(job)
    if not SAFE_NAME.match(name):
        raise HTTPException(400, "bad name")
    p = (d / name).resolve()
    if d.resolve() not in p.parents:                 # never escape the job dir
        raise HTTPException(400, "bad path")
    if p.is_file():
        return FileResponse(p)
    if name.startswith("src"):
        alt = PUBLIC / f"{job}.mp4"
        if alt.is_file():
            return FileResponse(alt)
    raise HTTPException(404, "gone")


@app.get("/api/render-progress/{job}")
def render_progress(job: str):
    if not HEX12.match(job or ""):
        raise HTTPException(400, "bad job id")
    f = WORK / job / "render.json"
    if f.is_file():
        try:
            return json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"stage": "starting", "pct": 0}


@app.post("/api/realign")
async def realign(job: str = Form(...), words: str = Form(...)):
    """Re-run forced alignment against the audio using the CURRENT word text.

    Editing or replacing words leaves the old timings behind, so the captions
    drift off the lips. This maps the new text back onto the actual speech —
    the same alignment the script path uses, so it is genuinely in sync, not
    an estimate spread across the line.
    """
    jd = job_dir(job)
    try:
        wl = json.loads(words)
        assert isinstance(wl, list) and 0 < len(wl) < 4000
    except Exception:
        return JSONResponse({"error": "bad words"}, 400)

    text = " ".join(str(w.get("text", "")).strip() for w in wl).strip()
    if not text:
        return JSONResponse({"error": "nothing to align"}, 400)

    src = next(jd.glob("src.*"))
    sp = jd / "script.txt"
    sp.write_text(text[:20000], encoding="utf-8")
    set_progress(jd, "syncing to audio", 30)

    r = await asyncio.to_thread(
        subprocess.run, [PY, str(ROOT / "transcribe.py"), str(src), "--script", str(sp)],
        capture_output=True, text=True, env=ENV)
    wj = src.with_suffix(".words.json")
    if r.returncode != 0 or not wj.exists():
        return JSONResponse({"error": (r.stderr or "align failed")[-2000:]}, status_code=500)

    set_progress(jd, "done", 100)
    return {"words": json.loads(wj.read_text(encoding="utf-8"))["words"]}


@app.post("/api/render")
async def render(job: str = Form(...), words: str = Form(...), template: str = Form("clean"),
                 font: str = Form("Montserrat"), size: str = Form("4.8"),
                 color: str = Form("#FFFFFF"), accent: str = Form("#E8531D"),
                 outline: str = Form("5"), posy: str = Form("46"),
                 uppercase: str = Form("false"), maxchars: str = Form("22"),
                 oneword: str = Form("false"), trkind: str = Form("fade"),
                 trscope: str = Form("line"), trdir: str = Form("out"),
                 outheight: str = Form("1080"), outquality: str = Form("high")):
    jd = job_dir(job)
    if not TEMPLATE_ID.match(template or ""):
        template = "clean"
    if trkind not in TRANSITIONS:
        trkind = "fade"
    if not re.match(r"^[A-Za-z0-9 ]{1,40}$", font or ""):
        font = "Montserrat"
    hexcol = lambda c, d: c if re.match(r"^#[0-9A-Fa-f]{6}$", c or "") else d
    try:
        wordlist = json.loads(words)
        assert isinstance(wordlist, list) and len(wordlist) < 4000
    except Exception:
        return JSONResponse({"error": "bad words payload"}, 400)

    src = next(jd.glob("src.*"))
    w, h, dur = await asyncio.to_thread(probe, src)

    # The staged 1080p copy is what Remotion actually renders. It can be gone —
    # swept after 24h, or wiped when the bundle was rebuilt — and without it the
    # render dies with an opaque "404 while downloading file". Re-stage it.
    staged = PUBLIC / f"{job}.mp4"
    if not staged.exists():
        if not await asyncio.to_thread(transcode_1080, src, staged, w, h, dur, jd):
            await asyncio.to_thread(shutil.copy, src, staged)
    props = {
        # bare filename -> Remotion staticFile; renderjob.mjs copies the staged
        # video into the bundle's served public/ dir before rendering.
        "src": f"{job}.mp4",
        "fps": 30, "width": w, "height": h,
        "durationInSeconds": dur, "words": wordlist, "template": template,
        "transition": {
            "kind": trkind,
            "scope": "word" if trscope == "word" else "line",
            "dir": "in" if trdir == "in" else "out",
        },
        "style": {
            "font": font, "fontSizePct": num(size, 1, 12, 4.8),
            "color": hexcol(color, "#FFFFFF"), "accent": hexcol(accent, "#E8531D"),
            "outline": num(outline, 0, 20, 5), "posYPct": num(posy, 5, 95, 46),
            "uppercase": uppercase == "true", "oneWord": oneword == "true",
            "maxCharsPerLine": int(num(maxchars, 6, 60, 22)),
        },
    }
    props["export"] = {
        "height": 720 if outheight == "720" else 1080,
        "crf": {"high": 18, "balanced": 22, "small": 27}.get(outquality, 20),
    }

    (jd / "render.json").unlink(missing_ok=True)   # clear the last run's progress
    pf = jd / "props.json"
    pf.write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
    out = jd / f"captioned_{template}.mp4"

    r = await asyncio.to_thread(
        subprocess.run,
        [NODE, str(REMOTION / "renderjob.mjs"), str(pf), str(out)],
        capture_output=True, text=True, cwd=str(REMOTION), env=ENV)
    if r.returncode != 0 or not out.exists():
        return JSONResponse({"error": (r.stderr or r.stdout)[-3000:]}, status_code=500)
    return {"url": f"/api/file/{job}/{out.name}"}


if __name__ == "__main__":
    import uvicorn, socket
    s = socket.socket()
    try:
        s.bind(("0.0.0.0", PORT)); s.close()
    except OSError:
        # Exit 3 = "already running", not a crash. start.bat checks for it and
        # stops, instead of restarting forever into the same port conflict.
        print(f"\n  CapFlow AI is already running.")
        print(f"  Open  http://localhost:{PORT}  in your browser.\n")
        raise SystemExit(3)
    print(f"\n  CapFlow AI is running.")
    print(f"  Open  http://localhost:{PORT}  in your browser.  (close this window to stop)\n")
    server = uvicorn.Server(uvicorn.Config(
        app, host="0.0.0.0", port=PORT, log_level="info", access_log=True))

    if sys.platform == "win32":
        # uvicorn builds its event loop from its own factory
        # (uvicorn.loops.asyncio.asyncio_loop_factory), which returns
        # ProactorEventLoop on Windows and IGNORES the event-loop policy -- so
        # asyncio.set_event_loop_policy() does nothing here. The proactor loop is
        # the one that dies with "WinError 64 / Accept failed" when a browser
        # abandons a video range request mid-transfer, so build the selector loop
        # ourselves and hand it to the server. Safe: every blocking call goes
        # through asyncio.to_thread, we never use asyncio subprocess.
        loop = asyncio.SelectorEventLoop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(server.serve())
        finally:
            loop.close()
    else:
        server.run()
