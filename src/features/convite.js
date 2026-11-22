// Parte pública do convite: dados da festa, formulário de presença e consulta por CPF.
import { call } from "../api/index.js";
import { EVENTO } from "../config.js";
import { $, REDUCED, showMsg } from "../lib/ui.js";
import { digits, esc, local, maskCpf, validCpf, validEmail } from "../lib/utils.js";
import { confete } from "./confete.js";

let depN = 0;
let ultimoConfete = "";

function renderEvento() {
  const e = EVENTO;
  const rows = [["Data", e.data], ["Horário", e.hora], ["Local", e.local], ["Endereço", e.endereco], ["Aviso", e.obs]];
  $("eventoInfo").innerHTML = rows
    .filter((r, i) => i < 4 || r[1])
    .map(([label, v]) => {
      let html = v ? esc(v) : "A confirmar";
      if (label === "Endereço" && v && /^https?:\/\//.test(e.mapa)) {
        html += ` <a href="${esc(e.mapa)}" target="_blank" rel="noopener">Abrir no mapa</a>`;
      }
      return `<div><dt>${label}</dt><dd${v ? "" : ' class="tbd"'}>${html}</dd></div>`;
    }).join("");
}

function renderDeps() {
  const box = $("depLista");
  const vals = [...box.querySelectorAll("input")].map((i) => i.value);
  box.innerHTML = "";
  for (let i = 0; i < depN; i++) {
    const inp = document.createElement("input");
    inp.type = "text"; inp.id = `dep${i + 1}`; inp.maxLength = 80; inp.autocomplete = "off";
    inp.placeholder = `Nome do dependente ${i + 1}`;
    inp.setAttribute("aria-label", `Nome do dependente ${i + 1}`);
    inp.value = vals[i] || "";
    box.appendChild(inp);
  }
  $("depQtd").textContent = depN;
  $("depLabel").textContent = depN === 0 ? "Vou sozinho(a)" : depN === 1 ? "1 dependente" : `${depN} dependentes`;
  $("depMenos").disabled = depN === 0;
  $("depMais").disabled = depN >= 10;
}

function showResultado(r) {
  const box = $("resultado");
  box.hidden = false; box.className = "resultado";
  if (!r.found) {
    box.innerHTML = "<h4>Não encontramos esse CPF</h4><p>Preencha o formulário acima para pedir seu convite.</p>";
    return;
  }
  const nome = esc(r.nome), n = r.qtdDependentes || 0;
  const dep = n ? `<p>Com você: ${n} ${n === 1 ? "dependente" : "dependentes"}.</p>` : "";
  if (r.status === "Aceito") {
    box.classList.add("aceito");
    box.innerHTML = `<h4>Oba${nome ? ", " + nome : ""}! Seu nome já está na lista de convidados.</h4>
      <p>Anote aí: vai ter muita corrida, bolo e festa. A gente te espera!</p>${dep}
      <div class="pillrow"><span class="pill aceito">Convite aceito</span></div>`;
    if (ultimoConfete !== r.nome) { ultimoConfete = r.nome; confete(); }
  } else if (r.status === "Pendente") {
    box.classList.add("pendente");
    box.innerHTML = `<h4>${nome ? nome + ", recebemos" : "Recebemos"} seu pedido</h4>
      <p>Os anfitriões vão analisar. Volte aqui e consulte seu CPF para ver a resposta.</p>${dep}
      <div class="pillrow"><span class="pill pendente">Aguardando resposta</span></div>`;
  } else {
    box.classList.add("recusado");
    box.innerHTML = `<h4>Não conseguimos reservar seu lugar</h4><p>Fale com os anfitriões se quiser entender melhor.</p>
      <div class="pillrow"><span class="pill recusado">Não aceito</span></div>`;
  }
}

async function consultar(q) {
  const b = $("resultado");
  b.hidden = false; b.className = "resultado"; b.innerHTML = "<p>Procurando seu convite...</p>";
  try {
    const r = await call("status", q);
    showResultado(r);
    if (r.found && q.cpf) local("convite_cpf", q.cpf);
  } catch (er) {
    b.innerHTML = `<h4>Não deu certo</h4><p>${esc(er.message)}</p>`;
  }
}

function enviarForm() {
  const msg = $("rsvpMsg");
  const nome = $("fNome").value.trim().replace(/\s+/g, " ");
  const cpf = $("fCpf").value, email = $("fEmail").value.trim();
  [$("fNome"), $("fCpf"), $("fEmail")].forEach((i) => i.removeAttribute("aria-invalid"));
  const deps = [...$("depLista").querySelectorAll("input")].map((i) => i.value.trim());

  let err = null, bad = null;
  if (nome.split(" ").length < 2 || nome.length < 5) { err = "Informe seu nome completo."; bad = $("fNome"); }
  else if (!validCpf(cpf)) { err = "Esse CPF não parece válido. Confira os números."; bad = $("fCpf"); }
  else if (!validEmail(email)) { err = "Esse e-mail não parece válido. Corrija ou deixe em branco."; bad = $("fEmail"); }
  else if (deps.some((d) => !d)) err = "Preencha o nome de cada dependente ou diminua a quantidade.";
  if (err) {
    showMsg(msg, err);
    if (bad) { bad.setAttribute("aria-invalid", "true"); bad.focus(); }
    return;
  }
  showMsg(msg, "");
  const btn = $("rsvpBtn");
  btn.disabled = true; btn.textContent = "Enviando...";
  call("rsvp", { nome, cpf: digits(cpf), email, dependentes: deps })
    .then((r) => {
      local("convite_cpf", digits(cpf));
      showMsg(msg, "Pronto! Seu pedido foi enviado. Veja a resposta logo abaixo.", true);
      $("lCpf").value = maskCpf(cpf);
      showResultado(r);
      $("consulta").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    })
    .catch((er) => showMsg(msg, er.message))
    .finally(() => { btn.disabled = false; btn.textContent = "Enviar minha confirmação"; });
}

export function initPublic() {
  renderEvento();
  renderDeps();

  for (const id of ["fCpf", "lCpf", "iCpf"]) {
    $(id).addEventListener("input", (e) => {
      e.target.value = maskCpf(e.target.value);
      e.target.removeAttribute("aria-invalid");
    });
  }
  $("depMais").addEventListener("click", () => {
    if (depN < 10) { depN++; renderDeps(); $(`dep${depN}`)?.focus(); }
  });
  $("depMenos").addEventListener("click", () => { if (depN > 0) { depN--; renderDeps(); } });

  document.querySelectorAll("[data-scroll]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      $(a.dataset.scroll)?.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    });
  });

  $("rsvpForm").addEventListener("submit", (e) => { e.preventDefault(); enviarForm(); });

  $("lookupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const c = $("lCpf").value;
    if (!validCpf(c)) {
      $("lCpf").setAttribute("aria-invalid", "true");
      const b = $("resultado");
      b.hidden = false; b.className = "resultado";
      b.innerHTML = "<h4>CPF inválido</h4><p>Confira os números e tente de novo.</p>";
      return;
    }
    consultar({ cpf: digits(c) });
  });

  // link pessoal (?c=codigo ou #c-codigo) ou CPF lembrado neste aparelho
  const m = /[?&]c=([A-Za-z0-9]+)/.exec(location.search) || /^#c-([A-Za-z0-9]+)$/.exec(location.hash);
  if (m) {
    consultar({ codigo: m[1] });
    setTimeout(() => $("consulta").scrollIntoView({ block: "center" }), 400);
  } else {
    const saved = local("convite_cpf");
    if (saved && validCpf(saved)) { $("lCpf").value = maskCpf(saved); consultar({ cpf: saved }); }
  }
}
