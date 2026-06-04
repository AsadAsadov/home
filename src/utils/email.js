const NODEMAILER_NOT_INSTALLED_MESSAGE = 'Email service is not available because nodemailer is not installed.';

function isMissingNodemailerError(error) {
  return error?.code === 'MODULE_NOT_FOUND' && String(error?.message || '').includes('nodemailer');
}

function emailServiceUnavailableError(message = NODEMAILER_NOT_INSTALLED_MESSAGE) {
  const error = new Error(message);
  error.status = 503;
  error.code = 'EMAIL_SERVICE_UNAVAILABLE';
  return error;
}

function loadNodemailer() {
  try {
    return require('nodemailer');
  } catch (error) {
    if (isMissingNodemailerError(error)) throw emailServiceUnavailableError();
    throw error;
  }
}

function getProvider() {
  return String(process.env.EMAIL_PROVIDER || process.env.MAIL_PROVIDER || '').toLowerCase();
}

function smtpConfig() {
  const provider = getProvider();
  return {
    host: process.env.SMTP_HOST || (provider === 'gmail' ? 'smtp.gmail.com' : undefined),
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER || process.env.GMAIL_SMTP_USER,
      pass: process.env.SMTP_PASS || process.env.GMAIL_SMTP_PASS,
    },
  };
}

function isSmtpConfigured() {
  const config = smtpConfig();
  return Boolean(config.host && config.auth.user && config.auth.pass);
}

function isEmailProviderConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY
    || process.env.SENDGRID_API_KEY
    || (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN)
    || isSmtpConfigured()
  );
}

function fromAddress() {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || 'Best Home <noreply@besthome.az>';
}

function plainAddress(value) {
  const match = String(value || '').match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

function createSmtpTransporter() {
  const config = smtpConfig();
  if (!config.host || !config.auth.user || !config.auth.pass) throw new Error('SMTP email is not configured.');
  return loadNodemailer().createTransport(config);
}

async function verifySmtpTransporter(transporter) {
  try {
    const smtpTransporter = transporter || createSmtpTransporter();
    await smtpTransporter.verify();
    console.log('SMTP transporter verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP transporter verify failed:', error);
    throw error;
  }
}

async function sendSmtpEmail(message) {
  const transporter = createSmtpTransporter();
  await verifySmtpTransporter(transporter);
  return transporter.sendMail(message);
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
  const body = await response.json().catch(() => ({}));
  return { messageId: body.id, accepted: [message.to], rejected: [], response: response.statusText };
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
  return { messageId: response.headers.get('x-message-id') || undefined, accepted: [message.to], rejected: [], response: response.statusText };
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
  const body = await response.json().catch(() => ({}));
  return { messageId: body.id, accepted: [message.to], rejected: [], response: body.message || response.statusText };
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
  if (isSmtpConfigured()) return sendSmtpEmail(message);

  console.warn('Password reset email not sent: email provider is not configured.', { to, subject });
  return { skipped: true };
}

module.exports = {
  NODEMAILER_NOT_INSTALLED_MESSAGE,
  sendEmail,
  isEmailProviderConfigured,
  verifySmtpTransporter,
};
