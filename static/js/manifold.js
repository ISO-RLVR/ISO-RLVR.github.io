/* ============================================================
   Self-playing manifold animation for the ISO principle:
   a wireframe ellipsoid (schematic Stiefel manifold), a moving
   point U_t on its surface, the tangent plane T_{U_t} anchored
   at that point, a tentative optimizer step in the tangent
   plane (orange) and the polar retraction back to the surface
   (red dashed). Two instances: U (blue, oblate) and V (green,
   prolate). Vanilla canvas, no dependencies.
   ============================================================ */

(function () {
  const TAU = Math.PI * 2;

  function vec(x, y, z) { return { x, y, z }; }
  function add(a, b) { return vec(a.x + b.x, a.y + b.y, a.z + b.z); }
  function sub(a, b) { return vec(a.x - b.x, a.y - b.y, a.z - b.z); }
  function scale(a, s) { return vec(a.x * s, a.y * s, a.z * s); }
  function norm(a) { return Math.hypot(a.x, a.y, a.z); }
  function unit(a) { const n = norm(a) || 1; return scale(a, 1 / n); }
  function cross(a, b) {
    return vec(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  }

  function initManifold(canvasId, cfg) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const SIZE = 250;
    const DPR = window.devicePixelRatio || 1;
    canvas.width = SIZE * DPR;
    canvas.height = SIZE * DPR;
    canvas.style.width = SIZE + "px";
    canvas.style.height = SIZE + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(DPR, DPR);

    const [A, B, C] = cfg.axes;              // ellipsoid semi-axes (x right, y up, z depth)
    const CX = SIZE / 2, CY = SIZE / 2 + 4, S = cfg.scale; // screen center & scale

    // camera: rotate about y (azimuth) then x (elevation); front = z > 0
    const az = cfg.azim, elv = cfg.elev;
    const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(elv), se = Math.sin(elv);
    function rot(p) {
      const x1 = ca * p.x + sa * p.z, z1 = -sa * p.x + ca * p.z;
      const y2 = ce * p.y - se * z1, z2 = se * p.y + ce * z1;
      return vec(x1, y2, z2);
    }
    function proj(p) { const r = rot(p); return { x: CX + S * r.x, y: CY - S * r.y, z: r.z }; }

    // sphere param (phi latitude, theta longitude) -> ellipsoid surface
    function surf(th, ph) {
      return vec(A * Math.cos(ph) * Math.cos(th), B * Math.sin(ph), C * Math.cos(ph) * Math.sin(th));
    }
    function normalAt(p) { return unit(vec(p.x / (A * A), p.y / (B * B), p.z / (C * C))); }

    // trajectory on the surface
    function path(t) {
      const th = cfg.path.th0 + (cfg.path.th1 - cfg.path.th0) * t;
      const ph = cfg.path.ph0 + (cfg.path.ph1 - cfg.path.ph0) * t + 0.07 * Math.sin(4 * Math.PI * t);
      return surf(th, ph);
    }

    /* ---- static geometry: silhouette hull + wireframe polylines ---- */
    const hullPts = [];
    for (let i = 0; i < 26; i++) for (let j = 1; j < 13; j++) {
      hullPts.push(proj(surf((i / 26) * TAU, -Math.PI / 2 + (j / 13) * Math.PI)));
    }
    function convexHull(pts) {
      pts = pts.slice().sort((p, q) => p.x - q.x || p.y - q.y);
      const cross2 = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
      const lo = [], up = [];
      for (const p of pts) {
        while (lo.length >= 2 && cross2(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
        lo.push(p);
      }
      for (const p of pts.slice().reverse()) {
        while (up.length >= 2 && cross2(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
        up.push(p);
      }
      return lo.slice(0, -1).concat(up.slice(0, -1));
    }
    const hull = convexHull(hullPts);

    const wires = [];  // arrays of projected points
    for (let j = 1; j < 6; j++) { // latitudes
      const ph = -Math.PI / 2 + (j / 6) * Math.PI, line = [];
      for (let i = 0; i <= 72; i++) line.push(proj(surf((i / 72) * TAU, ph)));
      wires.push(line);
    }
    for (let i = 0; i < 9; i++) {  // longitudes
      const th = (i / 9) * TAU, line = [];
      for (let j = 0; j <= 48; j++) line.push(proj(surf(th, -Math.PI / 2 + (j / 48) * Math.PI)));
      wires.push(line);
    }

    function strokeWire(line, frontAlpha, backAlpha) {
      for (let k = 0; k < line.length - 1; k++) {
        const a = line[k], b = line[k + 1];
        ctx.globalAlpha = (a.z + b.z) / 2 > 0 ? frontAlpha : backAlpha;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function arrowHead(from, to, size, color) {
      const dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - size * ux + size * 0.5 * uy, to.y - size * uy - size * 0.5 * ux);
      ctx.lineTo(to.x - size * ux - size * 0.5 * uy, to.y - size * uy + size * 0.5 * ux);
      ctx.closePath(); ctx.fill();
    }

    function star(px, py, r, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : r * 0.45;
        const a = -Math.PI / 2 + (i / 10) * TAU;
        ctx[i === 0 ? "moveTo" : "lineTo"](px + rr * Math.cos(a), py + rr * Math.sin(a));
      }
      ctx.closePath(); ctx.fill();
    }

    /* ---- animation ---- */
    const DUR = 9000, HOLD = 1400;
    let start = null;

    function frame(now) {
      if (start === null) start = now;
      let t = ((now - start) % (DUR + HOLD)) / DUR;
      if (t > 1) t = 1;

      ctx.clearRect(0, 0, SIZE, SIZE);

      // silhouette fill
      ctx.beginPath();
      hull.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = cfg.fill;
      ctx.fill();

      // wireframe
      ctx.strokeStyle = cfg.wire;
      ctx.lineWidth = 0.8;
      wires.forEach(l => strokeWire(l, 0.5, 0.16));

      // trail up to t (dashed)
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      const N = Math.max(2, Math.floor(60 * t));
      for (let i = 0; i <= N; i++) {
        const p = proj(path((i / N) * t));
        ctx[i ? "lineTo" : "moveTo"](p.x, p.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // current point & tangent frame
      const p3 = path(t);
      const n = normalAt(p3);
      const ahead3 = path(Math.min(t + 0.045, 1));
      let dir = sub(ahead3, p3);
      dir = unit(sub(dir, scale(n, dir.x * n.x + dir.y * n.y + dir.z * n.z))); // project into tangent plane
      const e1 = dir, e2 = unit(cross(n, e1));

      // tangent plane quad
      const h = cfg.planeHalf;
      const corners = [
        add(p3, add(scale(e1, h), scale(e2, h))),
        add(p3, sub(scale(e1, h), scale(e2, h))),
        sub(p3, add(scale(e1, h), scale(e2, h))),
        sub(p3, sub(scale(e1, h), scale(e2, h))),
      ].map(proj);
      ctx.beginPath();
      corners.forEach((c, i) => ctx[i ? "lineTo" : "moveTo"](c.x, c.y));
      ctx.closePath();
      ctx.fillStyle = "rgba(120,130,145,0.28)";
      ctx.fill();
      ctx.strokeStyle = "rgba(90,100,115,0.65)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const P = proj(p3);

      if (t < 1) {
        // tentative update in the tangent plane (orange) ...
        const tip3 = add(p3, scale(e1, cfg.planeHalf * 0.92));
        const T = proj(tip3);
        ctx.strokeStyle = "#d9530b";
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(T.x, T.y); ctx.stroke();
        arrowHead(P, T, 7, "#d9530b");

        // ... then polar retraction back to the surface (red dashed)
        const R = proj(path(Math.min(t + 0.06, 1)));
        ctx.strokeStyle = "#c62828";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3.5]);
        ctx.beginPath(); ctx.moveTo(T.x, T.y); ctx.lineTo(R.x, R.y); ctx.stroke();
        ctx.setLineDash([]);
        arrowHead(T, R, 6, "#c62828");
      }

      // goal star at the end of the trajectory
      function subLabel(lab, x, y) {
        ctx.fillStyle = cfg.color;
        ctx.font = "italic 15px Georgia, serif";
        ctx.fillText(lab.main, x, y);
        const w = ctx.measureText(lab.main).width;
        ctx.font = "italic 10px Georgia, serif";
        ctx.fillText(lab.sub, x + w + 1, y + 3);
      }
      const G = proj(path(1));
      star(G.x, G.y, 8, cfg.color);
      subLabel(cfg.labelEnd, G.x + cfg.endLabelDx, G.y + cfg.endLabelDy);

      // moving-point marker + label (label hidden once it reaches the goal star)
      ctx.fillStyle = cfg.color;
      ctx.beginPath(); ctx.arc(P.x, P.y, 4.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(P.x, P.y, 4.5, 0, TAU); ctx.stroke();
      if (t < 0.9) subLabel(cfg.labelMove, P.x + 9, P.y - 9);

      requestAnimationFrame(frame);
    }

    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      start = 0;
      frame(DUR * 0.55);        // draw one representative static frame
    } else {
      requestAnimationFrame(frame);
    }
  }

  initManifold("manifold-u", {
    axes: [1.32, 0.62, 0.95],
    scale: 82,
    azim: -0.55, elev: 0.38,
    color: "#2b5aa7",
    fill: "rgba(112,140,190,0.16)",
    wire: "#6b83ad",
    planeHalf: 0.42,
    path: { th0: -2.55, th1: -0.75, ph0: -0.55, ph1: 0.62 },
    labelMove: { main: "U", sub: "t" },
    labelEnd: { main: "U", sub: "RL" },
    endLabelDx: 10, endLabelDy: -8,
  });

  initManifold("manifold-v", {
    axes: [0.78, 1.28, 0.68],
    scale: 80,
    azim: 0.5, elev: 0.32,
    color: "#1a7f37",
    fill: "rgba(120,170,135,0.16)",
    wire: "#79a389",
    planeHalf: 0.42,
    path: { th0: 2.3, th1: 0.6, ph0: -0.6, ph1: 0.55 },
    labelMove: { main: "V", sub: "t" },
    labelEnd: { main: "V", sub: "RL" },
    endLabelDx: 10, endLabelDy: -8,
  });
})();
