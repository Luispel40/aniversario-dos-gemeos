// Painel dos anfitriões: login, lista, aceitar/recusar, convidar por CPF.
import { call, isDemo } from "../api/index.js";
import { DEMO_PASS, DEMO_USER } from "../api/demo.js";
import { $, showMsg, toast, whatsHref } from "../lib/ui.js";
import { baseUrl, copy, digits, esc, firstName, fmtCpf, personalLink, session, validCpf, validEmail } from "../lib/utils.js";

let token = session("convite_token");
let dados = [];
let filtro = "todos";
let poll = null;

const ORDEM = { Pendente: 0, Aceito: 1, Recusado: 2 };
const CLASSE = { Pendente: "pendente", Aceito: "aceito", Recusado: "recusado" };
const ROTULO = { Pendente: "Pendente", Aceito: "Aceito", Recusado: "Recusado" };

export function stopPolling() { clearInterval(poll); }

export function showAdmin() {
  $("loginCard").hidden = !!token;
  $("painel").hidden = !token;
  $("demoBadge").hidden = !isDemo || !token;
  $("demoHint").hidden = !isDemo;
  if (isDemo) $("demoHint").textContent = `Modo demonstração: usuário ${DEMO_USER}, senha ${DEMO_PASS}.`;
  stopPolling();
  if (!token) return;
  $("siteLink").value = baseUrl();
  $("btnWhatsSite").href = whatsHref(baseUrl());
  carregar();
  poll = setInterval(() => { if (!document.hidden) carregar(true); }, 30000);
}

async function carregar(silent) {
  try {
    const r = await call("list", { token });
    dados = r.convidados || [];
    desenhar();
  } catch (er) {
    if (er.code === "sessao") { sair(); showMsg($("loginMsg"), "Sua sessão expirou. Entre de novo."); }
    else if (!silent) toast(er.message);
  }
}

const pessoas = (g) => 1 + (g.dependentes?.length || 0);

function desenhar() {
  const c = { Aceito: 0, Pendente: 0, Recusado: 0 };
  let ppl = 0;
  for (const g of dados) {
    c[g.status] = (c[g.status] || 0) + 1;
    if (g.status === "Aceito") ppl += pessoas(g);
  }
  $("stats").innerHTML =
    `<div class="stat main"><b>${ppl}</b><span>Pessoas confirmadas</span></div>
     <div class="stat"><b>${c.Pendente}</b><span>Aguardando você</span></div>
     <div class="stat"><b>${c.Aceito}</b><span>Convites aceitos</span></div>
     <div class="stat"><b>${c.Recusado}</b><span>Recusados</span></div>`;

  const tabs = [["todos", "Todos", dados.length], ["Pendente", "Pendentes", c.Pendente], ["Aceito", "Aceitos", c.Aceito], ["Recusado", "Recusados", c.Recusado]];
  $("filtros").innerHTML = tabs.map(([k, nome, n]) =>
    `<button class="chip" role="tab" data-f="${k}" aria-selected="${filtro === k}">${nome} (${n})</button>`).join("");

  const vis = dados
    .filter((g) => filtro === "todos" || g.status === filtro)
    .sort((a, b) => (ORDEM[a.status] - ORDEM[b.status]) || String(b.criado).localeCompare(String(a.criado)));
  $("lista").innerHTML = vis.length
    ? vis.map(card).join("")
    : `<div class="vazio">${dados.length ? "Ninguém nesta aba." : "Nenhum convidado ainda. Use “Convidar por CPF” ou compartilhe o link do convite."}</div>`;
}

function card(g) {
  const id = esc(g.id), st = g.status;
  const deps = g.dependentes?.length
    ? `<p class="g-deps"><b>Dependentes (${g.dependentes.length}):</b> ${g.dependentes.map(esc).join(", ")}</p>` : "";
  let acts = "";
  if (st !== "Aceito") acts += `<button class="btn small good" data-a="Aceito" data-id="${id}">Aceitar</button>`;
  if (st !== "Recusado") acts += `<button class="btn small bad" data-a="Recusado" data-id="${id}">Recusar</button>`;
  acts += `<button class="btn small ghost" data-a="link" data-id="${id}">Copiar link</button>`;
  acts += `<a class="btn small whats" target="_blank" rel="noopener" href="${esc(whatsHref(personalLink(g.id), g.nome))}">WhatsApp</a>`;
  acts += `<button class="btn small ghost" data-a="del" data-id="${id}">Excluir</button>`;
  return `<article class="g">
    <div class="g-top">
      <div><p class="g-nome">${esc(g.nome || "(sem nome)")}</p>
        <p class="g-sub">CPF ${esc(fmtCpf(g.cpf))}${g.email ? " · " + esc(g.email) : ""}</p></div>
      <div><span class="pill ${CLASSE[st]}">${ROTULO[st]}</span>
        <span class="pill origem">${g.origem === "Anfitrião" ? "Convidado por você" : "Pediu o convite"}</span></div>
    </div>${deps}<div class="g-actions">${acts}</div></article>`;
}

function sair() {
  token = null; session("convite_token", null); dados = [];
  showAdmin();
}

export function initAdmin() {
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = $("loginBtn"), msg = $("loginMsg");
    showMsg(msg, "");
    const user = $("aUser").value.trim(), pass = $("aPass").value;
    if (!user || !pass) { showMsg(msg, "Informe usuário e senha."); return; }
    b.disabled = true; b.textContent = "Entrando...";
    try {
      const r = await call("login", { user, pass });
      token = r.token; session("convite_token", token);
      $("aPass").value = "";
      showAdmin();
    } catch (er) { showMsg(msg, er.message); }
    b.disabled = false; b.textContent = "Entrar";
  });

  $("btnSair").addEventListener("click", sair);
  $("btnAtualizar").addEventListener("click", () => carregar().then(() => toast("Lista atualizada")));
  $("btnCopiarSite").addEventListener("click", () => copy(baseUrl()).then(() => toast("Link copiado")));

  $("inviteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("inviteMsg");
    const cpf = $("iCpf").value, nome = $("iNome").value.trim(), email = $("iEmail").value.trim();
    if (!validCpf(cpf)) { showMsg(msg, "Esse CPF não parece válido. Confira os números."); $("iCpf").focus(); return; }
    if (!validEmail(email)) { showMsg(msg, "Esse e-mail não parece válido."); return; }
    showMsg(msg, "");
    try {
      await call("invite", { token, cpf: digits(cpf), nome, email });
      $("inviteForm").reset();
      toast(`Convidado${nome ? ": " + firstName(nome) : ""}`);
      filtro = "todos";
      await carregar();
    } catch (er) { showMsg(msg, er.message); }
  });

  $("filtros").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]");
    if (b) { filtro = b.dataset.f; desenhar(); }
  });

  $("lista").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const { id, a } = b.dataset;
    try {
      if (a === "link") { await copy(personalLink(id)); toast("Link do convidado copiado"); return; }
      if (a === "del") {
        if (b.dataset.sure !== "1") {
          b.dataset.sure = "1"; b.textContent = "Confirmar exclusão"; b.classList.add("bad");
          setTimeout(() => { if (b.isConnected) { b.dataset.sure = ""; b.textContent = "Excluir"; b.classList.remove("bad"); } }, 4000);
          return;
        }
        await call("remove", { token, id });
        toast("Convidado excluído");
        await carregar();
        return;
      }
      b.disabled = true;
      await call("setStatus", { token, id, status: a });
      toast(a === "Aceito" ? "Convite aceito" : "Convite recusado");
      await carregar();
    } catch (er) { toast(er.message); b.disabled = false; }
  });
}
