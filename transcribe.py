"""
transcribe.py  —  video -> word-level caption JSON

  WITH script (best, exact + Hinglish):  python transcribe.py clip.mp4 --script script.txt
  WITHOUT a script (rougher):            python transcribe.py clip.mp4

Writes  <name>.words.json  next to the video.
"""
import argparse, json, os, re, sys
from pathlib import Path
import av

_orig_av_open = av.open
def _patched_av_open(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _orig_av_open(*args, **kwargs)
av.open = _patched_av_open

# common Whisper (english-mode) mishears on Hinglish -> the spelling people expect
FIXES = {
    "yeh": "ye", "je": "ye", "kai": "ke", "kii": "ki",
    "leeye": "liye", "nahin": "nahi", "nai": "nahi",
    "puri": "poori", "pury": "poori", "poory": "poori",
    "hun": "hoon", "hu": "hoon", "hoo": "hoon",
    "karataa": "karta", "kartha": "karta",
    "chalaane": "chalane", "chalne": "chalane",
    "kontent": "content", "kauntent": "content",
    "skripts": "scripts", "skript": "script",
    "tul": "tool", "tool": "tool",
    "kod": "code", "yus": "use", "yooz": "use", "yuz": "use",
    "mein": "main", "ise": "isse",
    "yehi": "yahi", "banaate": "banate",
    "woh": "wo", "davabhlopar": "developers", "davalpar": "developer",
    "hind": "hinglish", "aidiyas": "ideas", "aidiya": "idea",
}
_DEV = re.compile(r"[ऀ-ॿ]")
# every Indic block Whisper can output, so "Roman" works for Tamil/Telugu/Bengali too,
# not just Hindi. Devanagari is handled separately because it has the FIXES table.
_INDIC = re.compile(r"[ঀ-෿]")


def _romanise(text: str) -> str:
    """Native script -> readable roman. Devanagari directly, anything else via detect."""
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate
    if _DEV.search(text):
        src = sanscript.DEVANAGARI
    else:
        from indic_transliteration.detect import detect
        src = detect(text)
    text = transliterate(text, src, sanscript.OPTITRANS).lower()
    # OPTITRANS keeps the inherent "a" ("karataa"); drop the trailing one and the danda.
    return re.sub(r"([bcdfghjklmnpqrstvwxyz])a\b", r"\1", text).replace("|", ".")


def normalize(text: str, roman: bool = True) -> str:
    if roman and (_DEV.search(text) or _INDIC.search(text)):
        try:
            text = _romanise(text)
        except Exception:
            pass
    elif not roman:
        return text  # Native script requested — leave it exactly as spoken
    m = re.match(r"^([\w']+)(\W*)$", text)
    if m:
        core, tail = m.group(1), m.group(2)
        low = core.lower()
        if low in FIXES:
            fx = FIXES[low]
            core = fx.capitalize() if core[:1].isupper() else fx
        text = core + tail
    return text


def words_from(result, roman: bool = True):
    out = []
    for seg in result.segments:
        for w in seg.words:
            t = (w.word or "").strip()
            if t:
                out.append({"text": normalize(t, roman),
                            "start": round(float(w.start), 3), "end": round(float(w.end), 3)})
    return out


# A neutral creator vocabulary helps Whisper keep common reel words intact.
HI_PROMPT = ("इंस्टाग्राम, यूट्यूब, रील, वीडियो, एडिटिंग, कैप्शन, स्क्रिप्ट, "
             "टेम्पलेट, फॉलोअर्स, कंटेंट, क्रिएटर, सोशल मीडिया।")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--script")
    ap.add_argument("--align-model", default="base")
    ap.add_argument("--transcribe-model", default=os.environ.get("CS_MODEL", ""))
    # "" = let Whisper detect. "hi-en" = Kalakar's "Hinglish": transcribe as Hindi,
    # output roman. Any other Whisper code (en, gu, ta, ur, …) works too.
    ap.add_argument("--lang", default=os.environ.get("CS_LANG", ""))
    # auto = roman only for hi-en; 1 = force roman; 0 = keep the native script
    ap.add_argument("--roman", default=os.environ.get("CS_ROMAN", "auto"))
    ap.add_argument("--prompt", default=os.environ.get("CS_PROMPT", ""))
    args = ap.parse_args()

    lang = args.lang.strip()
    if lang == "hi-en":                       # Hinglish = Hindi audio, roman captions
        lang, roman = "hi", args.roman != "0"
    else:
        roman = args.roman == "1"

    video = Path(args.video)
    if not video.exists():
        sys.exit(f"not found: {video}")

    script = ""
    if args.script and Path(args.script).exists():
        script = Path(args.script).read_text(encoding="utf-8").strip()

    import stable_whisper

    if script:
        model = stable_whisper.load_model(args.align_model)
        result = model.align(str(video), script, language=lang or "hi")
        mode = f"align/{args.align_model}"
    else:
        # No script: let Whisper detect the language instead of forcing Hindi, so an
        # English clip comes out in English and a Hindi/Hinglish one comes out in
        # Devanagari, which normalize() then romanises. Forcing "hi" mangled every
        # English take.
        # CPU/int8 is compatible with the widest range of follower PCs.
        tmodel = args.transcribe_model or "small"
        model = stable_whisper.load_faster_whisper(
            tmodel, device="cpu", compute_type="int8",
            cpu_threads=os.cpu_count() or 4)
        kw = dict(word_timestamps=True, regroup=False, vad_filter=True,
                  beam_size=1, condition_on_previous_text=False,
                  repetition_penalty=1.1, no_repeat_ngram_size=3,
                  initial_prompt=args.prompt or (HI_PROMPT if lang in ("hi", "") else None))
        try:
            result = model.transcribe(str(video), language=lang or None, **kw)
        except TypeError:  # older stable-ts doesn't forward these kwargs
            result = model.transcribe(str(video), language=lang or None,
                                      word_timestamps=True, regroup=False, vad_filter=True)
        detected = getattr(result, "language", None) or lang or "auto"
        args.transcribe_model = tmodel
        # Auto-detect + no explicit choice: romanise Indic output. English is unaffected.
        if args.roman == "auto" and not args.lang:
            roman = True
        mode = f"transcribe/{args.transcribe_model}/{detected}{'/roman' if roman else ''}"

    words = words_from(result, roman)
    if not words:
        sys.exit("No speech was detected in this video.")
    # Order matters. Pushing `start` forward to clear an overlap can re-break a
    # word whose duration was just fixed, and on a run of zero-length words that
    # cascades — they end up with end <= start and never render at all.
    # De-overlap first, THEN guarantee a minimum duration.
    for i, w in enumerate(words):
        if i and w["start"] < words[i - 1]["end"]:
            w["start"] = words[i - 1]["end"]
        if w["end"] <= w["start"]:
            w["end"] = w["start"] + 0.12

    out = video.with_suffix(".words.json")
    out.write_text(json.dumps({"video": video.name, "mode": mode, "words": words},
                              ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{mode}: {len(words)} words, {words[0]['start']}-{words[-1]['end']}s", file=sys.stderr)


if __name__ == "__main__":
    main()
