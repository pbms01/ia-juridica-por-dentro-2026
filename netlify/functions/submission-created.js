// netlify/functions/submission-created.js
//
// Dispara automaticamente quando o Netlify recebe uma submissão do form
// "pre-inscricao". Envia dois emails via SMTP da Hostinger:
//   1) Para o pré-inscrito: texto de boas-vindas + link do grupo no WhatsApp
//   2) Para pbmsto00@gmail.com: resumo administrativo da pré-inscrição
//
// Variáveis de ambiente obrigatórias no painel do Netlify:
//   SMTP_HOST    smtp.hostinger.com  (ou smtp.titan.email se a conta for Titan)
//   SMTP_PORT    465  (SSL) ou 587 (STARTTLS) - pegar no hPanel da Hostinger
//   SMTP_USER    ia-juridica-por-dentro@mlconvergenciadigital.com.br
//   SMTP_PASS    senha do email (a mesma usada para login no webmail)
//   NOTIFY_TO    pbmsto00@gmail.com  (email pessoal que recebe notificações)
//
// O nome do arquivo (submission-created.js) é convenção do Netlify para
// hook de form submission, não renomear.

const nodemailer = require('nodemailer');

const SENDER_EMAIL = 'ia-juridica-por-dentro@mlconvergenciadigital.com.br';
const SENDER_NAME = 'IA Jurídica por Dentro';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let payload;
  try {
    const body = JSON.parse(event.body);
    payload = body.payload;
  } catch (err) {
    console.error('Erro ao parsear payload:', err);
    return { statusCode: 400, body: 'Invalid payload' };
  }

  if (!payload || payload.form_name !== 'pre-inscricao') {
    return { statusCode: 200, body: 'Ignored: not pre-inscricao form' };
  }

  const data = payload.data || {};
  const email = data.email;
  const nome = data.nome || 'colega';
  const whatsapp = data.whatsapp || '(não informado)';
  const perfil = data.perfil || '(não informado)';
  const usoIa = data.uso_ia || '(não informado)';
  const dor = data.dor || '(em branco)';

  if (!email) {
    console.error('Submissão sem email:', payload);
    return { statusCode: 400, body: 'Missing email' };
  }

  // Configurar transporter SMTP
  // A porta 465 usa SSL direto (secure: true).
  // A porta 587 usa STARTTLS (secure: false, mas STARTTLS é negociado).
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // ============================================================
  // EMAIL 1 — boas-vindas para o pré-inscrito
  // ============================================================
  const welcomeText = `Seja bem-vindo!

Este é o primeiro passo para uma jornada de autonomia e governança no uso responsável de Inteligência Artificial no Direito.

Afinal, existe o JEITO CERTO do jurídico aprender IA, e este caminho é pela LINGUAGEM, e não pela computação.

Entre no Grupo Premium de pré-inscritos e comece sua jornada com acesso às ricas conversas do grupo, aos #30 nivelamentos e às 2 aulas fundacionais de configuração do app Claude para computador e laptop:

https://chat.whatsapp.com/JhqdiVzZKgb8I3eEfOLjhf

Até breve,
Pedro Borges Mourão
IA Jurídica por Dentro`;

  const welcomeHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.6">

<p style="font-size:18px;font-weight:600;margin-bottom:18px">Seja bem-vindo!</p>

<p>Este é o primeiro passo para uma jornada de <strong>autonomia e governança no uso responsável de Inteligência Artificial no Direito</strong>.</p>

<p>Afinal, existe o <strong>JEITO CERTO</strong> do jurídico aprender IA, e este caminho é pela <strong>LINGUAGEM</strong>, e não pela computação.</p>

<p>Entre no <strong>Grupo Premium de pré-inscritos</strong> e comece sua jornada com acesso às ricas conversas do grupo, aos #30 nivelamentos e às 2 aulas fundacionais de configuração do app Claude para computador e laptop:</p>

<p style="margin:28px 0">
  <a href="https://chat.whatsapp.com/JhqdiVzZKgb8I3eEfOLjhf"
     style="display:inline-block;background:#25d366;color:#fff;padding:14px 26px;border-radius:6px;text-decoration:none;font-weight:600">
    Entrar no Grupo Premium no WhatsApp
  </a>
</p>

<p>Se o botão não funcionar, copie e cole este link:<br>
<a href="https://chat.whatsapp.com/JhqdiVzZKgb8I3eEfOLjhf" style="color:#ff5c1a;word-break:break-all">https://chat.whatsapp.com/JhqdiVzZKgb8I3eEfOLjhf</a></p>

<p style="margin-top:32px">Até breve,<br>
<strong>Pedro Borges Mourão</strong><br>
<span style="color:#666">IA Jurídica por Dentro</span></p>

<hr style="border:0;border-top:1px solid #e0e0e0;margin:32px 0 16px">
<p style="font-size:12px;color:#888">
  Você está recebendo este email porque se pré-inscreveu no Grupo Premium pelo site
  ia-juridica-por-dentro-2026.netlify.app. Em caso de dúvida, responda este email.
</p>

</body>
</html>`;

  // ============================================================
  // EMAIL 2 — notificação administrativa para Pedro
  // ============================================================
  const notifyEmail = process.env.NOTIFY_TO || 'pbmsto00@gmail.com';
  const adminText = `Nova pré-inscrição no Grupo Premium · IA Jurídica por Dentro

Nome: ${nome}
Email: ${email}
WhatsApp: ${whatsapp}
Perfil: ${perfil}
Como usa IA hoje: ${usoIa}

O que mais trava no uso de IA:
${dor}

---
Email enviado automaticamente pelo formulário da landpage.`;

  const adminHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.6">

<h2 style="font-size:18px;margin:0 0 16px;color:#ff5c1a">Nova pré-inscrição · IA Jurídica por Dentro</h2>

<table style="width:100%;border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:8px 0;font-weight:600;width:140px">Nome:</td><td>${escapeHtml(nome)}</td></tr>
  <tr><td style="padding:8px 0;font-weight:600">Email:</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
  <tr><td style="padding:8px 0;font-weight:600">WhatsApp:</td><td>${escapeHtml(whatsapp)}</td></tr>
  <tr><td style="padding:8px 0;font-weight:600">Perfil:</td><td>${escapeHtml(perfil)}</td></tr>
  <tr><td style="padding:8px 0;font-weight:600">Como usa IA:</td><td>${escapeHtml(usoIa)}</td></tr>
</table>

<div style="background:#f5f5f5;padding:16px;border-radius:6px;margin:16px 0">
  <div style="font-weight:600;margin-bottom:6px;font-size:13px;color:#666">O que mais trava no uso de IA:</div>
  <div style="font-size:14px;white-space:pre-wrap">${escapeHtml(dor)}</div>
</div>

<hr style="border:0;border-top:1px solid #e0e0e0;margin:24px 0 12px">
<p style="font-size:12px;color:#888">
  Email automático do formulário em ia-juridica-por-dentro-2026.netlify.app
</p>

</body>
</html>`;

  // ============================================================
  // DISPARO DOS DOIS EMAILS
  // Promise.allSettled garante que mesmo se um falhar, o outro tenta sair
  // ============================================================
  const results = await Promise.allSettled([
    transporter.sendMail({
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: { name: nome, address: email },
      replyTo: SENDER_EMAIL,
      subject: 'Bem-vindo ao Grupo Premium de pré-inscritos · IA Jurídica por Dentro',
      text: welcomeText,
      html: welcomeHtml,
    }),
    transporter.sendMail({
      from: `"${SENDER_NAME} (sistema)" <${SENDER_EMAIL}>`,
      to: notifyEmail,
      replyTo: email,
      subject: `Nova pré-inscrição: ${nome} (${perfil})`,
      text: adminText,
      html: adminHtml,
    }),
  ]);

  const welcomeResult = results[0];
  const adminResult = results[1];

  if (welcomeResult.status === 'rejected') {
    console.error('Falha no email de boas-vindas:', welcomeResult.reason);
  } else {
    console.log(`Boas-vindas enviado: messageId=${welcomeResult.value.messageId}`);
  }

  if (adminResult.status === 'rejected') {
    console.error('Falha no email de notificação:', adminResult.reason);
  } else {
    console.log(`Notificação interna enviada: messageId=${adminResult.value.messageId}`);
  }

  // Status final: se pelo menos um saiu, considera sucesso parcial
  const anyOk = welcomeResult.status === 'fulfilled' || adminResult.status === 'fulfilled';
  return {
    statusCode: anyOk ? 200 : 500,
    body: JSON.stringify({
      welcome: welcomeResult.status,
      admin: adminResult.status,
      email,
    }),
  };
};

// Escapa HTML para evitar injeção via campos do formulário
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
