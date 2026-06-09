const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const BRAND = 'BestHome.az';
const BRAND_COLOR = [127 / 255, 127 / 255, 255 / 255];
const DARK = [15 / 255, 23 / 255, 42 / 255];
const MUTED = [71 / 255, 85 / 255, 105 / 255];
const LIGHT = [241 / 255, 245 / 255, 249 / 255];

function cleanText(value, maxLength = 4000) {
  const text = String(value ?? '').replace(/\0/g, '').replace(/\r\n/g, '\n').trim();
  return text ? text.slice(0, maxLength) : '';
}

function pdfText(value) {
  return cleanText(value)
    .replace(/Ə/g, 'E').replace(/ə/g, 'e')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\n\t\x20-\x7e\xa0-\xff]/g, '');
}

function esc(value) {
  return pdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\n/g, '\\n');
}

function color([r, g, b], op = 'rg') {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} ${op}`;
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => cleanText(typeof item === 'object' ? Object.values(item).filter(Boolean).join(' ') : item, 500)).filter(Boolean);
  if (typeof value === 'object') return Object.values(value).map((item) => cleanText(item, 500)).filter(Boolean);
  return String(value).split(/[\n,/;|]+/).map((item) => cleanText(item, 500)).filter(Boolean);
}

function normalizeImages(project) {
  const values = [];
  const add = (item) => {
    if (!item) return;
    if (typeof item === 'string') values.push(item);
    else if (typeof item === 'object') values.push(item.url || item.src || item.imageUrl || item.image_url || item.path || item.publicUrl || '');
  };
  add(project.imageUrl || project.image_url);
  if (Array.isArray(project.images)) project.images.forEach(add);
  return values.map((item) => cleanText(item, 2000)).filter((item, index, all) => item && !item.startsWith('data:') && all.indexOf(item) === index).slice(0, 18);
}

function projectPdfFilename(project) {
  const title = cleanText(project?.title || 'Project', 140).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Project';
  return `${title}.pdf`;
}

async function loadUrlBuffer(url) {
  const value = cleanText(url, 4000);
  if (!value) return null;
  try {
    if (/^https?:\/\//i.test(value)) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6500);
      const response = await fetch(value, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) {
        console.warn('[project-brochure-pdf] Image request failed', { url: value, status: response.status });
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    const localPath = path.resolve(process.cwd(), value.replace(/^\//, ''));
    return await fs.readFile(localPath);
  } catch (error) {
    console.warn('[project-brochure-pdf] Image load failed', { url: value, message: error.message });
    return null;
  }
}

async function prepareImage(url, width = 1200, height = 760) {
  const source = await loadUrlBuffer(url);
  if (!source) return null;
  try {
    const { data, info } = await sharp(source, { failOn: 'none' })
      .rotate()
      .resize(width, height, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width || width, height: info.height || height };
  } catch (error) {
    console.warn('[project-brochure-pdf] Image conversion failed', { url, message: error.message });
    return null;
  }
}

function sectionTopY() {
  return PAGE_HEIGHT - MARGIN - 30;
}

class PdfDoc {
  constructor() {
    this.pages = [];
    this.images = [];
  }

  addImage(image) {
    if (!image) return null;
    const name = `Im${this.images.length + 1}`;
    this.images.push({ ...image, name });
    return this.images[this.images.length - 1];
  }

  addPage() {
    const page = { chunks: [], images: new Set(), y: PAGE_HEIGHT - MARGIN };
    this.pages.push(page);
    return page;
  }

  rect(page, x, y, w, h, fill = null, stroke = null) {
    if (fill) page.chunks.push(color(fill), `${x} ${y} ${w} ${h} re f`);
    if (stroke) page.chunks.push(color(stroke, 'RG'), `${x} ${y} ${w} ${h} re S`);
  }

  text(page, text, x, y, size = 11, opts = {}) {
    const font = opts.bold ? '/F2' : '/F1';
    const fill = opts.color || DARK;
    page.chunks.push('BT', color(fill), `${font} ${size} Tf`, `${x} ${y} Td`, `(${esc(text)}) Tj`, 'ET');
  }

  line(page, x1, y1, x2, y2, stroke = [0.86, 0.89, 0.94], width = 1) {
    page.chunks.push(color(stroke, 'RG'), `${width} w`, `${x1} ${y1} m ${x2} ${y2} l S`);
  }

  image(page, image, x, y, w, h) {
    if (!image) return;
    page.images.add(image.name);
    page.chunks.push('q', `${w} 0 0 ${h} ${x} ${y} cm`, `/${image.name} Do`, 'Q');
  }

  paragraph(page, text, x, y, width, size = 11, lineHeight = 15, opts = {}) {
    const words = pdfText(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    const maxChars = Math.max(12, Math.floor(width / (size * 0.52)));
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    for (const item of lines.slice(0, opts.maxLines || 100)) {
      this.text(page, item, x, y, size, opts);
      y -= lineHeight;
    }
    return y;
  }

  render() {
    const objects = [];
    const add = (body) => { objects.push(Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'binary')); return objects.length; };
    const fontRegularId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const fontBoldId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    for (const image of this.images) {
      image.objectId = add(Buffer.concat([
        Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.buffer.length} >>\nstream\n`, 'binary'),
        image.buffer,
        Buffer.from('\nendstream', 'binary'),
      ]));
    }
    const pageIds = [];
    const contentIds = [];
    for (const page of this.pages) {
      const stream = Buffer.from(page.chunks.join('\n'), 'binary');
      contentIds.push(add(Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, 'binary'), stream, Buffer.from('\nendstream', 'binary')])));
      pageIds.push(add(''));
    }
    const pagesId = add('');
    const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    this.pages.forEach((page, index) => {
      const xObjects = [...page.images].map((name) => {
        const img = this.images.find((item) => item.name === name);
        return `/${name} ${img.objectId} 0 R`;
      }).join(' ');
      objects[pageIds[index] - 1] = Buffer.from(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >>${xObjects ? ` /XObject << ${xObjects} >>` : ''} >> /Contents ${contentIds[index]} 0 R >>`, 'binary');
    });
    objects[pagesId - 1] = Buffer.from(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`, 'binary');

    const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary');
    const parts = [header];
    const offsets = [0];
    let offset = header.length;
    objects.forEach((body, idx) => {
      offsets.push(offset);
      const obj = Buffer.concat([Buffer.from(`${idx + 1} 0 obj\n`, 'binary'), body, Buffer.from('\nendobj\n', 'binary')]);
      parts.push(obj);
      offset += obj.length;
    });
    const xrefOffset = offset;
    const xref = [`xref`, `0 ${objects.length + 1}`, '0000000000 65535 f '];
    for (let i = 1; i <= objects.length; i += 1) xref.push(`${String(offsets[i]).padStart(10, '0')} 00000 n `);
    xref.push('trailer', `<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>`, 'startxref', String(xrefOffset), '%%EOF');
    parts.push(Buffer.from(xref.join('\n'), 'binary'));
    return Buffer.concat(parts);
  }
}

function footer(doc, page, pageNumber) {
  doc.line(page, MARGIN, 34, PAGE_WIDTH - MARGIN, 34, [0.87, 0.9, 0.94], 0.75);
  doc.text(page, BRAND, MARGIN, 20, 10, { bold: true, color: BRAND_COLOR });
  doc.text(page, String(pageNumber), PAGE_WIDTH - MARGIN - 12, 20, 10, { color: MUTED });
}

function addSectionTitle(doc, page, title, y) {
  doc.text(page, title, MARGIN, y, 18, { bold: true, color: DARK });
  doc.line(page, MARGIN, y - 9, PAGE_WIDTH - MARGIN, y - 9, BRAND_COLOR, 1.5);
  return y - 34;
}

function labelValue(doc, page, label, value, x, y, w) {
  doc.text(page, label, x, y, 8, { bold: true, color: BRAND_COLOR });
  doc.paragraph(page, value || '-', x, y - 14, w, 11, 14, { bold: true, color: DARK, maxLines: 3 });
}

async function generateProjectBrochurePdf(project) {
  const doc = new PdfDoc();
  const imageUrls = normalizeImages(project);
  const projectImages = await Promise.all(imageUrls.map((url) => prepareImage(url, 1200, 760)));
  const images = projectImages.map((img) => doc.addImage(img)).filter(Boolean);
  const coverImage = images[0] || null;

  let pageNo = 1;
  let page = doc.addPage();
  doc.rect(page, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, [0.98, 0.99, 1]);
  if (coverImage) doc.image(page, coverImage, 0, 260, PAGE_WIDTH, 430);
  doc.rect(page, 0, 0, PAGE_WIDTH, 310, [1, 1, 1]);
  doc.text(page, 'PROJECT BROCHURE', MARGIN, 226, 10, { bold: true, color: BRAND_COLOR });
  doc.paragraph(page, project.title || 'Project', MARGIN, 190, PAGE_WIDTH - (MARGIN * 2), 34, 39, { bold: true, color: DARK, maxLines: 3 });
  doc.paragraph(page, project.description || '', MARGIN, 105, PAGE_WIDTH - (MARGIN * 2), 12, 16, { color: MUTED, maxLines: 4 });
  footer(doc, page, pageNo++);

  page = doc.addPage();
  let y = addSectionTitle(doc, page, 'Project information', sectionTopY());
  const info = [
    ['Project name', project.title], ['Description', project.description], ['Area', project.area || project.areaRange], ['Floors', project.floorCount],
    ['Delivery date', project.deliveryDate], ['Buildings', project.buildingCount], ['Apartments', project.apartmentCount], ['Parking', project.parkingSpaces],
    ['Coastline', project.coastline], ['Sea distance', project.seaDistance], ['Repair status', project.repairStatus], ['Zone', project.zone],
  ].filter(([, value]) => cleanText(value));
  for (let i = 0; i < info.length; i += 2) {
    labelValue(doc, page, info[i][0], info[i][1], MARGIN, y, 235);
    if (info[i + 1]) labelValue(doc, page, info[i + 1][0], info[i + 1][1], 318, y, 235);
    y -= 56;
    if (y < 100) { footer(doc, page, pageNo++); page = doc.addPage(); y = addSectionTitle(doc, page, 'Project information', sectionTopY()); }
  }
  footer(doc, page, pageNo++);

  page = doc.addPage();
  y = addSectionTitle(doc, page, 'Apartments and pricing', sectionTopY());
  const pricing = [
    ['Apartment formats', project.apartmentFormats], ['Apartment areas', project.apartmentAreas || project.areaRange], ['Price per m2', project.pricePerM2],
    ['Total price', project.totalPrice], ['Bank mortgage', project.bankMortgage], ['Internal credit', project.internalCredit], ['Down payment', project.downPayment],
  ].filter(([, value]) => cleanText(value));
  if (!pricing.length) pricing.push(['Information', 'Pricing and apartment information will be updated soon.']);
  pricing.forEach(([label, value]) => { labelValue(doc, page, label, value, MARGIN, y, PAGE_WIDTH - (MARGIN * 2)); y -= 58; });
  y -= 10;
  y = addSectionTitle(doc, page, 'Infrastructure and features', y);
  const features = [...normalizeList(project.infrastructure), ...normalizeList(project.features)];
  if (!features.length) features.push('Infrastructure and feature information will be updated soon.');
  features.slice(0, 24).forEach((item) => {
    doc.text(page, '•', MARGIN + 3, y, 13, { bold: true, color: BRAND_COLOR });
    doc.paragraph(page, item, MARGIN + 20, y, PAGE_WIDTH - (MARGIN * 2) - 20, 11, 15, { color: DARK, maxLines: 2 });
    y -= 28;
    if (y < 65) { footer(doc, page, pageNo++); page = doc.addPage(); y = addSectionTitle(doc, page, 'Infrastructure and features', sectionTopY()); }
  });
  footer(doc, page, pageNo++);

  if (images.length) {
    for (let i = 0; i < images.length; i += 2) {
      page = doc.addPage();
      y = addSectionTitle(doc, page, i === 0 ? 'Image gallery' : 'Image gallery (continued)', sectionTopY());
      doc.image(page, images[i], MARGIN, 405, PAGE_WIDTH - (MARGIN * 2), 300);
      doc.text(page, `Image ${i + 1}`, MARGIN, 385, 10, { bold: true, color: MUTED });
      if (images[i + 1]) {
        doc.image(page, images[i + 1], MARGIN, 75, PAGE_WIDTH - (MARGIN * 2), 300);
        doc.text(page, `Image ${i + 2}`, MARGIN, 55, 10, { bold: true, color: MUTED });
      }
      footer(doc, page, pageNo++);
    }
  }

  return doc.render();
}

module.exports = { generateProjectBrochurePdf, projectPdfFilename, normalizeImages };
