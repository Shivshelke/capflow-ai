import React from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { Captions, DEFAULT_PROPS } from "./Captions.jsx";
import { TPL, TEMPLATES, TEMPLATE_DEFAULTS, TRANSITIONS, wordCss, lineCss } from "./templates.js";
import { FONT_NAMES, fontFamily } from "./fonts.js";

// In the browser preview there is no delayRender budget, so warm every font up
// front — switching the Font dropdown then updates the preview instantly.
try { FONT_NAMES.forEach((n) => fontFamily(n)); } catch (e) {}

let root = null;
let props = { ...DEFAULT_PROPS };

function frames() {
  return Math.max(2, Math.round((props.durationInSeconds || 20) * (props.fps || 30)));
}

function paint() {
  root.render(
    React.createElement(Player, {
      component: Captions,
      inputProps: props,
      durationInFrames: frames(),
      fps: props.fps || 30,
      compositionWidth: props.width || 1080,
      compositionHeight: props.height || 1920,
      style: { width: "100%", height: "100%" },
      controls: true,
      loop: true,
      acknowledgeRemotionLicense: true,
    })
  );
}

window.CS = {
  FONTS: FONT_NAMES,
  TEMPLATES,
  TEMPLATE_DEFAULTS,
  TRANSITIONS,
  TPL,
  fontFamily,
  // the gallery cards render through the exact same style functions as the video
  wordCss, lineCss,
  mount(el, initial) {
    root = createRoot(el);
    props = { ...DEFAULT_PROPS, ...initial, style: { ...DEFAULT_PROPS.style, ...((initial || {}).style || {}) } };
    paint();
  },
  update(patch) {
    props = { ...props, ...patch, style: { ...props.style, ...((patch || {}).style || {}) } };
    paint();
  },
  props() { return props; },
};
