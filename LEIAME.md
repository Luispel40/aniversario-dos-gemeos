# Convite Gael e Gabriel, 4 anos (Vite)

```
Convidado (sem login) ─┐
                       ├─> site (Vite) ─> Apps Script (ponte) ─> Planilha = tabela do AppSheet
Você (login e senha) ──┘                       └─> e-mails
```

O "banco" é só a tabela do AppSheet (a planilha Google por trás dela). O site não fala com o AppSheet direto
porque a API dele é de planos Enterprise e exigiria uma chave secreta dentro do código do site, o que deixaria
qualquer pessoa ler os CPFs e apagar a lista. O `apps-script/Code.gs` é uma ponte fina: lê e grava a tabela,
guarda a senha e a chave e envia os e-mails. Não há outro servidor.

## Rodar

```bash
npm install
cp .env.example .env     # preencha (veja abaixo)
npm run dev              # desenvolvimento em http://localhost:5173
npm run build            # gera a pasta dist/ para publicar
```

Sem `VITE_API_URL`, o site abre em **modo demonstração** (dados só no navegador). Login de teste: `admin` / `gael04`.

## `.env`

| Variável | O que é |
|---|---|
| `VITE_API_URL` | URL do Web App do Apps Script (termina em `/exec`) |
| `VITE_EVENTO_DATA`, `_HORA`, `_LOCAL`, `_ENDERECO`, `_MAPA`, `_OBS` | Dados da festa. Vazio aparece como "A confirmar" |

Variáveis `VITE_*` ficam visíveis no site publicado. Por isso a senha **não** está aqui, e sim no Apps Script.
Depois de mudar o `.env`, rode `npm run build` de novo.

## Backend (cerca de 15 minutos)

1. **Planilha e AppSheet.** Crie uma planilha no Google Sheets. Menu **Extensões > Apps Script**, cole `apps-script/Code.gs` e salve.
   Execute a função **setup** (autorize). Ela cria a aba **Convidados** com as colunas
   `ID, Nome, CPF, Email, Qtd Dependentes, Dependentes, Status, Origem, Criado em, Atualizado em`.
   No AppSheet, crie o app a partir dessa planilha (chave: `ID`; `Status` como Enum: Pendente, Aceito, Recusado). Não renomeie as colunas.
2. **Login e e-mail.** Em **Configurações do projeto > Propriedades do script** defina `ADMIN_USER`, `ADMIN_PASS` (senha forte; enquanto for `TROQUE-ESTA-SENHA` o login fica bloqueado), `HOST_EMAIL` (recebe os avisos) e `SITE_URL` (endereço público do site, sem barra no fim). Rode **testarEmail** uma vez.
3. **Publicar.** **Implantar > Nova implantação > Aplicativo da Web**, executar como **Eu**, acesso **Qualquer pessoa**. Cole a URL `/exec` em `VITE_API_URL`.
   Ao mudar o código: **Gerenciar implantações > Editar > Nova versão** (mantém a URL).

## Publicar o site

`npm run build` e envie a pasta `dist/` para Netlify, Vercel, Cloudflare Pages ou GitHub Pages (o build usa caminhos relativos, funciona em subpasta).

## Usar

- Painel: `seu-site/#admin` (ou "Área dos anfitriões" no rodapé).
- Compartilhe o link do convite. Quem recebe não faz login.
- **Convidar por CPF**: entra como Aceito. Ao abrir o link pessoal (Copiar link ou WhatsApp na lista) ou consultar o CPF, a pessoa vê "Oba, [nome]! Seu nome já está na lista de convidados." Com e-mail informado, recebe o aviso por e-mail.
- **Pedidos**: você recebe e-mail a cada pedido e aceita ou recusa no painel (ou direto no AppSheet). Se a pessoa deixou e-mail, é avisada ao ser aceita.

## Estrutura

```
index.html            marcação do convite e do painel
src/main.js           rotas (#admin) e inicialização
src/config.js         lê o .env
src/api/              index.js (Apps Script) e demo.js (modo demonstração)
src/features/         convite.js, admin.js, parallax.js, confete.js
src/lib/              utils.js (CPF, máscara, storage), ui.js
src/styles/main.css   tema, camadas e componentes
src/assets/           camadas do tema em WebP
apps-script/Code.gs   ponte com a tabela
```

## Cuidados

- CPF é validado pelos dígitos. Dependentes têm só nome (até 10).
- A consulta pública por CPF mostra só o primeiro nome e o status. A lista completa só aparece depois do login.
- 5 erros de login bloqueiam por 10 minutos; a sessão dura 6 horas.
- Os e-mails saem do Apps Script. Mudanças feitas direto no AppSheet não disparam e-mail (pelo que sei, os bots do AppSheet não enxergam linhas gravadas fora dele; confirme se quiser usar bots).
- CPF é dado pessoal (LGPD): compartilhe a planilha só com quem precisa e apague os dados depois da festa.
