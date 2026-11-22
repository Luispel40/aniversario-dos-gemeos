/**
 * Convite Gael e Gabriel, 4 anos: backend em Google Apps Script.
 *
 * Fica ligado à MESMA planilha que o AppSheet usa como tabela (aba "Convidados").
 * Tudo que o site grava aparece no AppSheet, e o que você muda no AppSheet aparece no site.
 * Segredos (senha, e-mail) ficam em "Propriedades do script", nunca no site.
 *
 * Passo a passo no LEIAME.md.
 */

var SHEET_NAME = 'Convidados';
var HEADERS = ['ID', 'Nome', 'CPF', 'Email', 'Qtd Dependentes', 'Dependentes', 'Status', 'Origem', 'Criado em', 'Atualizado em'];
var TOKEN_TTL = 21600;          // login vale 6 horas (máximo do CacheService)
var MAX_FALHAS = 5;             // tentativas erradas de login
var BLOQUEIO_S = 600;           // bloqueio de 10 minutos
var SENHA_PADRAO = 'TROQUE-ESTA-SENHA';

/* ======================= CONFIGURAÇÃO (rode uma vez) ======================= */

/** Cria a aba, os cabeçalhos e as propriedades padrão. Rode manualmente 1 vez. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  // CPF, ID e datas como texto, para não perder zeros à esquerda.
  ['A:A', 'C:C', 'I:J'].forEach(function (r) { sh.getRange(r).setNumberFormat('@'); });
  sh.getRange('G2:G').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Pendente', 'Aceito', 'Recusado'], true).build());

  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('ADMIN_USER')) p.setProperty('ADMIN_USER', 'admin');
  if (!p.getProperty('ADMIN_PASS')) p.setProperty('ADMIN_PASS', SENHA_PADRAO);
  if (!p.getProperty('HOST_EMAIL')) p.setProperty('HOST_EMAIL', Session.getEffectiveUser().getEmail());
  if (!p.getProperty('SITE_URL')) p.setProperty('SITE_URL', '');
  Logger.log('Pronto. Agora abra Configurações do projeto > Propriedades do script e defina ADMIN_USER, ADMIN_PASS, HOST_EMAIL e SITE_URL.');
}

/** Rode para testar o envio de e-mail e autorizar o acesso. */
function testarEmail() {
  enviar_(cfg_('HOST_EMAIL'), 'Teste do convite', '<p>O envio de e-mail está funcionando.</p>');
}

/* ============================== ENTRADA HTTP ============================== */

function doGet() {
  return json_({ ok: true, servico: 'convite-gael-gabriel' });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (req.action) {
      case 'rsvp':      return json_(comLock_(function () { return rsvp_(req); }));
      case 'status':    return json_(status_(req));
      case 'login':     return json_(login_(req));
      case 'list':      auth_(req); return json_(lista_());
      case 'setStatus': auth_(req); return json_(comLock_(function () { return setStatus_(req); }));
      case 'invite':    auth_(req); return json_(comLock_(function () { return convidar_(req); }));
      case 'remove':    auth_(req); return json_(comLock_(function () { return remover_(req); }));
      default:          return json_(erro_('acao', 'Ação desconhecida.'));
    }
  } catch (err) {
    if (err && err.code) return json_(erro_(err.code, err.message));
    console.error(err);
    return json_(erro_('erro', 'Algo deu errado no servidor. Tente de novo.'));
  }
}

/* ================================ AÇÕES ================================ */

/** Convidado envia nome, CPF e dependentes (sem CPF dos dependentes). Público. */
function rsvp_(req) {
  var nome = limpo_(req.nome, 120);
  var cpf = cpf_(req.cpf);
  var email = limpo_(req.email, 120);
  var deps = (Array.isArray(req.dependentes) ? req.dependentes : []).map(function (d) { return limpo_(d, 80).replace(/;/g, ','); }).filter(Boolean).slice(0, 10);

  if (nome.split(' ').length < 2) throw falha_('nome', 'Informe seu nome completo.');
  if (!cpfValido_(cpf)) throw falha_('cpf', 'Esse CPF não parece válido.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw falha_('email', 'Esse e-mail não parece válido.');

  var g = achar_({ cpf: cpf });
  if (g && g.status === 'Recusado') throw falha_('recusado', 'Este CPF não pôde ser confirmado. Fale com os anfitriões.');
  if (g && g.status === 'Aceito' && g.origem !== 'Anfitrião') throw falha_('ja_aceito', 'Seu nome já está na lista. Para mudar os dependentes, fale com os anfitriões.');

  var novo = !g;
  if (novo) g = { id: novoId_(), cpf: cpf, status: 'Pendente', origem: 'Pedido', criado: agora_() };
  g.nome = nome; g.email = email || g.email || ''; g.dependentes = deps; g.atualizado = agora_();
  gravar_(g);

  var linhaDeps = deps.length ? '<p>Dependentes (' + deps.length + '): ' + esc_(deps.join(', ')) + '</p>' : '<p>Sem dependentes.</p>';
  if (g.origem === 'Anfitrião') {
    avisarAnfitriao_('Convidado confirmou presença: ' + nome,
      '<p><b>' + esc_(nome) + '</b> (convidado por você) confirmou os dados.</p>' + linhaDeps + painelLink_());
  } else {
    avisarAnfitriao_((novo ? 'Novo pedido de convite: ' : 'Pedido atualizado: ') + nome,
      '<p><b>' + esc_(nome) + '</b> pediu um convite.</p>' + linhaDeps + '<p>Abra o painel para aceitar ou recusar.</p>' + painelLink_());
  }
  var r = publico_(g); r.nomeCompleto = nome; return r;
}

/** Consulta pública por CPF ou código pessoal. Devolve só o primeiro nome. */
function status_(req) {
  var g = req.codigo ? achar_({ id: String(req.codigo) }) : achar_({ cpf: cpf_(req.cpf) });
  return g ? publico_(g) : { ok: true, found: false };
}

function login_(req) {
  var cache = CacheService.getScriptCache();
  var falhas = Number(cache.get('falhas') || 0);
  if (falhas >= MAX_FALHAS) throw falha_('bloqueado', 'Muitas tentativas. Aguarde 10 minutos e tente de novo.');
  if (cfg_('ADMIN_PASS') === SENHA_PADRAO || !cfg_('ADMIN_PASS')) throw falha_('config', 'Defina ADMIN_PASS nas Propriedades do script antes de entrar.');

  var ok = igual_(String(req.user || ''), cfg_('ADMIN_USER')) & igual_(String(req.pass || ''), cfg_('ADMIN_PASS'));
  if (!ok) {
    cache.put('falhas', String(falhas + 1), BLOQUEIO_S);
    Utilities.sleep(700);
    throw falha_('login', 'Usuário ou senha incorretos.');
  }
  cache.remove('falhas');
  var token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  cache.put('t_' + token, '1', TOKEN_TTL);
  return { ok: true, token: token };
}

function lista_() {
  return { ok: true, convidados: ler_().map(function (g) { delete g.row; return g; }) };
}

function setStatus_(req) {
  var st = String(req.status);
  if (['Pendente', 'Aceito', 'Recusado'].indexOf(st) < 0) throw falha_('status', 'Status inválido.');
  var g = achar_({ id: String(req.id) });
  if (!g) throw falha_('nao_achado', 'Convidado não encontrado.');
  var mudou = g.status !== st;
  g.status = st; g.atualizado = agora_(); gravar_(g);
  if (mudou && st === 'Aceito') notificarAceito_(g, 'aceito');
  if (mudou && st === 'Recusado') avisarAnfitriao_('Convite recusado: ' + g.nome, '<p>Você recusou o convite de <b>' + esc_(g.nome) + '</b>.</p>');
  return { ok: true };
}

/** Anfitrião convida alguém pelo CPF: entra direto na lista como Aceito. */
function convidar_(req) {
  var cpf = cpf_(req.cpf), nome = limpo_(req.nome, 120), email = limpo_(req.email, 120);
  if (!cpfValido_(cpf)) throw falha_('cpf', 'Esse CPF não parece válido.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw falha_('email', 'Esse e-mail não parece válido.');
  var g = achar_({ cpf: cpf });
  if (g && g.status === 'Aceito') throw falha_('ja_na_lista', 'Esse CPF já está na lista de convidados.');
  if (!g) g = { id: novoId_(), cpf: cpf, nome: nome, email: email, dependentes: [], origem: 'Anfitrião', criado: agora_() };
  if (nome) g.nome = nome;
  if (email) g.email = email;
  g.status = 'Aceito'; g.atualizado = agora_();
  gravar_(g);
  notificarAceito_(g, 'convidado');
  return { ok: true };
}

function remover_(req) {
  var g = achar_({ id: String(req.id) });
  if (!g) throw falha_('nao_achado', 'Convidado não encontrado.');
  sheet_().deleteRow(g.row);
  return { ok: true };
}

/* ================================ E-MAILS ================================ */

function notificarAceito_(g, motivo) {
  var site = cfg_('SITE_URL');
  var link = site ? site.replace(/\/$/, '') + '?c=' + encodeURIComponent(g.id) : '';
  var nome = g.nome || 'convidado';
  // Para o convidado (se ele deixou e-mail)
  if (g.email) {
    enviar_(g.email, 'Oba! Você está na lista do aniversário do Gael e do Gabriel',
      '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#f7e9cd;padding:24px;border-radius:16px;color:#3a2a2f">' +
      '<h2 style="color:#b03229;margin:0 0 8px">Oba' + (g.nome ? ', ' + esc_(g.nome.split(' ')[0]) : '') + '!</h2>' +
      '<p style="font-size:18px;margin:0 0 12px">Seu nome já está na lista de convidados.</p>' +
      '<p>É o aniversário de 4 anos do Gael e do Gabriel. A gente te espera!</p>' +
      (link ? '<p><a href="' + esc_(link) + '" style="color:#b03229;font-weight:bold">Abrir meu convite</a></p>' : '') + '</div>');
  }
  // Para o anfitrião
  avisarAnfitriao_((motivo === 'convidado' ? 'Convidado adicionado: ' : 'Convite aceito: ') + nome,
    '<p><b>' + esc_(nome) + '</b> ' + (motivo === 'convidado' ? 'foi convidado(a) por CPF e já está na lista.' : 'teve o convite aceito.') + '</p>' +
    (g.email ? '<p>Aviso enviado para ' + esc_(g.email) + '.</p>' : '<p>Sem e-mail cadastrado. Envie o link pessoal: ' + (link ? esc_(link) : '(defina SITE_URL)') + '</p>') + painelLink_());
}

function avisarAnfitriao_(assunto, html) {
  var to = cfg_('HOST_EMAIL');
  if (to) enviar_(to, assunto, html);
}

function painelLink_() {
  var site = cfg_('SITE_URL');
  return site ? '<p><a href="' + esc_(site.replace(/\/$/, '')) + '#admin">Abrir o painel</a></p>' : '';
}

function enviar_(to, assunto, html) {
  try {
    MailApp.sendEmail({ to: to, subject: assunto, htmlBody: html, name: 'Convite Gael e Gabriel' });
  } catch (e) {
    console.error('Falha ao enviar e-mail para ' + to + ': ' + e);   // nunca derruba a ação principal
  }
}

/* ============================ PLANILHA (AppSheet) ============================ */

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw falha_('config', 'Rode a função setup() no Apps Script antes de usar.');
  return sh;
}

function ler_() {
  var sh = sheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, HEADERS.length).getValues().map(function (r, i) {
    return {
      row: i + 2, id: String(r[0]), nome: String(r[1]), cpf: cpf_(r[2]), email: String(r[3] || ''),
      dependentes: r[5] ? String(r[5]).split(';').map(function (s) { return s.trim(); }).filter(Boolean) : [],
      status: String(r[6] || 'Pendente'), origem: String(r[7] || 'Pedido'), criado: String(r[8]), atualizado: String(r[9])
    };
  }).filter(function (g) { return g.id; });
}

function achar_(q) {
  var todos = ler_();
  for (var i = 0; i < todos.length; i++) {
    if (q.id !== undefined && todos[i].id === q.id) return todos[i];
    if (q.cpf !== undefined && todos[i].cpf === q.cpf) return todos[i];
  }
  return null;
}

function gravar_(g) {
  var sh = sheet_();
  var linha = [g.id, g.nome || '', g.cpf, g.email || '', (g.dependentes || []).length, (g.dependentes || []).join('; '),
               g.status, g.origem, g.criado, g.atualizado];
  var row = g.row || (sh.getLastRow() + 1);
  var rng = sh.getRange(row, 1, 1, HEADERS.length);
  rng.setNumberFormat('@');          // garante texto (CPF com zeros, datas)
  rng.setValues([linha]);
  sh.getRange(row, 5).setNumberFormat('0');
  sh.getRange(row, 5).setValue((g.dependentes || []).length);
  g.row = row;
}

/* ================================== UTIL ================================== */

function publico_(g) {
  return { ok: true, found: true, nome: (g.nome || '').split(' ')[0], status: g.status, qtdDependentes: (g.dependentes || []).length, origem: g.origem };
}
function auth_(req) {
  if (!req.token || !CacheService.getScriptCache().get('t_' + req.token)) throw falha_('sessao', 'Sua sessão expirou. Entre de novo.');
}
function comLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function cfg_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function erro_(code, message) { return { ok: false, code: code, message: message }; }
function falha_(code, message) { return { code: code, message: message }; }
function limpo_(s, max) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max); }
function esc_(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function agora_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function novoId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function cpf_(v) { var d = String(v == null ? '' : v).replace(/\D/g, ''); return d ? ('00000000000' + d).slice(-11) : ''; }
function igual_(a, b) {                       // comparação sem pistas de tempo
  if (a.length !== b.length) return 0;
  var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0 ? 1 : 0;
}
function cpfValido_(c) {
  if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
  for (var t = 9; t < 11; t++) {
    var s = 0; for (var i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}
