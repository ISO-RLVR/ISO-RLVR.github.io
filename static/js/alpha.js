/* ============================================================
   Interactive spectrum-interpolation (rebase) experiment — Fig. 4(a)
   W~(alpha) = U_RL [ (1-alpha) * Sigma_0 + alpha * Sigma_RL ] V_RL^T
   RL-trained frames are held fixed; only the spectrum is interpolated.

   Each alpha anchor is a separately evaluated model
   (DeepSeek-R1-Distill-Qwen-1.5B -> Nemotron-Research-Reasoning-
   Qwen-1.5B, >3,000 RLVR updates). The slider snaps to the six
   evaluated anchors — there is no interpolation between them.
   Base scores are the DS-1.5B numbers from Table 2 of the paper.
   ============================================================ */

const ALPHAS = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];

const DATA = [
  // name, base-model score, scores at ALPHAS (RL frames fixed)
  { name: "AIME 2024", base: 30.90, scores: [48.96, 49.17, 50.31, 48.23, 50.31, 51.56] },
  { name: "AIME 2025", base: 23.40, scores: [32.71, 33.65, 33.23, 33.02, 33.23, 32.71] },
  { name: "AMC 2023",  base: 63.15, scores: [82.23, 80.42, 80.27, 81.17, 79.67, 81.17] },
  { name: "Minerva",   base: 27.33, scores: [34.47, 33.55, 35.11, 34.83, 34.47, 33.46] },
  { name: "Olympiad",  base: 43.11, scores: [59.22, 58.89, 58.81, 59.63, 59.00, 59.15] },
];

const GREEN = "#1a7f37";
const GRAY = "#5f6b7a";
const GRID = "#e5e7eb";
const INK2 = "#3f4854";
const MUTED = "#6b7280";

/* alpha takes only the six evaluated anchor values */
const STEP = 0.2;
function snap(a) {
  return Math.min(Math.max(Math.round(a / STEP) * STEP, 0), 1);
}
function idxOf(a) {
  return Math.round(snap(a) / STEP);
}
function scoreAt(bench, a) {
  return bench.scores[idxOf(a)];
}
function avgAt(a) {
  return DATA.reduce((acc, b) => acc + scoreAt(b, a), 0) / DATA.length;
}
const BASE_AVG = DATA.reduce((acc, b) => acc + b.base, 0) / DATA.length;
const RL_AVG = avgAt(1.0);

/* ---------- build the SVG chart ---------- */
const M = { top: 18, right: 56, bottom: 34, left: 118 };
const ROW_H = 36, BAR_H = 16;
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
  bar.style.transition = "width 120ms ease";

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
      `<div>score at &alpha;=${a.toFixed(1)}: <b>${s.toFixed(2)}</b></div>` +
      `<div class="tt-dim">base model (pre-RL): ${r.bench.base.toFixed(2)}</div>` +
      `<div class="tt-dim">gain kept by RL frames: +${(s - r.bench.base).toFixed(2)}</div>`;
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
  a = snap(a);
  current = a;
  readout.textContent = "α = " + a.toFixed(1);
  coefBase.textContent = (1 - a).toFixed(1);
  coefRL.textContent = a.toFixed(1);

  rows.forEach(r => {
    const s = scoreAt(r.bench, a);
    const w = xScale(s) - xScale(0);
    r.bar.setAttribute("width", Math.max(w, 0));
    r.valueLabel.setAttribute("x", xScale(s) + 8);
    r.valueLabel.textContent = s.toFixed(1);
  });

  const avg = avgAt(a);
  avgTile.textContent = avg.toFixed(2);
  avgNote.textContent = "+" + (avg - BASE_AVG).toFixed(1) + " over the base model";
  const d = avg - RL_AVG;
  deltaTile.textContent = (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(2);
}

slider.addEventListener("input", () => render(parseFloat(slider.value)));

/* sweep animation: step through the six evaluated anchors and back */
const playBtn = document.getElementById("alpha-play");
let sweeping = false;
playBtn.addEventListener("click", () => {
  if (sweeping) return;
  sweeping = true;
  playBtn.disabled = true;
  const seq = ALPHAS.concat(ALPHAS.slice(0, -1).reverse()); // 0 -> 1 -> 0
  let i = 0;
  const timer = setInterval(() => {
    slider.value = seq[i].toFixed(1);
    render(seq[i]);
    i += 1;
    if (i >= seq.length) {
      clearInterval(timer);
      sweeping = false;
      playBtn.disabled = false;
    }
  }, 420);
});

render(0.0);
