// Modo demonstração: mesmas regras do Apps Script, guardadas no navegador.
import { digits, firstName, rid, local } from "../lib/utils.js";

const DB_KEY = "convite_demo_db";
export const DEMO_USER = "admin";
export const DEMO_PASS = "gael04";

function load() {
  try { const raw = local(DB_KEY); if (raw) return JSON.parse(raw); } catch { /* recria */ }
  const now = new Date().toISOString();
  return [
    { id: "exemplo001", nome: "Exemplo: Maria Souza", cpf: "11144477735", email: "", dependentes: ["Pedro (5 anos)", "Lia (3 anos)"], status: "Pendente", origem: "Pedido", criado: now, exemplo: true },
    { id: "exemplo002", nome: "Exemplo: Carlos Lima", cpf: "52998224725", email: "", dependentes: [], status: "Aceito", origem: "Anfitrião", criado: now, exemplo: true },
  ];
}
const save = (db) => local(DB_KEY, JSON.stringify(db));
const fail = (code, message) => Promise.reject({ code, message });
const pub = (g) => ({ ok: true, found: true, nome: firstName(g.nome), status: g.status, qtdDependentes: g.dependentes.length, origem: g.origem });

export function demo(action, p) {
  const db = load();
  const now = new Date().toISOString();
  const byCpf = (c) => db.find((x) => x.cpf === digits(c));
  const byId = (id) => db.find((x) => x.id === id);
  let g;
  switch (action) {
    case "status":
      g = p.codigo ? byId(p.codigo) : byCpf(p.cpf);
      return Promise.resolve(g ? pub(g) : { ok: true, found: false });
    case "rsvp":
      g = byCpf(p.cpf);
      if (g?.status === "Recusado") return fail("recusado", "Este CPF não pôde ser confirmado. Fale com os anfitriões.");
      if (g?.status === "Aceito" && g.origem !== "Anfitrião") return fail("ja_aceito", "Seu nome já está na lista. Para mudar os dependentes, fale com os anfitriões.");
      if (!g) { g = { id: rid(), cpf: digits(p.cpf), status: "Pendente", origem: "Pedido", criado: now }; db.push(g); }
      Object.assign(g, { nome: p.nome, email: p.email || g.email || "", dependentes: p.dependentes || [], atualizado: now });
      save(db);
      return Promise.resolve(pub(g));
    case "login":
      return p.user === DEMO_USER && p.pass === DEMO_PASS
        ? Promise.resolve({ ok: true, token: "demo" })
        : fail("login", "Usuário ou senha incorretos.");
    case "list":
      return Promise.resolve({ ok: true, convidados: db });
    case "setStatus":
      g = byId(p.id);
      if (!g) return fail("nao_achado", "Convidado não encontrado.");
      Object.assign(g, { status: p.status, atualizado: now });
      save(db);
      return Promise.resolve({ ok: true });
    case "invite":
      g = byCpf(p.cpf);
      if (g?.status === "Aceito") return fail("ja_na_lista", "Esse CPF já está na lista de convidados.");
      if (g) { g.status = "Aceito"; g.atualizado = now; if (p.nome) g.nome = p.nome; }
      else db.push({ id: rid(), nome: p.nome || "", cpf: digits(p.cpf), email: p.email || "", dependentes: [], status: "Aceito", origem: "Anfitrião", criado: now });
      save(db);
      return Promise.resolve({ ok: true });
    case "remove":
      save(db.filter((x) => x.id !== p.id));
      return Promise.resolve({ ok: true });
    default:
      return fail("acao", "Ação desconhecida.");
  }
}
