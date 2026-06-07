const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const homepage = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const projectsRoute = fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'projects.js'), 'utf8');

test('public homepage requests every active project and defaults to the all-projects view', () => {
  assert.match(homepage, /apiRequest\('\/api\/projects\?all=true'\)/);
  assert.match(homepage, /let selectedProjectCategory = 'all';/);
  assert.match(homepage, /selectedProjectCategory === 'all'/);
});

test('projects without media receive a visible placeholder and remain modal-compatible', () => {
  assert.match(homepage, /Şəkil əlavə olunmayıb/);
  assert.match(homepage, /primaryImage \|\| images\[0\] \|\| PROJECT_IMAGE_PLACEHOLDER/);
  assert.match(homepage, /officialProjectImages\[officialProjectImageIndex\] \|\| p\.img \|\| ''/);
});

test('project detail images open the project lightbox gallery', () => {
  assert.match(homepage, /<img id="op-modal-img" onclick="openProjectLightboxFromModal\(\)"/);
  assert.match(homepage, /onclick="openProjectLightbox\(\$\{idx\}\)"/);
  assert.match(homepage, /id="project-lightbox"/);
  assert.match(homepage, /changeProjectLightboxImage\(direction\)/);
  assert.match(homepage, /if \(projectLightboxOpen\) \{ closeProjectLightbox\(\); return; \}/);
});


test('listing detail images use compact popup lightbox gallery', () => {
  assert.match(homepage, /#property-lightbox:not\(\.hidden\),[\s\S]*?#property-lightbox\.property-lightbox:not\(\.hidden\)/);
  assert.match(homepage, /#property-lightbox > \.property-lightbox__panel \{[\s\S]*?max-width: 900px !important;[\s\S]*?max-height: 88vh !important;[\s\S]*?border-radius: 22px !important;[\s\S]*?box-shadow: 0 24px 80px rgba\(0,0,0,\.35\) !important;/);
  assert.match(homepage, /#property-lightbox \.property-lightbox__image \{[\s\S]*?max-height: min\(70vh, calc\(88vh - 150px\)\) !important;[\s\S]*?object-fit: contain !important;/);
  assert.match(homepage, /onclick="openPropertyLightbox\(\$\{index\}\)" class="listing-detail-thumbnail/);
  assert.match(homepage, /if \(propertyLightboxOpen\) \{ closePropertyLightbox\(\); return; \}/);
});

test('public projects API only requires a project to be non-archived', () => {
  assert.match(projectsRoute, /const clauses = \[\{ isArchived: false \}\];/);
  assert.doesNotMatch(projectsRoute, /clauses\.push\(\{ featuredInHero:/);
  assert.doesNotMatch(projectsRoute, /clauses\.push\(\{ images:/);
});

function extractFunctionSource(source, functionName) {
  const start = source.indexOf(`function ${functionName}`);
  assert.notEqual(start, -1, `${functionName} should exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${functionName}`);
}

class FakeClassList {
  constructor(initial = '') {
    this.classes = new Set(initial.split(/\s+/).filter(Boolean));
  }

  contains(name) {
    return this.classes.has(name);
  }

  toggle(name, force) {
    const shouldAdd = force === undefined ? !this.classes.has(name) : Boolean(force);
    if (shouldAdd) this.classes.add(name);
    else this.classes.delete(name);
    return shouldAdd;
  }

  toString() {
    return [...this.classes].join(' ');
  }
}

class FakeElement {
  constructor(className = '') {
    this.innerHTML = '';
    this.classList = new FakeClassList(className);
    this.attributes = {};
  }

  get className() {
    return this.classList.toString();
  }

  set className(value) {
    this.classList = new FakeClassList(value);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name];
  }
}

test('project modal renders isolated HTML for each structured tab panel', () => {
  const elements = {
    'op-tab-details': new FakeElement('project-detail-sections'),
    'op-tab-apartments': new FakeElement('hidden project-detail-sections'),
    'op-tab-pricing': new FakeElement('hidden project-detail-sections'),
    'op-tab-infrastructure': new FakeElement('hidden project-detail-sections'),
    'op-tab-btn-apartments': new FakeElement(),
    'op-tab-btn-pricing': new FakeElement(),
    'op-tab-btn-infrastructure': new FakeElement(),
  };
  const document = { getElementById: id => elements[id] || null };
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const renderOfficialProjectDetails = new Function('document', 'escapeHtml', `${extractFunctionSource(homepage, 'renderOfficialProjectDetails')}; return renderOfficialProjectDetails;`)(document, escapeHtml);

  renderOfficialProjectDetails({
    zone: 'Sea Breeze',
    year: '2026',
    coastline: '1-ci xətt',
    seaDistance: '100 m',
    buildings: '4',
    floors: '12',
    apartments: '180',
    parking: '300',
    repairStatus: 'Təmirsiz',
    apartmentFormats: 'Studio / 1 otaqlı / 2 otaqlı',
    apartmentAreas: '45–120 m²',
    area: '45–120 m²',
    pricePerM2: '3500 AZN',
    totalPrice: '250000 AZN',
    bankMortgage: 'Var',
    internalCredit: '36 ay',
    downPayment: '30%',
    infrastructure: 'Hovuz / park',
    features: 'Fitness / SPA',
  });

  assert.doesNotMatch(elements['op-tab-details'].innerHTML, /Mənzil formatları/);
  assert.doesNotMatch(elements['op-tab-details'].innerHTML, /1 m² qiyməti/);
  assert.doesNotMatch(elements['op-tab-details'].innerHTML, /İnfrastruktur/);
  assert.match(elements['op-tab-details'].innerHTML, /Ümumi Məlumat/);
  assert.match(elements['op-tab-details'].innerHTML, /Bina Məlumatları/);

  assert.match(elements['op-tab-apartments'].innerHTML, /Mənzil formatları/);
  assert.match(elements['op-tab-apartments'].innerHTML, /Mənzil sahələri/);
  assert.match(elements['op-tab-apartments'].innerHTML, /Ümumi sahə aralığı/);
  assert.doesNotMatch(elements['op-tab-apartments'].innerHTML, /1 m² qiyməti|Bank ipotekası|İnfrastruktur|Xüsusiyyətlər/);

  assert.match(elements['op-tab-pricing'].innerHTML, /1 m² qiyməti/);
  assert.match(elements['op-tab-pricing'].innerHTML, /Ümumi qiymət/);
  assert.match(elements['op-tab-pricing'].innerHTML, /Bank ipotekası/);
  assert.match(elements['op-tab-pricing'].innerHTML, /Daxili kredit/);
  assert.match(elements['op-tab-pricing'].innerHTML, /İlkin ödəniş/);
  assert.doesNotMatch(elements['op-tab-pricing'].innerHTML, /Mənzil formatları|Mənzil sahələri|İnfrastruktur|Xüsusiyyətlər/);
});

test('project modal tab panels can be hidden independently of their grid layout', () => {
  assert.match(homepage, /\.project-detail-sections:not\(\.hidden\) \{ display: grid;/);
  assert.match(homepage, /\.project-detail-sections\.hidden \{ display: none !important; \}/);
});

test('project modal tab switch activates only the selected panel and updates aria state', () => {
  const elements = {};
  for (const tab of ['details', 'apartments', 'pricing', 'infrastructure', 'description']) {
    elements[`op-tab-btn-${tab}`] = new FakeElement(tab === 'details' ? 'pb-3 border-b-2 border-brand-500 text-brand-500 font-bold text-sm' : 'pb-3 border-b-2 border-transparent text-gray-400 hover:text-white font-bold text-sm');
    elements[`op-tab-${tab}`] = new FakeElement(tab === 'details' ? 'project-detail-sections' : 'hidden project-detail-sections');
  }
  const document = { getElementById: id => elements[id] || null };
  const script = [
    extractFunctionSource(homepage, 'normalizeProjectModalTab'),
    extractFunctionSource(homepage, 'switchOfficialModalTab'),
    'return switchOfficialModalTab;',
  ].join('\n');
  const switchOfficialModalTab = new Function('document', 'let currentProjectModalTab = "details";\n' + script)(document);

  switchOfficialModalTab('pricing');

  assert.equal(elements['op-tab-btn-pricing'].getAttribute('aria-selected'), 'true');
  assert.equal(elements['op-tab-btn-details'].getAttribute('aria-selected'), 'false');
  assert.equal(elements['op-tab-pricing'].classList.contains('hidden'), false);
  assert.equal(elements['op-tab-details'].classList.contains('hidden'), true);
  assert.equal(elements['op-tab-apartments'].classList.contains('hidden'), true);
  assert.match(elements['op-tab-btn-pricing'].className, /border-brand-500 text-brand-500/);
  assert.match(elements['op-tab-btn-details'].className, /border-transparent text-gray-400/);
});
