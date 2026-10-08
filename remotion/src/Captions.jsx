import React from "react";
import {
  AbsoluteFill, OffthreadVideo, Sequence, staticFile,
  useCurrentFrame, useVideoConfig, spring, interpolate,
} from "remotion";
import { fontFamily } from "./fonts.js";
import { TPL, TEMPLATES, TEMPLATE_DEFAULTS, wordCss, lineCss, transStyle,
         isSplash, emphasisIndex } from "./templates.js";

export { TEMPLATES, TEMPLATE_DEFAULTS };
export { TPL, TRANSITIONS } from "./templates.js";

export const DEFAULT_PROPS = {
  src: "",
  fps: 30,
  width: 1080,
  height: 1920,
  durationInSeconds: 20,
  durationInFrames: 600,
  words: [
    { text: "Ye", start: 0.2, end: 0.5 }, { text: "tool", start: 0.5, end: 0.9 },
    { text: "developers", start: 0.9, end: 1.5 }, { text: "code", start: 1.5, end: 1.9 },
    { text: "likhne", start: 1.9, end: 2.3 }, { text: "ke", start: 2.3, end: 2.5 },
    { text: "liye", start: 2.5, end: 2.9 }, { text: "banate", start: 2.9, end: 3.3 },
    { text: "hain.", start: 3.3, end: 3.7 },
  ],
  template: "pop",
  transition: { kind: "fade", scope: "line", dir: "out" },
  style: {
    font: "Montserrat", fontSizePct: 5.0, color: "#FFFFFF", accent: "#FFFFFF",
    outline: 5, posYPct: 46, uppercase: false, oneWord: false, maxCharsPerLine: 22,
  },
};

function groupLines(words, maxChars, oneWord) {
  if (oneWord) return words.map((w) => [w]);
  const out = []; let cur = [];
  words.forEach((w, i) => {
    cur.push(w);
    const txt = cur.map((x) => x.text).join(" ");
    const gap = i + 1 < words.length ? words[i + 1].start - w.end : 99;
    if (/[.,?!…]$/.test((w.text || "").trim()) || txt.length >= maxChars ||
        (w.end - cur[0].start) >= 2.6 || gap >= 0.5) {
      out.push(cur); cur = [];
    }
  });
  if (cur.length) out.push(cur);
  return out;
}

function Word({ w, i, activeIdx, emphIdx, splash, lineStart, def, st, ff, ffAct,
                lineIndex, oneWord, trans, fps }) {
  const frame = useCurrentFrame();

  // Exactly ONE word is "active" at a time (activeIdx is resolved once for the
  // whole line) — two adjacent words could both match a start/end window and
  // you'd get two highlight boxes at once.
  const active = i === activeIdx;
  const passed = i < activeIdx;

  // On a splash template the emphasis is fixed for the line: one chosen word is
  // big for the line's whole life, so the layout is decided up front and never
  // moves. Everywhere else the emphasis follows the voice.
  const on = splash ? i === emphIdx : active;
  const css = wordCss(def, st, { active: on, passed, line: lineIndex, ff, ffAct });

  // ---- entrance ----
  // Only animate per word where it's deliberate: the bouncy templates, or when
  // the user picked Word scope in Transitions. Otherwise the line comes in as
  // one block and just the highlight moves — the premium look.
  const perWord = (trans.scope === "word" && trans.kind !== "none") || !!def.enter;
  const stagger = oneWord || !perWord ? 0 : i * 2.2;
  const t = spring({ frame: frame - stagger, fps, config: { damping: 200, stiffness: 190, mass: 0.55 } });
  let anim = {};
  if (trans.scope === "word" && trans.kind !== "none") {
    anim = transStyle(trans.kind, trans.dir, t);
  } else if (def.enter === "pop") {
    anim = { opacity: t, transform: `translateY(${(1 - t) * 0.16}em) scale(${0.88 + 0.12 * t})` };
  } else if (def.enter === "drop") {
    anim = { opacity: t, transform: `translateY(${(t - 1) * 0.34}em)` };
  }

  const a = def.act || {};
  const hit = spring({ frame: frame - Math.round((w.start - lineStart) * fps), fps,
                       config: { damping: 200, stiffness: 260, mass: 0.5 } });

  if (splash && on) {
    // the big word is already at its final SIZE (layout is fixed); it just
    // brightens and gives a small kick the moment it is actually spoken
    const lit = active || passed ? 1 : 0.62;
    anim.opacity = (anim.opacity ?? 1) * lit;
    if (active) anim.transform = `${anim.transform || ""} scale(${(1 + 0.05 * hit).toFixed(3)})`.trim();
  } else if (!splash && active && a.scale) {
    const sc = 1 + (a.scale - 1) * (0.85 + 0.15 * hit);
    anim.transform = `${anim.transform || ""} scale(${sc.toFixed(3)})`.trim();
    anim.transformOrigin = i === 0 ? "left center" : "center center";
  }

  if (def.pulse) {
    const p = 0.7 + 0.3 * Math.abs(Math.sin((frame / fps) * 2.4));
    css.textShadow = [css.textShadow, `0 0 ${(0.18 * p).toFixed(3)}em ${st.accent}`].filter(Boolean).join(", ");
  }

  return <span style={{ ...css, ...anim, opacity: (anim.opacity ?? 1) * (css.opacity ?? 1) }}>{w.text}</span>;
}

function Line({ line, lineIndex, def, st, height, oneWord, trans, frames }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tSec = line[0].start + frame / fps;

  // the latest word that has started — one, and only one
  let activeIdx = -1;
  for (let i = 0; i < line.length; i++) if (tSec >= line[i].start - 0.02) activeIdx = i;

  const splash = isSplash(def);
  const emphIdx = splash ? emphasisIndex(line) : -1;

  // critically damped: it settles instead of wobbling — a spring that overshoots
  // is what makes auto-captions read as "CapCut", not premium
  const t = spring({ frame, fps, config: { damping: 200, stiffness: 190, mass: 0.55 } });

  // ease out over the last frames of THIS sequence, however long it turned out
  const out = Math.max(3, Math.min(6, Math.round(frames * 0.22)));
  const fadeOut = interpolate(frame, [frames - out, frames], [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const lineAnim = trans.scope === "line" && trans.kind !== "none"
    ? transStyle(trans.kind, trans.dir, t)
    : { opacity: t, transform: `translateY(${(1 - t) * 0.12}em)` };

  const ff = fontFamily(st.font || def.font);
  const ffAct = def.act && def.act.font ? fontFamily(def.act.font) : ff;
  const fontSize = Math.round((height * st.fontSizePct) / 100);

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <div style={{
        position: "absolute", left: "5%", right: "5%",
        top: `${st.posYPct}%`, transform: "translateY(-50%)",
        textAlign: def.align || "center", fontSize,
      }}>
        <div style={{ ...lineCss(def, st), ...lineAnim, opacity: lineAnim.opacity ?? 1 }}>
          {line.map((w, i) => (
            <Word key={i} w={w} i={i} lineIndex={lineIndex} oneWord={oneWord} trans={trans}
              activeIdx={activeIdx} emphIdx={emphIdx} splash={splash} fps={fps}
              lineStart={line[0].start} def={def} st={st} ff={ff} ffAct={ffAct} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const Captions = (props) => {
  const p = { ...DEFAULT_PROPS, ...props, style: { ...DEFAULT_PROPS.style, ...(props.style || {}) } };
  const { fps } = useVideoConfig();
  const key = TPL[p.template] ? p.template : "clean";
  const def = TPL[key];
  const trans = { ...DEFAULT_PROPS.transition, ...(p.transition || {}) };
  const oneWord = !!p.style.oneWord;
  const maxChars = oneWord ? 99 : (p.style.maxCharsPerLine || def.words || 22);
  const lines = groupLines(p.words || [], maxChars, oneWord);

  const videoSrc = !p.src ? null
    : /^(https?:|data:|blob:)/.test(p.src) ? p.src : staticFile(p.src);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {videoSrc ? <OffthreadVideo src={videoSrc} /> : null}
      {lines.map((line, idx) => {
        const from = Math.round(line[0].start * fps);
        // hold the line a beat after the last word — but never past the next
        // line's entrance, or the two render on top of each other
        const next = lines[idx + 1];
        const hold = Math.min(line[line.length - 1].end + 0.28,
                              next ? next[0].start : Infinity);
        const to = Math.round(hold * fps);
        return (
          <Sequence key={idx} from={from} durationInFrames={Math.max(2, to - from)} layout="none">
            <Line line={line} lineIndex={idx} def={def} st={p.style} height={p.height}
              oneWord={oneWord} trans={trans} frames={Math.max(2, to - from)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
