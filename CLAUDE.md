# IA Jurídica por Dentro — Contexto do projeto

Landpage de pré-inscrição com checkout externo. Pedro Borges Mourão (Promotor MPRJ, autor) usa para captar leads no Grupo Premium do WhatsApp e direcionar inscrições pagas para o curso na Hotmart.

## Estado e URLs

- **Repositório:** https://github.com/pbms01/ia-juridica-por-dentro-2026 (branch `main`)
- **Pasta local:** `C:\Users\Membro\OneDrive\IAJUR-2026` (sincronizada via OneDrive)
- **Site em produção:** https://ia-juridica-por-dentro-2026.netlify.app
- **Conta GitHub:** `pbms01` · **Conta Netlify e Resend:** vinculadas ao email `pbmsto00@gmail.com`
- **Domínio do remetente de email:** `mlconvergenciadigital.com.br` (verificado na Resend, DNS gerenciado na Hostinger)
- **Página Hotmart (checkout):** `https://pbmsto01.hotmart.host/ia-juridica-por-dentro-assinatura-dcaafde5-ef9b-4b8b-affd-e56b7f97312e`

## Estrutura

```
IAJUR-2026/
├── index.html                              landpage principal (single-file HTML+CSS+JS)
├── obrigado.html                           página pós-pré-inscrição (form action='/obrigado')
├── package.json                            metadados; sem dependências (function usa fetch nativo)
├── .gitignore
├── CLAUDE.md                               este arquivo
└── netlify/
    └── functions/
        └── submission-created.js           hook Netlify, envia 2 emails via API Resend
```

O nome `submission-created.js` é convenção do Netlify para o hook de form submission — **não renomear**.

## Como o sistema funciona

1. Usuário preenche form `pre-inscricao` em `index.html` → Netlify Forms recebe (formação automática, sem código no front).
2. Netlify dispara o hook `submission-created.js` passando o payload da submissão.
3. A function valida `form_name === 'pre-inscricao'`, extrai os campos, e chama a API HTTP da Resend (`POST https://api.resend.com/emails`) duas vezes em paralelo via `Promise.allSettled`:
   - Email 1 — boas-vindas para o pré-inscrito (com link do grupo WhatsApp e instrução sobre como pedir as aulas 0 e Nivelamentos).
   - Email 2 — notificação administrativa para `NOTIFY_TO` (default `pbmsto00@gmail.com`).
4. O navegador do usuário é redirecionado para `obrigado.html`.

## Variáveis de ambiente (Netlify → Site configuration → Environment variables)

| Nome | Obrigatória | Scope | Notas |
|---|---|---|---|
| `RESEND_API_KEY` | sim | Functions | secret. Começa com `re_`. Trocar exige redeploy. |
| `SENDER_EMAIL` | não | Functions | Default no código: `ia-juridica-por-dentro@mlconvergenciadigital.com.br`. Domínio precisa estar Verified na Resend. |
| `NOTIFY_TO` | não | Functions | Default: `pbmsto00@gmail.com`. |

Há duas env vars legado (`NETLIFY_EMAILS_DIRECTORY`, `NETLIFY_EMAILS_SECRET`) de uma tentativa anterior com a feature beta "Netlify Emails" — não estão sendo lidas pelo código atual e podem ser deletadas se ficarem incomodando.

## DNS do `mlconvergenciadigital.com.br` (Hostinger)

Coexistem dois sistemas de email no mesmo domínio, em hosts distintos — **nunca consolidar**:
- **Host raiz (`@`):** webmail Hostinger (caixa `ia-juridica-por-dentro@...` recebe email). Registros: MX `mx1/mx2.hostinger.com`, TXT SPF com `include:_spf.mail.hostinger.com`, 4 registros DKIM do Hostinger (3 CNAMEs + 1 TXT), TXT `_dmarc` com `p=none`.
- **Subhost `send`:** envio outbound via Resend. Registros: MX `feedback-smtp.sa-east-1.amazonses.com` (priority 10), TXT `v=spf1 include:amazonses.com ~all`.
- **Subhost `resend._domainkey`:** chave pública DKIM da Resend (TXT iniciando com `p=MIGfMA...`).

Para promover DMARC de `p=none` para `p=quarantine` (recomendado após semanas estáveis), editar TXT `_dmarc` para `v=DMARC1; p=quarantine; rua=mailto:pbmsto00@gmail.com`.

## Operações comuns

### Push para o GitHub (deploy automático)

O Netlify monitora `main` e redeploya em qualquer push. Branch + commit + push:
```
git add .
git commit -m "Mensagem"
git push origin main
```

A partir do PC do Pedro (`C:\Users\Membro\OneDrive\IAJUR-2026`), as credenciais GitHub estão cacheadas via Credential Manager do Windows — push funciona direto.

A partir de uma sessão de agente sem credenciais (caso desta sessão), o agente precisa de Personal Access Token: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → escopo `repo`. Pedro gera e passa na conversa, agente embute na URL de origin durante o push, restaura URL limpa em seguida, e ele revoga o token depois.

### Ver logs da function

Netlify → projeto → **Logs & metrics → Functions → submission-created** → modo Real-time ou "Past hour". Logs retidos por 24h. As linhas relevantes:
- Sucesso: `Boas-vindas enviado: id=<uuid-resend>` e `Notificação interna enviada: id=<uuid-resend>`.
- Falha: `Falha no email de boas-vindas: Error: ...` — a mensagem da Resend vem propagada do `throw new Error(\`Resend API ${status}: ${msg}\`)` no helper `sendResendEmail`.

### Ver entregas no painel da Resend

resend.com → Emails (menu lateral) → lista cada envio com status `delivered`, `bounced`, `complaint`, `opened`, `clicked`. Útil para diagnóstico de deliverability.

## Decisões arquiteturais já tomadas (não revisitar sem motivo forte)

- **Resend (API HTTP) escolhida em vez de Hostinger SMTP via nodemailer.** Tentamos SMTP primeiro, falhou por questões de SPF/DKIM no domínio + complexidade de porta/auth. Resend tem deliverability nativa melhor, autentica via DKIM próprio, e elimina a dependência `nodemailer`.
- **Domínio próprio verificado na Resend** (em vez de usar `onboarding@resend.dev` sandbox). Garante remetente coerente com a marca.
- **Form do Netlify usado como armazenamento de submissões** (em vez de banco de dados). Submissões ficam acessíveis em Netlify → Forms para export.
- **Two-path landing:** entrada gratuita (Grupo Premium via pré-inscrição) e entrada paga (curso na Hotmart). Refletido visualmente no banner do alto e na seção "Planos do curso" com 3 cards.
- **Selos `.coming-badge` com variantes semânticas:** `.live` (verde, Trilha A — disponível) e `.recording` (âmbar, Trilha B — em gravação). Base cinza neutra como fallback.

## O que NÃO fazer

- Não editar diretamente registros DNS do `@` na Hostinger sem entender o impacto no webmail (vai derrubar o recebimento de email).
- Não substituir o nome do arquivo `submission-created.js` — quebra o hook do Netlify.
- Não adicionar `nodemailer` ao `package.json` de novo — código atual usa só `fetch` nativo.
- Não usar SMTP da Hostinger para envio. Resend é o canal de outbound.
- Não promover DMARC para `p=reject` sem antes passar semanas em `p=quarantine` e validar zero rejeição legítima.
- Não publicar a `RESEND_API_KEY` em commit, log público, ou arquivo do repositório.

## Histórico de commits chave

```
c866ed9  Diferencia visualmente os selos das trilhas A e B
08cd700  Troca selo da Trilha B de 'disponível' para 'em gravação'
346e244  Migra últimos 2 CTAs Hotmart para a URL nova (page de assinatura)
7c6371a  Aponta CTAs de inscrição direta para nova URL Hotmart (página de assinatura)
ad87eb4  Atualiza URL Hotmart no botão 'Conhecer o curso completo' do obrigado.html
fa523bf  Refina arquitetura de entrada: curso aberto vs. experiência pré-inscritos
a077f52  Atualiza URL do checkout Hotmart
940d1c0  Migra envio de email de Hostinger SMTP para API Resend
40ef205  Initial commit
```

## Preferências do Pedro (estilo de comunicação)

- Prosa direta, sem preâmbulo nem postâmbulo. Bullets só com paralelismo real de 3+ itens.
- Em escolhas binárias: o agente escolhe e justifica, não devolve a decisão.
- Em análises jurídicas, citar fundamento normativo inline (artigo, inciso, lei, julgado).
- Em código, comentar decisões arquiteturais não óbvias inline.
- Verificar online antes de afirmar fatos suscetíveis a mudança.
- Erros e limitações: comunicar direto, sem hedging.
