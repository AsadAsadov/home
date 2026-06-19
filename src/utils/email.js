const NODEMAILER_NOT_INSTALLED_MESSAGE = 'Email service is not available because nodemailer is not installed.';
const SMTP_VERIFY_TIMEOUT_MS = 15000;
const SMTP_SENDMAIL_TIMEOUT_MS = 15000;

function isMissingNodemailerError(error) {
  return error?.code === 'MODULE_NOT_FOUND' && String(error?.message || '').includes('nodemailer');
}

function emailServiceUnavailableError(message = NODEMAILER_NOT_INSTALLED_MESSAGE) {
  const error = new Error(message);
  error.status = 503;
  error.code = 'EMAIL_SERVICE_UNAVAILABLE';
  return error;
}

function smtpErrorDetails(error) {
  return {
    message: error?.message,
    code: error?.code,
    command: error?.command,
    response: error?.response,
    responseCode: error?.responseCode,
  };
}

function smtpTimeoutError(operation, timeoutMs) {
  const error = new Error(`SMTP ${operation} timed out after ${timeoutMs}ms.`);
  error.status = 503;
  error.code = `SMTP_${operation.toUpperCase()}_TIMEOUT`;
  return error;
}

async function withSmtpTimeout(promise, operation, timeoutMs) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(smtpTimeoutError(operation, timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function loadNodemailer() {
  try {
    const nodemailer = require('nodemailer');
    console.log('[email] nodemailer loaded successfully');
    return nodemailer;
  } catch (error) {
    if (isMissingNodemailerError(error)) {
      console.error(NODEMAILER_NOT_INSTALLED_MESSAGE);
      throw emailServiceUnavailableError();
    }
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
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };
}

function smtpLogConfig(from = fromAddress()) {
  const provider = getProvider();
  const config = smtpConfig();
  return {
    provider,
    host: config.host,
    port: config.port,
    user: config.auth.user,
    from,
    hasPass: Boolean(process.env.SMTP_PASS),
  };
}

function configError(message, code = 'EMAIL_CONFIG_ERROR', status = 503, missingEnv = []) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.missingEnv = missingEnv;
  return error;
}

function missingSmtpEnvNames(provider = getProvider()) {
  const missing = [];
  if (!process.env.SMTP_HOST && provider !== 'gmail') missing.push('SMTP_HOST');
  if (!process.env.SMTP_USER && !process.env.GMAIL_SMTP_USER) missing.push('SMTP_USER');
  if (!process.env.SMTP_PASS && !process.env.GMAIL_SMTP_PASS) missing.push('SMTP_PASS');
  if (!process.env.EMAIL_FROM && !process.env.SMTP_FROM) missing.push('EMAIL_FROM');
  return missing;
}

function isSmtpConfigured() {
  const config = smtpConfig();
  return Boolean(config.host && config.auth.user && config.auth.pass);
}

function isEmailProviderConfigured() {
  const provider = getProvider();
  if (!provider) return false;
  if (provider === 'resend') return Boolean(process.env.RESEND_API_KEY);
  if (provider === 'sendgrid') return Boolean(process.env.SENDGRID_API_KEY);
  if (provider === 'mailgun') return Boolean(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
  if (provider === 'smtp' || provider === 'gmail') return isSmtpConfigured();
  return false;
}

function fromAddress() {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || 'Best Home <noreply@besthome.az>';
}

function plainAddress(value) {
  const match = String(value || '').match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

function normalizeEmailAddress(value) {
  const email = plainAddress(value).toLowerCase();
  return email || null;
}

function isValidEmailAddress(value) {
  const email = normalizeEmailAddress(value);
  if (!email || email.length > 254) return false;
  if (/\s/.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain || local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  if (!domain.includes('.')) return false;
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email)
    && domain.split('.').every((label) => label && label.length <= 63 && !label.startsWith('-') && !label.endsWith('-'))
    && domain.split('.').at(-1).length >= 2;
}

function listingEmailLogContext(listing = {}) {
  return {
    listingId: listing.id,
    listingCode: listing.listing_code || listing.listingCode || listing.code,
  };
}

function validListingRecipient(listing = {}, user = listing.user || {}) {
  const recipient = normalizeEmailAddress(user.email || listing.user?.email);
  if (!isValidEmailAddress(recipient)) {
    console.warn('[email] skipped invalid recipient', listingEmailLogContext(listing));
    return null;
  }
  return recipient;
}

function createSmtpTransporter(from) {
  const config = smtpConfig();
  console.log('[smtp] config', smtpLogConfig(from));
  const missingEnv = missingSmtpEnvNames();
  if (missingEnv.length) {
    console.error('[smtp] missing env', { missingEnv });
    throw configError(`SMTP email is not configured. Missing env: ${missingEnv.join(', ')}`, 'SMTP_CONFIG_MISSING', 503, missingEnv);
  }
  return loadNodemailer().createTransport(config);
}

async function verifySmtpTransporter(transporter, from) {
  try {
    const smtpTransporter = transporter || createSmtpTransporter(from);
    console.log('[smtp] verify start');
    await withSmtpTimeout(smtpTransporter.verify(), 'verify', SMTP_VERIFY_TIMEOUT_MS);
    console.log('[smtp] verify success');
    return true;
  } catch (error) {
    console.error('[smtp] verify failed', smtpErrorDetails(error));
    throw error;
  }
}

async function sendSmtpEmail(message) {
  const transporter = createSmtpTransporter(message.from);
  await verifySmtpTransporter(transporter, message.from);
  try {
    console.log('[smtp] sendMail start');
    const info = await withSmtpTimeout(transporter.sendMail(message), 'sendmail', SMTP_SENDMAIL_TIMEOUT_MS);
    console.log('[smtp] sendMail success', {
      messageId: info?.messageId,
      accepted: info?.accepted,
      rejected: info?.rejected,
      response: info?.response,
    });
    return info;
  } catch (error) {
    console.error('[smtp] sendMail failed', smtpErrorDetails(error));
    throw error;
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

function appBaseUrl() {
  return String(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || process.env.APP_URL || 'https://besthome.az').replace(/\/+$/, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function listingUrl(listing = {}) {
  const publicIdentifier = listing.listing_code || listing.listingCode || listing.id || '';
  return `${appBaseUrl()}/listing/${encodeURIComponent(String(publicIdentifier))}`;
}

function myListingsUrl() {
  return `${appBaseUrl()}/profil/elanlarim`;
}

function userName(user = {}, listing = {}) {
  return user.fullname || user.name || listing.user?.fullname || listing.user?.name || 'hörmətli istifadəçi';
}

function listingPrice(listing = {}) {
  const price = listing.price ?? listing.priceValue;
  if (price === undefined || price === null || price === '') return '—';
  const numeric = Number(price);
  const formatted = Number.isFinite(numeric) ? numeric.toLocaleString('az-AZ') : String(price);
  return [formatted, listing.currency || 'AZN'].filter(Boolean).join(' ');
}

function listingCode(listing = {}) {
  return listing.listing_code || listing.listingCode || listing.code || listing.id || '—';
}

function bestHomeEmailTemplate({ title, introHtml, rows = [], buttonUrl, buttonText, plainButtonUrl }) {
  const logoUrl = `${appBaseUrl()}/bestlogo.PNG`;
  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 0;color:#6b7280;font-size:14px;">${escapeHtml(label)}</td>
      <td style="padding:10px 0;color:#111827;font-size:14px;font-weight:700;text-align:right;">${escapeHtml(value)}</td>
    </tr>`).join('');
  return `
    <div style="margin:0;padding:24px;background:#f6f3ff;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #ede9fe;">
        <div style="padding:24px 28px;text-align:center;background:#4c1d95;">
          <img src="${escapeHtml(logoUrl)}" alt="BestHome.az" style="max-width:160px;height:auto;display:inline-block;">
        </div>
        <div style="padding:28px;line-height:1.6;">
          <h1 style="margin:0 0 18px;color:#4c1d95;font-size:24px;line-height:1.25;">${escapeHtml(title)}</h1>
          <div style="font-size:16px;color:#374151;">${introHtml}</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;border-top:1px solid #ede9fe;border-bottom:1px solid #ede9fe;border-collapse:collapse;">${htmlRows}</table>
          <p style="margin:26px 0;text-align:center;">
            <a href="${escapeHtml(buttonUrl)}" style="display:inline-block;background:#6d28d9;color:#ffffff;padding:13px 22px;border-radius:12px;text-decoration:none;font-weight:800;">${escapeHtml(buttonText)}</a>
          </p>
          ${plainButtonUrl ? `<p style="margin:-12px 0 24px;text-align:center;color:#6b7280;font-size:13px;word-break:break-all;"><a href="${escapeHtml(plainButtonUrl)}" style="color:#4c1d95;text-decoration:underline;">${escapeHtml(plainButtonUrl)}</a></p>` : ''}
          <p style="margin:24px 0 0;color:#6b7280;font-size:14px;">BestHome.az komandası</p>
        </div>
      </div>
    </div>`;
}

async function sendListingPendingEmail(listing = {}, user = listing.user || {}) {
  const to = validListingRecipient(listing, user);
  if (!to) return null;
  const name = userName(user, listing);
  const title = listing.title || 'Elan';
  const code = listingCode(listing);
  const price = listingPrice(listing);
  return sendEmail({
    to,
    subject: 'Elanınız təsdiq gözləyir – BestHome.az',
    text: [
      `Salam ${name},`,
      '',
      'Elanınız uğurla qəbul edildi və hazırda yoxlanış mərhələsindədir.',
      '',
      'Elan başlığı:',
      title,
      '',
      'Kod:',
      String(code),
      '',
      'Qiymət:',
      price,
      '',
      'Elan təsdiqləndikdən sonra sizə əlavə bildiriş göndəriləcək.',
      '',
      'BestHome.az komandası',
    ].join('\n'),
    html: bestHomeEmailTemplate({
      title: 'Elanınız təsdiq gözləyir',
      introHtml: `<p>Salam ${escapeHtml(name)},</p><p>Elanınız uğurla qəbul edildi və hazırda yoxlanış mərhələsindədir.</p><p>Elan təsdiqləndikdən sonra sizə əlavə bildiriş göndəriləcək.</p>`,
      rows: [['Elan başlığı', title], ['Kod', code], ['Qiymət', price]],
      buttonUrl: myListingsUrl(),
      buttonText: 'Elanlarım',
    }),
  });
}

async function sendListingApprovedEmail(listing = {}, user = listing.user || {}) {
  const to = validListingRecipient(listing, user);
  if (!to) return null;
  const name = userName(user, listing);
  const title = listing.title || 'Elan';
  const code = listingCode(listing);
  const url = listingUrl(listing);
  return sendEmail({
    to,
    subject: 'Elanınız təsdiqləndi – BestHome.az',
    text: [
      `Salam ${name},`,
      '',
      'Təbrik edirik!',
      '',
      'Elanınız təsdiqlənərək BestHome.az saytında yayımlandı və artıq istifadəçilər tərəfindən görünə bilər.',
      '',
      'Elan:',
      title,
      '',
      'Kod:',
      String(code),
      '',
      'Elana bax:',
      url,
      '',
      'Təşəkkür edirik,',
      'BestHome.az komandası',
    ].join('\n'),
    html: bestHomeEmailTemplate({
      title: 'Elanınız təsdiqləndi',
      introHtml: `<p>Salam ${escapeHtml(name)},</p><p><strong>Təbrik edirik!</strong></p><p>Elanınız təsdiqlənərək BestHome.az saytında yayımlandı və artıq istifadəçilər tərəfindən görünə bilər.</p>`,
      rows: [['Elan', title], ['Kod', code]],
      buttonUrl: url,
      buttonText: 'Elana bax',
      plainButtonUrl: url,
    }),
  });
}

async function sendEmail({ to, subject, text, html, from = fromAddress() }) {
  const message = { to, from, subject, text, html };
  const provider = getProvider();
  if (!provider) {
    const missingEnv = ['EMAIL_PROVIDER'];
    console.error('[email] missing env', { missingEnv });
    throw configError(`Email provider is not configured. Missing env: ${missingEnv.join(', ')}`, 'EMAIL_PROVIDER_MISSING', 503, missingEnv);
  }
  if (provider === 'resend') return sendResendEmail(message);
  if (provider === 'sendgrid') return sendSendGridEmail(message);
  if (provider === 'mailgun') return sendMailgunEmail(message);
  if (provider === 'smtp' || provider === 'gmail') return sendSmtpEmail(message);

  throw configError(`Unsupported EMAIL_PROVIDER: ${provider}`, 'EMAIL_PROVIDER_UNSUPPORTED', 503);
}

module.exports = {
  NODEMAILER_NOT_INSTALLED_MESSAGE,
  sendEmail,
  sendListingPendingEmail,
  sendListingApprovedEmail,
  normalizeEmailAddress,
  isValidEmailAddress,
  isEmailProviderConfigured,
  verifySmtpTransporter,
};
