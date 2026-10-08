"""
render.py  —  words JSON + style  ->  captioned MP4 (burned in, ffmpeg/libass)

  python render.py clip.mp4 clip.words.json --style clean --out out.mp4

styles: clean | word | highlight | pop
opts:   --font Montserrat  --size 4.6  --color FFFFFF  --accent E8531D  --outline 4  --posy 47
"""
import argparse, json, subprocess, sys
from pathlib import Path

FONTS_DIR = Path(__file__).parent / "fonts"

def bgr(hexrgb: str) -> str:
    h = hexrgb.lstrip("#")
    return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}".upper()

def probe_size(video: Path):
    j = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height:stream_side_data=rotation",
         "-of", "json", str(video)],
        check=True, capture_output=True, text=True).stdout)
    s = j["streams"][0]
    w, h = int(s["width"]), int(s["height"])
    rot = 0
    for sd in s.get("side_data_list", []):
        if "rotation" in sd:
            rot = abs(int(sd["rotation"])) % 180
    return (h, w) if rot == 90 else (w, h)

def ass_ts(s: float) -> str:
    s = max(s, 0.0)
    h, s = divmod(s, 3600); m, s = divmod(s, 60)
    return f"{int(h)}:{int(m):02}:{s:05.2f}"

def group_lines(words, max_chars=24, max_gap=0.55, max_dur=2.6):
    lines, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        text = " ".join(x["text"] for x in cur)
        gap = (words[i + 1]["start"] - w["end"]) if i + 1 < len(words) else 99
        if (w["text"].strip()[-1:] in ".,?!…"
                or len(text) >= max_chars
                or (w["end"] - cur[0]["start"]) >= max_dur
                or gap >= max_gap):
            lines.append(cur); cur = []
    if cur:
        lines.append(cur)
    return lines

def build_ass(words, w, h, o):
    fs = round(h * (o.size / 100) * (1.15 if o.style == "word" else 1.0))
    outline = max(0, round(fs * o.outline / 60))
    marginv = round(h * (100 - o.posy) / 100) - fs  # posy = % from TOP of the line
    prim, out_c, acc = bgr(o.color), bgr("000000"), bgr(o.accent)

    head = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {w}\nPlayResY: {h}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Cap,{o.font},{fs},{prim},{acc},{out_c},&H64000000,-1,0,0,0,100,100,0.4,0,1,"
        f"{outline},2,2,{round(w*0.06)},{round(w*0.06)},{max(marginv,10)},1\n\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )

    def line(a, b, text, tags=""):
        return f"Dialogue: 0,{ass_ts(a)},{ass_ts(b)},Cap,,0,0,0,,{{{tags}}}{text}\n"

    body = ""
    if o.style == "word":
        for wd in words:
            body += line(wd["start"], wd["end"] + 0.05, wd["text"], r"\fad(50,50)")
        return head + body

    for ln in group_lines(words):
        s, e = ln[0]["start"], ln[-1]["end"] + 0.18
        if o.style == "highlight":
            parts = []
            for wd in ln:
                cs = max(2, round((wd["end"] - wd["start"]) * 100))
                parts.append(rf"{{\kf{cs}}}{wd['text']}")
            body += line(s, e, " ".join(parts), rf"\fad(70,70)\1c{prim}\2c{acc}")
        elif o.style == "pop":
            txt = " ".join(x["text"] for x in ln)
            body += line(s, e, txt, r"\fad(0,70)\fscx55\fscy55\t(0,110,\fscx100\fscy100)")
        else:  # clean
            txt = " ".join(x["text"] for x in ln)
            body += line(s, e, txt, r"\fad(60,60)")
    return head + body

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("words_json")
    ap.add_argument("--style", default="clean", choices=["clean", "word", "highlight", "pop"])
    ap.add_argument("--font", default="Montserrat")
    ap.add_argument("--size", type=float, default=4.6)
    ap.add_argument("--color", default="FFFFFF")
    ap.add_argument("--accent", default="E8531D")
    ap.add_argument("--outline", type=float, default=4)
    ap.add_argument("--posy", type=float, default=47)
    ap.add_argument("--out", default=None)
    o = ap.parse_args()

    video = Path(o.video)
    words = json.loads(Path(o.words_json).read_text(encoding="utf-8"))["words"]
    w, h = probe_size(video)
    ass = build_ass(words, w, h, o)
    ass_path = video.with_suffix(f".{o.style}.ass")
    ass_path.write_text(ass, encoding="utf-8")

    out = Path(o.out) if o.out else video.with_name(f"{video.stem}_{o.style}.mp4")
    out = out.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    # ffmpeg's subtitles filter chokes on Windows drive-colons; run from a base dir
    # and pass every path relative + forward-slashed.
    base = Path(__file__).parent.resolve()
    rel = lambda p: Path(p).resolve().relative_to(base).as_posix()
    vf = f"subtitles={rel(ass_path)}"
    if FONTS_DIR.exists():
        vf += f":fontsdir={rel(FONTS_DIR)}"
    r = subprocess.run(
        ["ffmpeg", "-y", "-i", str(Path(video).resolve()), "-vf", vf,
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
         "-c:a", "copy", "-movflags", "+faststart", str(out)],
        capture_output=True, text=True, cwd=str(base))
    if r.returncode != 0:
        sys.stderr.write(r.stderr[-1500:])
        sys.exit(1)
    print(f"-> {out}", file=sys.stderr)

if __name__ == "__main__":
    main()
