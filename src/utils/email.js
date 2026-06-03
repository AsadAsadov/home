const net = require('net');
const tls = require('tls');

function getProvider() {
  return String(process.env.EMAIL_PROVIDER || process.env.MAIL_PROVIDER || '').toLowerCase();
}

function fromAddress() {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || 'Best Home <noreply@besthome.az>';
}

function plainAddress(value) {
  const match = String(value || '').match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

function encodeBase64(value) {
  return Buffer.from(String(value), 'utf8').toString('base64');
}

function smtpRead(socket) {
  return new Promise((resolve, reject) => {
    let data = '';
    const onData = (chunk) => {
      data += chunk.toString('utf8');
      const lines = data.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || '';
      if (/^\d{3} /.test(last)) cleanup(resolve, data);
    };
    const cleanup = (done, value) => {
      socket.off('data', onData);
      socket.off('error', onError);
      done(value);
    };
    const onError = (error) => cleanup(reject, error);
    socket.on('data', onData);
    socket.on('error', onError);
  });
}

async function smtpCommand(socket, command, expected = /^[23]/) {
  if (command) socket.write(`${command}\r\n`);
  const response = await smtpRead(socket);
  if (!expected.test(response)) throw new Error(`SMTP command failed: ${response.trim()}`);
  return response;
}

function connectSmtp({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host }, () => resolve(socket))
      : net.connect({ host, port }, () => resolve(socket));
    socket.once('error', reject);
  });
}

function buildMessage({ from, to, subject, text, html }) {
  const boundary = `besthome-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  return `${headers.join('\r\n')}\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text || ''}\r\n--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html || text || ''}\r\n--${boundary}--\r\n`;
}

async function sendSmtpEmail(message) {
  const host = process.env.SMTP_HOST || (getProvider() === 'gmail' ? 'smtp.gmail.com' : undefined);
  const port = Number(process.env.SMTP_PORT || (getProvider() === 'gmail' ? 465 : 587));
  const secure = String(process.env.SMTP_SECURE || (port === 465 ? 'true' : 'false')) === 'true';
  const user = process.env.SMTP_USER || process.env.GMAIL_SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_SMTP_PASS;
  if (!host || !user || !pass) throw new Error('SMTP email is not configured.');

  let socket = await connectSmtp({ host, port, secure });
  try {
    await smtpCommand(socket, null);
    await smtpCommand(socket, `EHLO ${process.env.SMTP_EHLO_DOMAIN || 'besthome.az'}`);
    if (!secure && String(process.env.SMTP_STARTTLS || 'true') === 'true') {
      await smtpCommand(socket, 'STARTTLS');
      socket = tls.connect({ socket, servername: host });
      await smtpCommand(socket, `EHLO ${process.env.SMTP_EHLO_DOMAIN || 'besthome.az'}`);
    }
    await smtpCommand(socket, 'AUTH LOGIN');
    await smtpCommand(socket, encodeBase64(user));
    await smtpCommand(socket, encodeBase64(pass));
    await smtpCommand(socket, `MAIL FROM:<${plainAddress(message.from)}>`, /^[23]/);
    await smtpCommand(socket, `RCPT TO:<${plainAddress(message.to)}>`, /^[23]/);
    await smtpCommand(socket, 'DATA', /^3/);
    socket.write(`${buildMessage(message).replace(/\r?\n\.\r?\n/g, '\r\n..\r\n')}\r\n.\r\n`);
    await smtpCommand(socket, null);
    await smtpCommand(socket, 'QUIT', /^[23]/).catch(() => {});
  } finally {
    socket.end();
  }
}

async function sendResendEmail(message) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is missing.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: message.from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
  });
  if (!response.ok) throw new Error(`Resend email failed: ${await response.text()}`);
}

async function sendSendGridEmail(message) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error('SENDGRID_API_KEY is missing.');
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: plainAddress(message.to) }] }],
      from: { email: plainAddress(message.from), name: process.env.EMAIL_FROM_NAME || 'Best Home' },
      subject: message.subject,
      content: [{ type: 'text/plain', value: message.text || '' }, { type: 'text/html', value: message.html || message.text || '' }],
    }),
  });
  if (!response.ok) throw new Error(`SendGrid email failed: ${await response.text()}`);
}

async function sendMailgunEmail(message) {
  const domain = process.env.MAILGUN_DOMAIN;
  const key = process.env.MAILGUN_API_KEY;
  if (!domain || !key) throw new Error('Mailgun is not configured.');
  const form = new URLSearchParams({ from: message.from, to: message.to, subject: message.subject, text: message.text || '', html: message.html || message.text || '' });
  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`api:${key}`).toString('base64')}` },
    body: form,
  });
  if (!response.ok) throw new Error(`Mailgun email failed: ${await response.text()}`);
}

async function sendEmail({ to, subject, text, html, from = fromAddress() }) {
  const message = { to, from, subject, text, html };
  const provider = getProvider();
  if (provider === 'resend') return sendResendEmail(message);
  if (provider === 'sendgrid') return sendSendGridEmail(message);
  if (provider === 'mailgun') return sendMailgunEmail(message);
  if (provider === 'smtp' || provider === 'gmail') return sendSmtpEmail(message);

  if (process.env.RESEND_API_KEY) return sendResendEmail(message);
  if (process.env.SENDGRID_API_KEY) return sendSendGridEmail(message);
  if (process.env.MAILGUN_API_KEY) return sendMailgunEmail(message);
  if (process.env.SMTP_HOST || process.env.GMAIL_SMTP_USER) return sendSmtpEmail(message);

  console.warn('EMAIL SKIPPED: no email provider configured', { to, subject });
  return { skipped: true };
}

module.exports = { sendEmail };
