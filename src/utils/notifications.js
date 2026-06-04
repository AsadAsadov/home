const { sendEmail } = require('./email');

function appBaseUrl() {
  return String(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || process.env.APP_URL || '').replace(/\/+$/, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function lineBreaksToHtml(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function valueOrDash(value) {
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

function listingLocation(listing = {}) {
  return [listing.city, listing.district, listing.settlement, listing.neighborhood, listing.metroStation, listing.streetAddress]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' / ');
}

function listingCategory(listing = {}) {
  return [listing.listingType, listing.propertyCategory, listing.propertySubtype]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' / ');
}

function formatPrice(listing = {}) {
  const price = listing.price ?? listing.priceValue;
  if (price === undefined || price === null || price === '') return '—';
  const numeric = Number(price);
  const formatted = Number.isFinite(numeric) ? numeric.toLocaleString('az-AZ') : String(price);
  return [formatted, listing.currency || 'AZN'].filter(Boolean).join(' ');
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function notificationErrorDetails(error) {
  return {
    message: error?.message,
    code: error?.code,
    status: error?.status,
    response: error?.response,
    responseCode: error?.responseCode,
  };
}

async function sendNewListingNotification(listing = {}, user = {}) {
  console.log('[listing-notification] start', { listingId: listing?.id });
  const to = String(process.env.LISTING_NOTIFY_EMAIL || '').trim();
  if (!to) {
    console.log('[listing-notification] skipped missing LISTING_NOTIFY_EMAIL', { listingId: listing?.id });
    return null;
  }

  const baseUrl = appBaseUrl();
  const reviewLink = baseUrl ? `${baseUrl}/admin/listings` : '/admin/listings';
  const rows = [
    ['Listing ID', valueOrDash(listing.id)],
    ['Title', valueOrDash(listing.title)],
    ['Price', formatPrice(listing)],
    ['Category / property type', valueOrDash(listingCategory(listing))],
    ['City / region / address', valueOrDash(listingLocation(listing))],
    ['User name', valueOrDash(user.fullname || user.name)],
    ['User email', valueOrDash(user.email)],
    ['User phone', valueOrDash(user.phone)],
    ['Created date', formatDate(listing.createdAt)],
    ['Admin review link', reviewLink],
  ];
  const text = [
    'Yeni elan təsdiq gözləyir.',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join('\n');
  const htmlRows = rows.map(([label, value]) => `<tr><th align="left" style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(label)}</th><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(value)}</td></tr>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;color:#111827;"><h2>Yeni elan təsdiq gözləyir</h2><table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${htmlRows}</table><p><a href="${escapeHtml(reviewLink)}">Admin paneldə bax</a></p></div>`;

  try {
    const info = await sendEmail({
      to,
      subject: 'Yeni elan təsdiq gözləyir — BestHome.az',
      text,
      html,
    });
    console.log('[listing-notification] success', { listingId: listing?.id, to, messageId: info?.messageId });
    return info;
  } catch (error) {
    console.error('[listing-notification] failed', { listingId: listing?.id, to, error: notificationErrorDetails(error) });
    throw error;
  }
}

async function sendAnnouncementEmail(to, subject, message) {
  return sendEmail({
    to,
    subject,
    text: message,
    html: `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;">${lineBreaksToHtml(message)}</div>`,
  });
}

module.exports = {
  sendNewListingNotification,
  sendAnnouncementEmail,
  notificationErrorDetails,
};
