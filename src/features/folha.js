// De vez em quando uma folha seca passa voando, desfocada e perto da câmera, na frente de tudo no topo do convite.
// Cada folha nasce de uma semente aleatória (forma, cor, tamanho, desfoque e trajetória são todos diferentes).
import { REDUCED } from "../lib/ui.js";

// PRNG pequeno e determinístico a partir de uma semente de 32 bits
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const novaSemente = () => crypto.getRandomValues(new Uint32Array(1))[0];
const entre = (r, a, b) => a + r() * (b - a);

const TONS = [
  ["#c9822b", "#7a3d14"], ["#b5651d", "#6b3210"], ["#d49a3a", "#8a5018"],
  ["#a8561f", "#5c2a10"], ["#9c6b2f", "#5a3a14"], ["#c06a2b", "#74330f"],
];

function desenhaFolha(r) {
  const w = entre(r, 17, 31), skew = entre(r, -9, 9), curl = entre(r, -6, 6);
  const [claro, escuro] = TONS[(r() * TONS.length) | 0];
  const tipX = 50 + skew, tipY = entre(r, 4, 9);
  // contorno: base (50,92) até a ponta, com assimetria entre os dois lados
  const dir = `C${50 + w * 1.7} 74 ${50 + w * 1.5 + skew * 0.4 + curl} 32 ${tipX} ${tipY}`;
  const esq = `C${50 - w * 1.5 + skew * 0.4 - curl} 32 ${50 - w * 1.7} 74 50 92`;
  const contorno = `M50 92 ${dir} ${esq} Z`;

  let veias = `<path d="M50 96 L50 92 Q${50 + skew * 0.2} 50 ${tipX} ${tipY + 3}" />`;
  const pares = 4 + ((r() * 3) | 0);
  for (let i = 0; i < pares; i++) {
    const y = 80 - i * (62 / pares), x = 50 + skew * ((92 - y) / 90) * 0.5;
    const len = (w * 1.15) * (1 - i / (pares + 1.5)), up = 11 + r() * 5;
    veias += `<path d="M${x} ${y} L${x + len} ${y - up}" /><path d="M${x} ${y} L${x - len} ${y - up}" />`;
  }
  // manchas de folha seca, recortadas pelo contorno
  let manchas = "";
  const n = 5 + ((r() * 5) | 0);
  for (let i = 0; i < n; i++) {
    manchas += `<circle cx="${entre(r, 28, 72)}" cy="${entre(r, 18, 85)}" r="${entre(r, 2, 7)}" fill="${escuro}" opacity="${entre(r, 0.18, 0.45)}"/>`;
  }
  // bordas roídas
  const roidos = Array.from({ length: 2 + ((r() * 3) | 0) }, () =>
    `<circle cx="${r() < 0.5 ? entre(r, 28, 36) : entre(r, 64, 72)}" cy="${entre(r, 30, 80)}" r="${entre(r, 2, 4.5)}" fill="#000"/>`).join("");
  const id = `f${(r() * 1e9) | 0}`;

  return `<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
    <defs>
      <radialGradient id="g${id}" cx="45%" cy="40%" r="75%"><stop offset="0" stop-color="${claro}"/><stop offset="1" stop-color="${escuro}"/></radialGradient>
      <clipPath id="c${id}"><path d="${contorno}"/></clipPath>
      <mask id="m${id}"><rect width="100" height="100" fill="#fff"/>${roidos}</mask>
    </defs>
    <g mask="url(#m${id})"><path d="${contorno}" fill="url(#g${id})"/>
      <g clip-path="url(#c${id})">${manchas}</g></g>
    <g fill="none" stroke="${escuro}" stroke-width="1.1" stroke-linecap="round" opacity=".7">${veias}</g>
    <path d="M50 92 Q${50 - skew * 0.1} 97 ${48 - curl * 0.3} 100" stroke="${escuro}" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function soltarFolha(hero) {
  const r = mulberry32(novaSemente());
  const el = document.createElement("div");
  el.className = "folha";
  el.setAttribute("aria-hidden", "true");
  const tam = entre(r, 110, 220);
  el.style.cssText = `width:${tam}px;height:${tam}px;filter:blur(${entre(r, 2.5, 5).toFixed(1)}px);`;
  el.innerHTML = desenhaFolha(r);
  hero.appendChild(el);

  const W = hero.clientWidth, H = hero.clientHeight;
  const x0 = W + tam, x1 = -tam * 2;
  const y0 = entre(r, 0.08, 0.62) * H;
  const giro = entre(r, 150, 420) * (r() < 0.5 ? -1 : 1);
  const rot0 = entre(r, 0, 360);
  const passos = 9;
  const frames = [];
  // parâmetros sorteados uma vez por folha, para o voo ser suave e não aos trancos
  const P = { fb: entre(r, 2, 3.4), ab: entre(r, 25, 70), q: entre(r, 40, 160), fy: entre(r, 2, 4), ay: entre(r, 25, 60), fx: entre(r, 1.5, 3.5), ax: entre(r, 20, 50) };
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    const bal = Math.sin(t * Math.PI * P.fb) * P.ab;
    const queda = t * P.q;
    // balança de lado e de frente sem nunca ficar de perfil (senão a folha some)
    const bY = Math.sin(t * Math.PI * P.fy) * P.ay;
    const bX = Math.cos(t * Math.PI * P.fx) * P.ax;
    frames.push({
      offset: t,
      transform: `translate3d(${x0 + (x1 - x0) * t}px,${y0 + queda + bal}px,0) rotate(${rot0 + giro * t}deg) perspective(700px) rotateY(${bY}deg) rotateX(${bX}deg)`,
      opacity: i === 0 || i === passos ? 0 : 0.95,
    });
  }
  const anim = el.animate(frames, { duration: entre(r, 3200, 5600), easing: "linear", fill: "both" });
  anim.onfinish = () => el.remove();
}

export function initFolhas() {
  if (REDUCED) return;
  const hero = document.getElementById("hero");
  let visivel = true;
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(hero);

  const agendar = (min, max) => setTimeout(() => {
    if (visivel && !document.hidden && !hero.closest("[hidden]")) soltarFolha(hero);
    agendar(8000, 20000);
  }, min + Math.random() * (max - min));
  agendar(3000, 7000);
}
