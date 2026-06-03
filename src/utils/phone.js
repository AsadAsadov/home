function normalizeAzerbaijanPhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const compact = raw.replace(/[\s()-]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;

  if (/^0\d{9}$/.test(compact)) return `+994${compact.slice(1)}`;
  if (/^994\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\+994\d{9}$/.test(compact)) return compact;

  return null;
}

module.exports = { normalizeAzerbaijanPhone };
