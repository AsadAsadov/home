const AZ_TRANSLITERATION = {
  ə: 'e', Ə: 'e', ı: 'i', I: 'i', İ: 'i', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u',
  ğ: 'g', Ğ: 'g', ç: 'c', Ç: 'c', ş: 's', Ş: 's', а: 'a', е: 'e', о: 'o', р: 'p', с: 's', х: 'x', у: 'u', к: 'k', м: 'm', т: 't', н: 'n', в: 'v', і: 'i', ї: 'i', є: 'e', ґ: 'g',
};

function slugifyText(value, fallback = 'item') {
  const transliterated = String(value || '')
    .split('')
    .map((char) => AZ_TRANSLITERATION[char] || char)
    .join('');
  const slug = transliterated
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug || fallback;
}

async function makeUniqueSlug({ model, title, currentId, tx, fallback }) {
  const client = tx[model];
  const base = slugifyText(title, fallback || model);
  let candidate = base;
  let suffix = 2;

  // Keep checking exact candidates to preserve simple paradise, paradise-2, paradise-3 ordering.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await client.findUnique({ where: { slug: candidate } }).catch(async (error) => {
      if (error.code !== 'P2022') throw error;
      return null;
    });
    if (!existing || (currentId != null && String(existing.id) === String(currentId))) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function normalizeManualSlug(value) {
  const cleaned = slugifyText(value, '');
  return cleaned || undefined;
}

module.exports = { slugifyText, makeUniqueSlug, normalizeManualSlug };
