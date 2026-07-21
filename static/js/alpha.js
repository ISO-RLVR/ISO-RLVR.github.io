/* ============================================================
   Interactive spectrum-interpolation (rebase) demo — Fig. 4(a)
   W~(alpha) = U_RL [ (1-alpha) * Sigma_0 + alpha * Sigma_RL ] V_RL^T
   RL-trained frames are held fixed; only the spectrum is interpolated.

   NOTE: scores below are digitized from Fig. 4(a) of the paper
   (DeepSeek-R1-Distill-Qwen-1.5B -> Nemotron-Research-Reasoning-
   Qwen-1.5B, >3,000 RLVR updates). Replace with exact evaluation
   numbers if desired — only this DATA block needs to change.
   ============================================================ */

const ALPHAS = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];

const DATA = [
  // name, base-model score, scores at ALPHAS (RL frames fixed)
  { name: "AIME 2024",    base: 30.9, scores: [50.4, 51.0, 50.6, 48.9, 50.8, 51.9] },
  { name: "AIME 2025",    base: 23.4, scores: [33.4, 33.0, 33.6, 33.2, 32.8, 33.5] },
  { name: "AMC 2023",     base: 63.2, scores: [81.6, 80.9, 80.3, 81.0, 79.5, 81.2] },
  { name: "Minerva",      base: 27.3, scores: [34.9, 35.2, 34.8, 35.0, 35.1, 35.3] },
  { name: "Olympiad",     base: 43.1, scores: [59.1, 59.5, 58.9, 59.8, 59.2, 59.6] },
  { name: "LCB pass@1",   base: 17.4, scores: [27.2, 26.8, 27.0, 27.3, 26.5, 27.1] },
  { name: "LCB pass@4",   base: 25.9, scores: [33.0, 33.4, 32.7, 33.1, 33.5, 33.2] },
];

const GREEN = "#1a7f37";
const GRAY = "#5f6b7a";
const GRID = "#e5e7eb";
const INK2 = "#3f4854";
const MUTED = "#6b7280";

/* piecewise-linear interpolation over the alpha anchors */
function scoreAt(bench, a) {
  const s = bench.scores;
  if (a <= 0) return s[0];
  if (a >= 1) return s[s.length - 1];
  const x = a / 0.2;
  const i = Math.min(Math.floor(x), s.length - 2);
  const t = x - i;
  return s[i] * (1 - t) + s[i + 1] * t;
}

function avgAt(a) {
  return DATA.reduce((acc, b) => acc + scoreAt(b, a), 0) / DATA.length;
}
const BASE_AVG = DATA.reduce((acc, b) => acc + b.base, 0) / DATA.length;
const RL_AVG = avgAt(1.0);

/* ---------- build the SVG chart ---------- */
const M = { top: 18, right: 56, bottom: 34, left: 118 };
const ROW_H = 34, BAR_H = 16;
const W = 900;
const H = M.top + DATA.length * ROW_H + M.bottom;
const plotW = W - M.left - M.right;
const xScale = v => M.left + (v / 100) * plotW;

const svg = document.getElementById("alpha-chart");
svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  (parent || svg).appendChild(e);
  return e;
}

/* grid + x axis */
for (let v = 0; v <= 100; v += 20) {
  el("line", { x1: xScale(v), x2: xScale(v), y1: M.top - 4, y2: H - M.bottom + 4, stroke: GRID, "stroke-width": 1 });
  el("text", { x: xScale(v), y: H - M.bottom + 22, "text-anchor": "middle", "font-size": 12, fill: MUTED }).textContent = v;
}
el("text", { x: xScale(50), y: H - 4, "text-anchor": "middle", "font-size": 12.5, fill: MUTED })
  .textContent = "Score (%)";

/* rows: label, bar, base marker, value label */
const rows = DATA.map((b, i) => {
  const cy = M.top + i * ROW_H + ROW_H / 2;
  el("text", { x: M.left - 12, y: cy + 4.5, "text-anchor": "end", "font-size": 13.5, fill: INK2 }).textContent = b.name;

  // hover hit area (full row)
  const hit = el("rect", { x: M.left, y: cy - ROW_H / 2 + 2, width: plotW, height: ROW_H - 4, fill: "transparent" });

  const bar = el("rect", {
    x: xScale(0), y: cy - BAR_H / 2, height: BAR_H, width: 0,
    rx: 4, fill: GREEN,
  });
  bar.style.transition = "width 80ms linear";

  // base-model reference: dashed vertical tick
  el("line", {
    x1: xScale(b.base), x2: xScale(b.base),
    y1: cy - BAR_H / 2 - 5, y2: cy + BAR_H / 2 + 5,
    stroke: GRAY, "stroke-width": 3, "stroke-dasharray": "3 2.5", "stroke-linecap": "round",
  });

  const valueLabel = el("text", { x: 0, y: cy + 4.5, "font-size": 12.5, "font-weight": 700, fill: GREEN });
  return { bench: b, bar, valueLabel, hit };
});

/* ---------- tooltip ---------- */
const tip = document.createElement("div");
tip.className = "chart-tooltip";
document.body.appendChild(tip);

rows.forEach(r => {
  r.hit.addEventListener("mousemove", ev => {
    const a = current;
    const s = scoreAt(r.bench, a);
    tip.innerHTML =
      `<div class="tt-title">${r.bench.name}</div>` +
      `<div>score at &alpha;=${a.toFixed(2)}: <b>${s.toFixed(1)}</b></div>` +
      `<div class="tt-dim">base model (pre-RL): ${r.bench.base.toFixed(1)}</div>` +
      `<div class="tt-dim">gain kept by RL frames: +${(s - r.bench.base).toFixed(1)}</div>`;
    tip.style.left = Math.min(ev.clientX + 14, window.innerWidth - 280) + "px";
    tip.style.top = (ev.clientY + 14) + "px";
    tip.classList.add("show");
  });
  r.hit.addEventListener("mouseleave", () => tip.classList.remove("show"));
});

/* ---------- render loop ---------- */
const slider = document.getElementById("alpha-slider");
const readout = document.getElementById("alpha-readout");
const coefBase = document.getElementById("coef-base");
const coefRL = document.getElementById("coef-rl");
const avgTile = document.getElementById("avg-at-alpha");
const avgNote = document.getElementById("avg-note");
const deltaTile = document.getElementById("delta-vs-rl");

let current = 0.0;

function render(a) {
  current = a;
  readout.textContent = "α = " + a.toFixed(2);
  coefBase.textContent = (1 - a).toFixed(2);
  coefRL.textContent = a.toFixed(2);

  rows.forEach(r => {
    const s = scoreAt(r.bench, a);
    const w = xScale(s) - xScale(0);
    r.bar.setAttribute("width", Math.max(w, 0));
    r.valueLabel.setAttribute("x", xScale(s) + 8);
    r.valueLabel.textContent = s.toFixed(1);
  });

  const avg = avgAt(a);
  avgTile.textContent = avg.toFixed(1);
  avgNote.textContent = "+" + (avg - BASE_AVG).toFixed(1) + " over the base model";
  const d = avg - RL_AVG;
  deltaTile.textContent = (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(1);
}

slider.addEventListener("input", () => render(parseFloat(slider.value)));

/* sweep animation */
const playBtn = document.getElementById("alpha-play");
let sweeping = false;
playBtn.addEventListener("click", () => {
  if (sweeping) return;
  sweeping = true;
  playBtn.disabled = true;
  const t0 = performance.now(), DUR = 3200;
  function tick(t) {
    const p = Math.min((t - t0) / DUR, 1);
    // ease out-and-back: 0 -> 1 -> 0
    const a = p < 0.5 ? p * 2 : (1 - p) * 2;
    slider.value = a.toFixed(3);
    render(a);
    if (p < 1) requestAnimationFrame(tick);
    else { sweeping = false; playBtn.disabled = false; slider.value = "0"; render(0); }
  }
  requestAnimationFrame(tick);
});

render(0.0);
