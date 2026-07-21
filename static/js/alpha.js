/* ============================================================
   Interactive spectrum-interpolation experiments (six evaluated
   anchors per panel; the slider snaps — no interpolation).

   Panel 1 (paper Fig. 4a): RL frames fixed, spectrum interpolated
     RL spectrum -> base spectrum. Scores stay at RL level.
       W~(a) = U_RL [ (1-a) Sigma_0 + a Sigma_RL ] V_RL^T
   Panel 2 (mirror control): SFT frames fixed, spectrum interpolated
     SFT spectrum -> RL spectrum. Scores stay at SFT level.
       W~(a) = U_SFT [ (1-a) Sigma_SFT + a Sigma_RL ] V_SFT^T

   Models: DeepSeek-R1-Distill-Qwen-1.5B (SFT/base) and
   Nemotron-Research-Reasoning-Qwen-1.5B (RL, ~3k RLVR updates).
   ============================================================ */

const ALPHAS = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
const STEP = 0.2;

const COLORS = {
  green: "#1a7f37",
  gray: "#5f6b7a",
  grid: "#e5e7eb",
  ink2: "#3f4854",
  muted: "#6b7280",
};

/* Panel 1 — RL frames, Sigma_RL -> Sigma_0 (paper Fig. 4a).
   ref = base model (pre-RL) scores from Table 2. */
const DATA_RL_FRAMES = [
  { name: "AIME 2024", ref: 30.90, scores: [48.96, 49.17, 50.31, 48.23, 50.31, 51.56] },
  { name: "AIME 2025", ref: 23.40, scores: [32.71, 33.65, 33.23, 33.02, 33.23, 32.71] },
  { name: "AMC 2023",  ref: 63.15, scores: [82.23, 80.42, 80.27, 81.17, 79.67, 81.17] },
  { name: "Minerva",   ref: 27.33, scores: [34.47, 33.55, 35.11, 34.83, 34.47, 33.46] },
  { name: "Olympiad",  ref: 43.11, scores: [59.22, 58.89, 58.81, 59.63, 59.00, 59.15] },
];

/* Panel 2 — SFT frames, Sigma_SFT -> Sigma_RL (mirror control).
   ref = the full RL checkpoint (rl_orig) under the same protocol. */
const DATA_SFT_FRAMES = [
  { name: "AIME 2024",  ref: 48.54, scores: [30.21, 30.83, 30.21, 30.21, 28.65, 29.06] },
  { name: "AIME 2025",  ref: 32.50, scores: [23.23, 23.96, 22.19, 23.54, 22.92, 23.65] },
  { name: "AMC 2023",   ref: 80.72, scores: [63.40, 62.80, 64.16, 63.40, 63.70, 65.36] },
  { name: "Minerva",    ref: 34.93, scores: [26.47, 26.84, 27.02, 26.38, 27.57, 24.36] },
  { name: "Olympiad",   ref: 59.81, scores: [43.96, 44.37, 43.74, 43.41, 43.63, 43.74] },
  { name: "LCB pass@1", ref: 29.48, scores: [17.92, 16.76, 17.92, 17.29, 18.28, 16.94] },
  { name: "LCB pass@4", ref: 36.20, scores: [27.96, 24.73, 27.96, 26.52, 26.88, 27.24] },
];

function snap(a) { return Math.min(Math.max(Math.round(a / STEP) * STEP, 0), 1); }
function idxOf(a) { return Math.round(snap(a) / STEP); }
function mean(xs) { return xs.reduce((s, x) => s + x, 0) / xs.length; }

const tip = document.createElement("div");
tip.className = "chart-tooltip";
document.body.appendChild(tip);

function initPanel(cfg) {
  const DATA = cfg.data;
  const avgAt = a => mean(DATA.map(b => b.scores[idxOf(a)]));
  const REF_AVG = mean(DATA.map(b => b.ref));

  /* ---- SVG chart ---- */
  const M = { top: 18, right: 56, bottom: 34, left: 118 };
  const ROW_H = 36, BAR_H = 16;
  const W = 900;
  const H = M.top + DATA.length * ROW_H + M.bottom;
  const plotW = W - M.left - M.right;
  const xScale = v => M.left + (v / 100) * plotW;

  const svg = document.getElementById(cfg.ids.chart);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    svg.appendChild(e);
    return e;
  };

  for (let v = 0; v <= 100; v += 20) {
    el("line", { x1: xScale(v), x2: xScale(v), y1: M.top - 4, y2: H - M.bottom + 4, stroke: COLORS.grid, "stroke-width": 1 });
    el("text", { x: xScale(v), y: H - M.bottom + 22, "text-anchor": "middle", "font-size": 12, fill: COLORS.muted }).textContent = v;
  }
  el("text", { x: xScale(50), y: H - 4, "text-anchor": "middle", "font-size": 12.5, fill: COLORS.muted }).textContent = "Score (%)";

  const rows = DATA.map((b, i) => {
    const cy = M.top + i * ROW_H + ROW_H / 2;
    el("text", { x: M.left - 12, y: cy + 4.5, "text-anchor": "end", "font-size": 13.5, fill: COLORS.ink2 }).textContent = b.name;
    const hit = el("rect", { x: M.left, y: cy - ROW_H / 2 + 2, width: plotW, height: ROW_H - 4, fill: "transparent" });
    const bar = el("rect", { x: xScale(0), y: cy - BAR_H / 2, height: BAR_H, width: 0, rx: 4, fill: cfg.barColor });
    bar.style.transition = "width 120ms ease";
    el("line", {
      x1: xScale(b.ref), x2: xScale(b.ref),
      y1: cy - BAR_H / 2 - 5, y2: cy + BAR_H / 2 + 5,
      stroke: cfg.refColor, "stroke-width": 3, "stroke-dasharray": "3 2.5", "stroke-linecap": "round",
    });
    const valueLabel = el("text", { x: 0, y: cy + 4.5, "font-size": 12.5, "font-weight": 700, fill: cfg.barColor });
    return { bench: b, bar, valueLabel, hit };
  });

  /* ---- tooltip ---- */
  rows.forEach(r => {
    r.hit.addEventListener("mousemove", ev => {
      const s = r.bench.scores[idxOf(current)];
      tip.innerHTML =
        `<div class="tt-title">${r.bench.name}</div>` +
        `<div>score at &alpha;=${current.toFixed(1)}: <b>${s.toFixed(2)}</b></div>` +
        `<div class="tt-dim">${cfg.refName}: ${r.bench.ref.toFixed(2)}</div>` +
        `<div class="tt-dim">${cfg.tipDeltaLabel}: ${(s - r.bench.ref) >= 0 ? "+" : "−"}${Math.abs(s - r.bench.ref).toFixed(2)}</div>`;
      tip.style.left = Math.min(ev.clientX + 14, window.innerWidth - 280) + "px";
      tip.style.top = (ev.clientY + 14) + "px";
      tip.classList.add("show");
    });
    r.hit.addEventListener("mouseleave", () => tip.classList.remove("show"));
  });

  /* ---- controls & tiles ---- */
  const $ = id => document.getElementById(id);
  const slider = $(cfg.ids.slider), readout = $(cfg.ids.readout);
  const coefBase = $(cfg.ids.coefBase), coefRL = $(cfg.ids.coefRL);
  const avgTile = $(cfg.ids.avg), avgNote = $(cfg.ids.avgNote), deltaTile = $(cfg.ids.delta);
  let current = 0.0;

  function render(a) {
    a = snap(a);
    current = a;
    readout.textContent = "α = " + a.toFixed(1);
    coefBase.textContent = (1 - a).toFixed(1);
    coefRL.textContent = a.toFixed(1);
    rows.forEach(r => {
      const s = r.bench.scores[idxOf(a)];
      r.bar.setAttribute("width", Math.max(xScale(s) - xScale(0), 0));
      r.valueLabel.setAttribute("x", xScale(s) + 8);
      r.valueLabel.textContent = s.toFixed(1);
    });
    const avg = avgAt(a);
    avgTile.textContent = avg.toFixed(2);
    avgNote.textContent = cfg.note(avg, REF_AVG);
    const d = cfg.deltaOf(avg, avgAt, REF_AVG);
    deltaTile.textContent = (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(2);
  }

  slider.addEventListener("input", () => render(parseFloat(slider.value)));

  const playBtn = $(cfg.ids.play);
  let sweeping = false;
  playBtn.addEventListener("click", () => {
    if (sweeping) return;
    sweeping = true;
    playBtn.disabled = true;
    const seq = ALPHAS.concat(ALPHAS.slice(0, -1).reverse());
    let i = 0;
    const timer = setInterval(() => {
      slider.value = seq[i].toFixed(1);
      render(seq[i]);
      i += 1;
      if (i >= seq.length) { clearInterval(timer); sweeping = false; playBtn.disabled = false; }
    }, 420);
  });

  /* ---- anchor data table ---- */
  const tbody = $(cfg.ids.tableBody);
  if (tbody) {
    DATA.forEach(b => {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td>" + b.name + "</td><td>" + b.ref.toFixed(2) + "</td>" +
        b.scores.map(s => "<td>" + s.toFixed(2) + "</td>").join("");
      tbody.appendChild(tr);
    });
  }

  render(0.0);
}

/* Panel 1: RL frames fixed; Δ tile = distance to the full RL checkpoint (α=1). */
initPanel({
  data: DATA_RL_FRAMES,
  barColor: COLORS.green,
  refColor: COLORS.gray,
  refName: "base model (pre-RL)",
  tipDeltaLabel: "gain kept by RL frames",
  note: (avg, refAvg) => "+" + (avg - refAvg).toFixed(1) + " over the base model",
  deltaOf: (avg, avgAt) => avg - avgAt(1.0),
  ids: {
    chart: "alpha-chart", slider: "alpha-slider", readout: "alpha-readout",
    coefBase: "coef-base", coefRL: "coef-rl", play: "alpha-play",
    avg: "avg-at-alpha", avgNote: "avg-note", delta: "delta-vs-rl",
    tableBody: "anchor-table-body",
  },
});

/* Panel 2: SFT frames fixed; Δ tile = distance to the full RL checkpoint (rl_orig). */
initPanel({
  data: DATA_SFT_FRAMES,
  barColor: COLORS.gray,
  refColor: COLORS.green,
  refName: "full RL checkpoint",
  tipDeltaLabel: "gap to the RL checkpoint",
  note: () => "pinned at the SFT model's level (32.9) at every α",
  deltaOf: (avg, _avgAt, refAvg) => avg - refAvg,
  ids: {
    chart: "alpha-chart-sft", slider: "alpha-slider-sft", readout: "alpha-readout-sft",
    coefBase: "coef-base-sft", coefRL: "coef-rl-sft", play: "alpha-play-sft",
    avg: "avg-at-alpha-sft", avgNote: "avg-note-sft", delta: "delta-vs-rl-sft",
    tableBody: "anchor-table-body-sft",
  },
});
