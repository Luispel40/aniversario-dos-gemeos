export const $ = (id) => document.getElementById(id);
export const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

let toastTimer;
export function toast(msg) {
  const t = $("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

export function showMsg(el, msg, ok = false) {
  el.textContent = msg; el.hidden = !msg; el.classList.toggle("ok", !!ok);
}

export function whatsHref(link, nome) {
  const first = nome ? `Oi, ${String(nome).trim().split(/\s+/)[0]}! ` : "Oi! ";
  const t = `${first}Você está convidado para o aniversário de 4 anos do Gael e do Gabriel. Abra o convite: ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(t)}`;
}
