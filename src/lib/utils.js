export const digits = (s) => String(s ?? "").replace(/\D/g, "");

export function maskCpf(v) {
  const d = digits(v).slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}
export const fmtCpf = (d) => maskCpf(digits(d).padStart(11, "0"));

export function validCpf(v) {
  const c = digits(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let s = 0;
    for (let i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}
export const validEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const firstName = (n) => String(n ?? "").trim().split(/\s+/)[0] || "";

const ENT = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ENT[c]);

export function rid() {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 10);
}

function safe(store, k, v) {
  try {
    if (v === undefined) return store.getItem(k);
    if (v === null) store.removeItem(k);
    else store.setItem(k, v);
  } catch { /* armazenamento bloqueado: segue sem */ }
  return null;
}
export const local = (k, v) => safe(localStorage, k, v);
export const session = (k, v) => safe(sessionStorage, k, v);

export function copy(text) {
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch { /* sem permissão */ }
    ta.remove();
  };
  return navigator.clipboard?.writeText
    ? navigator.clipboard.writeText(text).catch(fallback)
    : Promise.resolve(fallback());
}

export const baseUrl = () => location.href.split("#")[0].split("?")[0];
export const personalLink = (id) => `${baseUrl()}?c=${encodeURIComponent(id)}`;
