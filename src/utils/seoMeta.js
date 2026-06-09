const DEFAULT_SITE_URL = 'https://besthome.az';
const SITE_NAME = 'BestHome.az';
const DEFAULT_IMAGE = 'https://juaapszzqxojferalmkn.supabase.co/storage/v1/object/public/siteimage/6d5073d8-6614-4a27-90e9-13c16456fb9a.jpg';

const STATIC_SEO = {
  '/': {
    title: 'BestHome.az - Satılıq və Kirayə Daşınmaz Əmlak Elanları',
    description: 'Bakıda satılıq və kirayə mənzillər, villalar, həyət evləri və yeni layihələr. BestHome.az-da daşınmaz əmlak elanlarını rahat axtarın.',
    canonicalPath: '/',
  },
  '/elanlar': {
    title: 'Elanlar - Satılıq və Kirayə Əmlak | BestHome.az',
    description: 'Satılıq və kirayə mənzil, villa, həyət evi və kommersiya obyektlərini BestHome.az-da axtarın.',
    canonicalPath: '/elanlar',
  },
  '/projects': {
    title: 'Sea Breeze Layihələri | BestHome.az',
    description: 'Sea Breeze layihələri, premium yaşayış kompleksləri, mənzil sahələri və təhvil tarixləri haqqında məlumat.',
    canonicalPath: '/projects',
  },
  '/gallery': {
    title: 'Qalereya - BestHome.az',
    description: 'BestHome.az qalereyasında layihə görüntüləri, videolar və media materiallarına baxın.',
    canonicalPath: '/gallery',
  },
  '/ipoteka-kalkulyatoru': {
    title: 'İpoteka Kalkulyatoru | BestHome.az',
    description: 'İpoteka ödənişlərini hesablayın. İlkin ödəniş, kredit müddəti və aylıq ödənişləri rahat şəkildə öyrənin.',
    canonicalPath: '/ipoteka-kalkulyatoru',
  },
};

function trimSlashes(value = '') {
  return String(value).replace(/^\/+|\/+$/g, '');
}

function siteUrl() {
  return (process.env.PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

function absoluteUrl(value, baseUrl = siteUrl()) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  return `${baseUrl}/${trimSlashes(raw)}`;
}

function htmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainText(value = '', maxLength = 300) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();
}

function formatDecimal(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(2)));
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function firstArrayValue(value) {
  if (Array.isArray(value)) return value.find(Boolean);
  return '';
}

function normalizeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }
  return [];
}

function listingAction(listingType = '') {
  const normalized = String(listingType || '').toLowerCase();
  if (/kiray|rent/.test(normalized)) return 'kirayə verilir';
  if (/sat|sale/.test(normalized)) return 'satılır';
  return 'satılır';
}

function propertyLabel(listing = {}) {
  return firstValue(listing.propertyCategory, listing.propertySubtype, listing.title, 'Əmlak');
}

function listingImage(listing = {}) {
  return firstValue(
    listing.imageUrl,
    listing.image_url,
    listing.images?.[0]?.imageUrl,
    listing.images?.[0]?.image_url,
    DEFAULT_IMAGE,
  );
}

function buildListingSeo(listing, baseUrl = siteUrl()) {
  const code = firstValue(listing.listingCode, listing.listing_code, listing.code, listing.id);
  const action = listingAction(listing.listingType || listing.listing_type);
  const category = propertyLabel(listing);
  const roomCount = listing.roomCount ?? listing.room_count;
  const roomPrefix = roomCount ? `${roomCount} otaqlı ` : '';
  const location = firstValue(listing.district, listing.projectName, listing.project_name, listing.city, 'Azərbaycan');
  const title = `${roomPrefix}${category} ${action} - ${location} | ${SITE_NAME}`;
  const area = firstValue(listing.area, listing.area_m2);
  const areaText = area ? `${area}${/m²|m2|kv/i.test(String(area)) ? '' : ' m²'}` : '';
  const price = formatDecimal(listing.price);
  const currency = firstValue(listing.currency, 'AZN');
  const place = firstValue(listing.district, listing.projectName, listing.project_name, listing.city, location);
  const details = [roomCount ? `${roomCount} otaqlı` : '', areaText, category].filter(Boolean).join(', ');
  const description = `${place} ${place.toLowerCase().includes('rayon') ? '' : 'rayonunda '} ${details} ${action}. ${price ? `Qiymət: ${price} ${currency}. ` : ''}Ətraflı məlumat və əlaqə üçün ${SITE_NAME}.`.replace(/\s+/g, ' ').trim();
  const canonical = `${baseUrl}/listing/${encodeURIComponent(String(code))}`;
  const image = absoluteUrl(listingImage(listing), baseUrl);
  return {
    title,
    description,
    canonical,
    image,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Residence',
      name: title,
      description,
      image: image ? [image] : undefined,
      url: canonical,
      offers: price ? {
        '@type': 'Offer',
        price,
        priceCurrency: currency,
        url: canonical,
        availability: 'https://schema.org/InStock',
      } : undefined,
    },
  };
}

function projectImage(project = {}) {
  const images = normalizeJsonArray(project.images);
  return firstValue(project.imageUrl, project.image_url, firstArrayValue(images), DEFAULT_IMAGE);
}

function buildProjectSeo(project, baseUrl = siteUrl()) {
  const slug = firstValue(project.slug, project.id);
  const name = firstValue(project.title, 'Sea Breeze layihəsi');
  const title = `${name} - Sea Breeze layihəsi | ${SITE_NAME}`;
  const description = `${name} layihəsi haqqında məlumat, təhvil ili, mərtəbə sayı, mənzil sahələri və üstünlüklər. Sea Breeze layihələrini ${SITE_NAME}-da kəşf edin.`;
  const canonical = `${baseUrl}/project/${encodeURIComponent(String(slug))}`;
  const image = absoluteUrl(projectImage(project), baseUrl);
  return {
    title,
    description,
    canonical,
    image,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      image: image ? [image] : undefined,
      url: canonical,
      brand: { '@type': 'Brand', name: SITE_NAME },
    },
  };
}

function buildStaticSeo(pathname, baseUrl = siteUrl()) {
  const config = STATIC_SEO[pathname] || STATIC_SEO['/'];
  const canonical = `${baseUrl}${config.canonicalPath}`;
  return { ...config, canonical, image: DEFAULT_IMAGE, type: 'website' };
}

function galleryImage(item = {}) {
  const images = normalizeJsonArray(item.images);
  const mediaUrls = normalizeJsonArray(item.mediaUrls || item.media_urls);
  return firstValue(item.thumbnailUrl, item.thumbnail_url, item.imageUrl, item.image_url, firstArrayValue(images), firstArrayValue(mediaUrls), DEFAULT_IMAGE);
}

function buildGallerySeo(item, pathname, baseUrl = siteUrl()) {
  const titleBase = firstValue(item.title, pathname.startsWith('/video/') ? 'Video' : 'Qalereya');
  const description = plainText(item.description, 180) || `${SITE_NAME} qalereyasında layihə görüntüləri, videolar və media materiallarına baxın.`;
  const canonical = `${baseUrl}${pathname}`;
  const image = absoluteUrl(galleryImage(item), baseUrl);
  return {
    title: `${titleBase} | ${SITE_NAME}`,
    description,
    canonical,
    image,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': item.mediaType === 'video' ? 'VideoObject' : 'ImageObject',
      name: titleBase,
      description,
      thumbnailUrl: image || undefined,
      contentUrl: absoluteUrl(item.videoUrl || item.video_url || item.imageUrl || item.image_url, baseUrl) || undefined,
      url: canonical,
    },
  };
}

function buildVacancySeo(vacancy, pathname, baseUrl = siteUrl()) {
  const titleBase = firstValue(vacancy.title, 'Vakansiya');
  const description = plainText(vacancy.description, 180) || `${SITE_NAME}-da ${titleBase} vakansiyası haqqında məlumat və müraciət forması.`;
  const canonical = `${baseUrl}${pathname}`;
  return {
    title: `${titleBase} Vakansiyası | ${SITE_NAME}`,
    description,
    canonical,
    image: DEFAULT_IMAGE,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: titleBase,
      description,
      employmentType: vacancy.employmentType || vacancy.employment_type || undefined,
      hiringOrganization: { '@type': 'Organization', name: SITE_NAME, sameAs: baseUrl },
      jobLocation: vacancy.city ? { '@type': 'Place', address: vacancy.city } : undefined,
      url: canonical,
    },
  };
}

function compactJsonLd(value) {
  if (Array.isArray(value)) return value.map(compactJsonLd).filter((item) => item !== undefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .map(([key, val]) => [key, compactJsonLd(val)])
      .filter(([, val]) => val !== undefined && val !== '' && !(Array.isArray(val) && !val.length)));
  }
  return value;
}

function seoHeadBlock(seo) {
  const title = htmlEscape(seo.title);
  const description = htmlEscape(seo.description);
  const canonical = htmlEscape(seo.canonical);
  const image = htmlEscape(seo.image || DEFAULT_IMAGE);
  const type = htmlEscape(seo.type || 'website');
  const jsonLd = seo.jsonLd ? `<script type="application/ld+json">${JSON.stringify(compactJsonLd(seo.jsonLd)).replace(/</g, '\\u003c')}</script>` : '';
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${image}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
    jsonLd,
  ].filter(Boolean).join('\n    ');
}

function injectSeoIntoHtml(html, seo) {
  const cleaned = String(html)
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+name=["']description["'][^>]*>/ig, '')
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>/ig, '')
    .replace(/\s*<meta\s+property=["']og:(?:title|site_name|description|type|url|image)["'][^>]*>/ig, '')
    .replace(/\s*<meta\s+name=["']twitter:(?:card|title|description|image)["'][^>]*>/ig, '')
    .replace(/\s*<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/ig, '');
  return cleaned.replace(/<head>/i, `<head>\n    ${seoHeadBlock(seo)}`);
}

module.exports = {
  STATIC_SEO,
  SITE_NAME,
  DEFAULT_IMAGE,
  siteUrl,
  buildListingSeo,
  buildProjectSeo,
  buildStaticSeo,
  buildGallerySeo,
  buildVacancySeo,
  injectSeoIntoHtml,
};
