// Single source of truth for every caption template.
//
// The SAME descriptor drives (a) the Remotion preview + export and (b) the
// template gallery cards in index.html — so a card looks exactly like the
// exported video. Everything is in `em`, so one style works at 17px (a card)
// and at 90px (a 1080p reel).
//
// Looks are modelled on the reference editors (Kalakar / whitestair) — the
// styling values are ours, written from the visual, not their code.

const OFF = [[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0],[-1.4,0],[1.4,0],[0,1.4],[0,-1.4]];

/** hard 8-way outline as a text-shadow, in em */
export const outlineEm = (em, c = "#000") =>
  em <= 0 ? "" : OFF.map(([x, y]) => `${(x * em).toFixed(3)}em ${(y * em).toFixed(3)}em 0 ${c}`).join(",");

const glowEm = (em, c) => em <= 0 ? "" :
  `0 0 ${(em * 0.5).toFixed(2)}em ${c}, 0 0 ${em.toFixed(2)}em ${c}, 0 0 ${(em * 2).toFixed(2)}em ${c}`;

const join = (...xs) => xs.filter(Boolean).join(", ");

/*
  Descriptor keys — all optional except font/color.
    font, weight, caps, size(%), ls(em letter-spacing), lh(line-height)
    color, accent, outline(0-10 UI units)
    grad   [angleDeg, "#a", "#b", ...]      base text gradient
    stroke em                               WebkitTextStroke, black, paint-order stroke-fill
    glow   em                               glow in accent
    idle   { opacity, blur }                what a not-yet-spoken word looks like
    act    { color, grad, bg, scale, glow, caps, italic, font, weight, underline }
    lineBg { color, radius, pad, blur }     box behind the whole line
    align  "center" | "right" | "left"
    rotate deg
    words  soft chars-per-line default
*/
export const TPL = {
  // ---------- house ----------
  clean:    { name:"Clean", hint:"fade in", font:"Montserrat", color:"#FFFFFF", accent:"#FFFFFF", size:4.6, outline:5 },
  pop:      { name:"Pop", hint:"bounce", font:"Montserrat", color:"#FFFFFF", accent:"#FFFFFF", size:5.0, outline:5, enter:"pop" },
  karaoke:  { name:"Karaoke", hint:"word colour", font:"Inter", color:"#FFFFFF", accent:"#FFE100", size:4.8, outline:4,
              act:{ color:"#FFE100", scale:1.06 } },
  box:      { name:"Box", hint:"solid box", font:"Inter", color:"#FFFFFF", accent:"#FFD400", size:5.0, outline:4,
              act:{ bg:"#FFD400", color:"#0C0C0C", scale:1.04 } },
  focus:    { name:"Focus", hint:"yellow box", font:"Inter", color:"#FFFFFF", accent:"#FFE600", size:4.8, outline:0, caps:true,
              act:{ bg:"#FFE600", color:"#0C0C0C", scale:1.04 } },
  open:     { name:"Open", hint:"outline fill", font:"Anton", color:"#FFFFFF", accent:"#FFFFFF", size:5.4, outline:0, caps:true, fill:true },
  popular:  { name:"Popular", hint:"cycling", font:"Luckiest Guy", color:"#FFFFFF", accent:"#22D3EE", size:5.0, outline:3, cycle:true,
              act:{ scale:1.1 } },
  creator:  { name:"Creator", hint:"2-line", font:"Montserrat", color:"#FFFFFF", accent:"#2BAEFF", size:4.6, outline:4, altLine:true },
  glow:     { name:"Glow", hint:"neon", font:"Poppins", color:"#FFFFFF", accent:"#8B5CFF", size:4.8, outline:3, glow:0.5, pulse:true },
  shadow:   { name:"Shadow", hint:"hard drop", font:"Archivo Black", color:"#FFFFFF", accent:"#FF3D68", size:5.0, outline:3, drop:0.1 },
  bold:     { name:"Bold", hint:"big drop", font:"Anton", color:"#FFFFFF", accent:"#FFFFFF", size:6.4, outline:4, caps:true, words:14, enter:"drop" },
  gradient: { name:"Gradient", hint:"fill", font:"Montserrat", color:"#FFD84D", accent:"#FF5C39", size:5.2, outline:3,
              grad:[135, "#FFD84D", "#FF5C39"] },

  // ---------- splash / emphasis ----------
  kalakar:  { name:"Kalakar", hint:"splash", font:"Inter", color:"#FFFFFF", accent:"#C8FF00", size:3.2, outline:2, lh:1.05, words:17,
              act:{ color:"#C8FF00", scale:2.0, caps:true, weight:900 } },
  kalakarglow:{ name:"Kalakar Glow", hint:"lime glow", font:"Inter", color:"#FFFFFF", accent:"#A0D83E", size:3.2, outline:2, lh:1.05, words:17,
              act:{ grad:[90, "#A0D83E", "#D2F79B", "#A0D83E"], scale:1.95, caps:true, weight:900, glow:0.35 } },
  kalakarshadow:{ name:"Kalakar Shadow", hint:"metal fade", font:"Inter", color:"#FFFFFF", size:3.5, outline:0, lh:0.95, words:18,
              accent:"#FE9C03", grad:[180, "#FFFFFF", "#8A8A8A"], drop:0.05, dropColor:"rgba(0,0,0,.35)",
              act:{ grad:[180, "#FE9C03", "#6B4A11"], scale:1.9, weight:900 } },
  ij:       { name:"IJ", hint:"blur idle", font:"Inter", color:"#FBEEC9", accent:"#FBEEC9", size:3.5, outline:0, caps:true, words:18,
              idle:{ opacity:0.85, blur:0.045 }, act:{ color:"#FBEEC9", scale:1.9, weight:800 } },
  flicker:  { name:"Flicker", hint:"tech", font:"Inter", weight:400, color:"#FFFFFF", accent:"#E4EFFB", size:3.3, outline:0, lh:1.0, words:18,
              act:{ font:"Michroma", color:"#F0F6FC", scale:2.0, glow:0.3, weight:400 } },
  topup:    { name:"Top Up", hint:"right side", font:"Poppins", color:"#FFFFFF", accent:"#ECCC5E", size:3.6, outline:8, align:"right", words:18,
              act:{ color:"#ECCC5E", scale:1.8, weight:800 } },

  // ---------- loud / viral ----------
  hormozi:  { name:"Hormozi", hint:"green gradient", font:"Anton", color:"#9FF747", accent:"#8ABE4C", size:5.6, outline:0, caps:true, lh:1.0, words:16,
              grad:[180, "#77A748", "#8ABE4C", "#9FF747", "#A5FD4B"], stroke:0.02, drop:0.09, dropColor:"rgba(28,38,16,.85)" },
  mrbeast:  { name:"Mr Beast", hint:"thick outline", font:"Luckiest Guy", color:"#FFFFFF", accent:"#FFD700", size:5.4, outline:0, caps:true, words:16,
              stroke:0.055 },
  mrbeast2: { name:"Mr Beast 2", hint:"gold", font:"Archivo Black", color:"#FFD700", accent:"#FFD700", size:5.2, outline:0, caps:true, words:16,
              stroke:0.03, drop:0.055, dropColor:"rgba(0,0,0,.9)" },
  greenpop: { name:"Green Pop", hint:"stroke + pop", font:"Montserrat", weight:900, color:"#FFFFFF", accent:"#0BDD28", size:5.2, outline:0, caps:true, words:16,
              stroke:0.055, act:{ color:"#0BDD28", scale:1.06 } },
  mota:     { name:"Mota", hint:"fat stroke", font:"Archivo Black", color:"#FFFFFF", accent:"#7FFF33", size:4.4, outline:0, caps:true, words:16,
              stroke:0.07, act:{ color:"#7FFF33", scale:1.7 } },
  tabahi:   { name:"Tabahi", hint:"comic", font:"Bangers", color:"#FFFFFF", accent:"#FF3D68", size:5.6, outline:0, caps:true, ls:0.02, words:16,
              stroke:0.05 },
  seedha:   { name:"Seedha Saadha", hint:"reveal", font:"Rubik", weight:900, color:"#FFFFFF", accent:"#FFFFFF", size:5.0, outline:0, caps:true, words:18,
              stroke:0.075, idle:{ opacity:0.16 } },
  deepglow: { name:"Deep Glow", hint:"magenta neon", font:"Archivo Black", color:"#FFFFFF", accent:"#FF00FF", size:4.8, outline:0, caps:true, words:18,
              glow:0.32, act:{ glow:0.55, scale:1.05 } },
  devin:    { name:"Devin", hint:"purple", font:"Montserrat", weight:900, color:"#A34EFF", accent:"#A34EFF", size:5.2, outline:0, caps:true, words:14,
              drop:0.05, dropColor:"rgba(0,0,0,.6)" },
  blackpunch:{ name:"Black Punch", hint:"inverted", font:"Anton", color:"#000000", accent:"#FFFFFF", size:5.4, outline:0, caps:true, words:16,
              stroke:0.045, strokeColor:"rgba(200,200,200,.8)", drop:0.05, dropColor:"rgba(255,255,255,.5)" },

  // ---------- boxed / clean ----------
  bubble:   { name:"Bubble", hint:"rounded box", font:"Roboto", weight:700, color:"#FFFFFF", accent:"#48A680", size:4.6, outline:3, words:22,
              act:{ bg:"#48A680", color:"#FFFFFF", radius:0.18 } },
  skool:    { name:"Editing Skool", hint:"orange bar", font:"Inter", color:"#FFFFFF", accent:"#F48601", size:4.4, outline:0, caps:true, words:16,
              lineBg:{ color:"#F48601", radius:0.06, pad:"0.22em 0.3em" } },
  aliabdaal:{ name:"Ali Abdaal", hint:"white pill", font:"Poppins", weight:600, color:"#1F2022", accent:"#000000", size:3.8, outline:0, words:26,
              lineBg:{ color:"#FFFFFF", radius:0.42, pad:"0.3em 0.5em" }, act:{ color:"#000000", weight:800 } },
  ziada:    { name:"Ziada", hint:"black card", font:"Inter", color:"#FFFFFF", accent:"#FFFFFF", size:3.6, outline:0, align:"left", words:30,
              lineBg:{ color:"#000000", radius:0.28, pad:"0.5em 0.55em" } },
  liquid:   { name:"Liquid Glass", hint:"frosted", font:"Outfit", weight:600, color:"#918B7C", accent:"#FFFFFF", size:3.8, outline:0, words:26,
              lineBg:{ color:"rgba(255,255,255,.18)", radius:0.5, pad:"0.34em 0.55em", blur:0.14 },
              act:{ color:"#FFFFFF" } },
  underline:{ name:"Underline", hint:"active rule", font:"Inter", weight:700, color:"#FFFFFF", accent:"#FFE600", size:4.4, outline:4, words:22,
              act:{ underline:true } },
  highlight:{ name:"Highlight", hint:"amber word", font:"Montserrat", weight:700, color:"#FFFFFF", accent:"#F5A623", size:4.6, outline:4, words:22,
              act:{ color:"#F5A623" } },
  cleanglow:{ name:"Clean Glow", hint:"soft halo", font:"Inter", weight:700, color:"#FFFFFF", accent:"#FFFFFF", size:4.4, outline:0, words:24,
              glow:0.16 },
  cinematic:{ name:"Cinematic", hint:"wide caps", font:"Montserrat", weight:600, color:"#FFFFFF", accent:"#FFFFFF", size:3.4, outline:0, caps:true, ls:0.34, words:20,
              drop:0.03, dropColor:"rgba(0,0,0,.5)" },
  delhi:    { name:"Delhi", hint:"serif accent", font:"Instrument Sans", weight:700, color:"#FFFFFF", accent:"#FFFFFF", size:3.7, outline:0, words:18,
              act:{ font:"Instrument Serif", italic:true, scale:1.9, glow:0.3, weight:400 } },
  karachi:  { name:"Karachi", hint:"red gradient", font:"Bitter", weight:800, color:"#FFFFFF", accent:"#E70022", size:4.0, outline:0, caps:true, ls:0.14, words:18,
              act:{ grad:[180, "#E70022", "#E78794", "#E70022"], scale:1.7, glow:0.25 } },
  shamani:  { name:"Shamani", hint:"gold", font:"Archivo Black", color:"#FFF368", accent:"#FFF368", size:5.0, outline:0, caps:true, words:16,
              grad:[180, "#FFF368", "#F9F7A8", "#FCFBC5"], glow:0.2, drop:0.04, dropColor:"rgba(0,0,0,.35)" },
  pixel:    { name:"Pixel", hint:"retro", font:"Press Start 2P", weight:400, color:"#FFFFFF", accent:"#22D3EE", size:2.8, outline:4, lh:1.5, words:18,
              act:{ color:"#22D3EE" } },
};

export const TEMPLATES = Object.keys(TPL);

/** the values the sidebar pre-fills when you pick a template */
export const TEMPLATE_DEFAULTS = Object.fromEntries(
  Object.entries(TPL).map(([k, d]) => [k, {
    font: d.font, color: d.color, accent: d.accent || d.color,
    size: d.size ?? 4.8, outline: d.outline ?? 4, caps: !!d.caps,
    words: d.words ?? 22, name: d.name, hint: d.hint,
  }]),
);

/**
 * "Splash" templates blow one word up ~2x (Kalakar's WELCOME / IDEAS look).
 * That word gets its OWN LINE at its real font-size — real layout, not a
 * transform — so it can never sit on top of its neighbours, and because the
 * size is fixed for the whole line the geometry never changes: no reflow, no jump.
 */
export const isSplash = (def) => ((def.act && def.act.scale) || 1) >= 1.6;

/** which word in a line carries the emphasis: the longest real word */
export function emphasisIndex(line) {
  let best = 0, bestLen = -1;
  line.forEach((w, i) => {
    const len = String(w.text || "").replace(/[^\p{L}\p{N}]/gu, "").length;
    if (len > bestLen) { bestLen = len; best = i; }
  });
  return best;
}

const grad = (g) => `linear-gradient(${g[0]}deg, ${g.slice(1).join(", ")})`;

const asGradient = (g) => ({
  backgroundImage: grad(g),
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
});

/**
 * CSS for one caption word.
 *   def  — a TPL entry
 *   st   — live user style { color, accent, outline, uppercase, ... }
 *   o    — { active, passed, line, ff, ffAct }  ff = resolved font family names
 */
export function wordCss(def, st, o = {}) {
  const { active = false, passed = false, line = 0, ff, ffAct } = o;
  const color = st.color || def.color || "#FFFFFF";
  const accent = st.accent || def.accent || color;
  const oEm = (st.outline ?? def.outline ?? 4) * 0.008;
  const a = def.act || {};
  const on = active && !!def.act;
  const caps = st.uppercase || def.caps || (on && a.caps);
  const idle = def.idle || {};

  const s = {
    display: "inline-block",
    position: "relative",
    // constant padding on EVERY word — the active highlight only swaps colours,
    // so a line can never reflow / jump when the box moves.
    margin: "0.06em 0.05em",
    padding: "0.05em 0.16em",
    borderRadius: `${(on && a.radius) || 0.12}em`,
    fontFamily: (on && a.font && ffAct) || ff,
    fontStyle: on && a.italic ? "italic" : "normal",
    fontWeight: (on && a.weight) || def.weight || 800,
    lineHeight: def.lh ?? 1.15,
    letterSpacing: def.ls ? `${def.ls}em` : "normal",
    textTransform: caps ? "uppercase" : "none",
    whiteSpace: "pre",
    color,
    background: "transparent",
    transformOrigin: "center center",
    verticalAlign: "middle",
  };

  // ---- base fill: gradient / outline-fill / cycling colour / plain ----
  if (def.grad && !(on && a.grad)) Object.assign(s, asGradient(def.grad));
  if (def.fill) {                                    // "Open" — outline until spoken
    const filled = active || passed;
    s.color = filled ? accent : "transparent";
    s.WebkitTextStroke = `0.028em ${accent}`;
  }
  if (def.cycle) {
    const P = ["#22D3EE", "#FACC15", "#22C55E", "#F472B6", "#A855F7"];
    s.color = active ? (st.accent && line === -1 ? st.accent : P[line % P.length]) : color;
  }
  if (def.altLine && line % 2 === 1) { s.color = accent; s.fontStyle = "italic"; }

  // ---- stroke (paint-order keeps the fill crisp) ----
  if (def.stroke) {
    s.WebkitTextStroke = `${def.stroke}em ${def.strokeColor || "#000"}`;
    s.paintOrder = "stroke fill";
  }

  // ---- shadows / glow ----
  // A gradient fill means the text itself is transparent, so a text-shadow
  // would show straight THROUGH the glyphs. Those templates get the same look
  // via filter: drop-shadow(), which acts on the painted (clipped) pixels.
  const grads = !!(def.grad || (on && a.grad));
  const dropC = def.dropColor || (grads ? "rgba(0,0,0,.55)" : accent);
  const glowC = (on && a.glow && (a.color || accent)) || accent;
  const glowN = (on && a.glow) || def.glow || 0;

  if (grads) {
    const f = [`drop-shadow(0 ${(def.drop || 0.04)}em ${(def.drop || 0.05) * 2}em ${dropC})`];
    if (glowN) f.push(`drop-shadow(0 0 ${(glowN * 0.6).toFixed(2)}em ${glowC})`,
                      `drop-shadow(0 0 ${(glowN * 1.3).toFixed(2)}em ${glowC})`);
    s.filter = [s.filter, ...f].filter(Boolean).join(" ");
  } else {
    const shadows = [];
    if (oEm > 0 && !def.stroke) shadows.push(outlineEm(oEm));
    if (def.drop) shadows.push(`${def.drop}em ${def.drop}em 0 ${dropC}`);
    if (glowN) shadows.push(glowEm(glowN, glowC));
    if (!def.stroke && !def.drop && !glowN && oEm === 0) shadows.push("0 0.05em 0.16em rgba(0,0,0,.55)");
    const sh = join(...shadows);
    if (sh) s.textShadow = sh;
  }

  // ---- active word ----
  if (on) {
    if (a.scale && isSplash(def)) {
      // real layout, not a transform: own line, own size, nothing overlaps
      s.fontSize = `${a.scale}em`;
      s.display = "block";
      s.width = "fit-content";
      s.marginLeft = def.align === "left" ? 0 : "auto";
      s.marginRight = def.align === "right" ? 0 : "auto";
      s.lineHeight = 1.0;
    }
    if (a.grad) Object.assign(s, asGradient(a.grad));
    else if (a.color) { s.color = a.color === "#ACCENT" ? accent : a.color; s.WebkitTextFillColor = s.color; }
    if (a.bg) {
      s.background = st.accent || a.bg;
      s.color = a.color || "#0C0C0C";
      s.WebkitTextFillColor = s.color;
      s.textShadow = "none";
      s.WebkitTextStroke = "0";
    }
    if (a.underline) s.boxShadow = `inset 0 -0.08em 0 ${accent}`;
  }
  if (!active && idle.opacity != null) s.opacity = passed ? 1 : idle.opacity;
  if (!active && idle.blur) s.filter = [s.filter, `blur(${idle.blur}em)`].filter(Boolean).join(" ");

  return s;
}

/** CSS for the line wrapper (pill / card backgrounds) */
export function lineCss(def, st) {
  const s = { textAlign: def.align || "center" };
  if (def.rotate) s.transform = `rotate(${def.rotate}deg)`;
  const b = def.lineBg;
  if (!b) return s;
  Object.assign(s, {
    display: "inline-block",
    background: b.color === "#ACCENT" ? st.accent : b.color,
    borderRadius: `${b.radius}em`,
    padding: b.pad,
  });
  if (b.blur) {
    s.backdropFilter = `blur(${b.blur}em)`;
    s.WebkitBackdropFilter = s.backdropFilter;
  }
  return s;
}

// ---------------- transitions ----------------
export const TRANSITIONS = [
  { id: "none",       label: "None" },
  { id: "fade",       label: "Fade" },
  { id: "pop",        label: "Pop" },
  { id: "zoom",       label: "Zoom" },
  { id: "scale",      label: "Scale" },
  { id: "slide-left", label: "Slide Left / Right" },
  { id: "slide-up",   label: "Slide Up / Down" },
];

/** t: 0→1 entrance progress. dir: "in" | "out" */
export function transStyle(kind, dir, t) {
  const inv = 1 - t;
  const sign = dir === "in" ? 1 : -1;
  switch (kind) {
    case "fade":       return { opacity: t };
    case "pop":        return { opacity: t, transform: `translateY(${inv * 0.22}em) scale(${0.55 + 0.45 * t})` };
    case "zoom":       return { opacity: t, transform: `scale(${dir === "in" ? 0.5 + 0.5 * t : 1.5 - 0.5 * t})` };
    case "scale":      return { opacity: t, transform: `scaleX(${0.25 + 0.75 * t}) scaleY(${0.85 + 0.15 * t})` };
    case "slide-left": return { opacity: t, transform: `translateX(${-sign * inv * 0.9}em)` };
    case "slide-up":   return { opacity: t, transform: `translateY(${sign * inv * 0.9}em)` };
    default:           return {};
  }
}
