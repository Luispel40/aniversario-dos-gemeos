import { REDUCED } from "../lib/ui.js";

const CORES = ["#f4b53f", "#b03229", "#6b6a2d", "#fff3dc", "#e8695a", "#6a5a8c"];

export function confete() {
  if (REDUCED) return;
  const c = document.getElementById("confete");
  const x = c.getContext("2d");
  const W = (c.width = innerWidth), H = (c.height = innerHeight);
  const ps = Array.from({ length: 90 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.55,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 15 - 5,
    s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: CORES[(Math.random() * CORES.length) | 0],
  }));
  const t0 = performance.now();
  const step = (t) => {
    x.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += p.vr;
      x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c;
      x.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); x.restore();
    }
    if (t - t0 < 2600) requestAnimationFrame(step); else x.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(step);
}
