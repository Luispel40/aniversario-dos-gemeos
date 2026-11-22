import { REDUCED } from "../lib/ui.js";

let layers = [], floats = [], hero, ticking = false, mx = 0, my = 0;

function frame() {
  ticking = false;
  const y = scrollY, vh = innerHeight;
  if (y < hero.offsetHeight * 1.1) {
    for (const l of layers) {
      l.el.style.transform = `translate3d(${(mx * l.m + y * l.hx).toFixed(1)}px,${(my * l.m * 0.5 + y * l.py).toFixed(1)}px,0)`;
    }
  }
  for (const o of floats) {
    const r = o.el.parentElement.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) continue;
    const d = r.top + r.height / 2 - vh / 2;
    if (o.el.classList.contains("peek")) o.el.style.setProperty("--lift", `${(d * o.f).toFixed(1)}px`);
    else o.el.style.transform = `translate3d(${(d * o.f * -2).toFixed(1)}px,0,0)`;
  }
}

export function requestFrame() {
  if (REDUCED || ticking) return;
  ticking = true;
  requestAnimationFrame(frame);
}

export function initParallax() {
  hero = document.getElementById("hero");
  layers = [...document.querySelectorAll("[data-py],[data-hx],[data-m]")].map((el) => ({
    el, py: +el.dataset.py || 0, hx: +el.dataset.hx || 0, m: +el.dataset.m || 0,
  }));
  floats = [...document.querySelectorAll("[data-float]")].map((el) => ({ el, f: +el.dataset.float }));
  if (REDUCED) return;
  addEventListener("scroll", requestFrame, { passive: true });
  addEventListener("resize", requestFrame);
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    mx = -(e.clientX / innerWidth - 0.5);
    my = -(e.clientY / innerHeight - 0.5);
    requestFrame();
  }, { passive: true });
  requestFrame();
}
