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

test('public projects API only requires a project to be non-archived', () => {
  assert.match(projectsRoute, /const clauses = \[\{ isArchived: false \}\];/);
  assert.doesNotMatch(projectsRoute, /clauses\.push\(\{ featuredInHero:/);
  assert.doesNotMatch(projectsRoute, /clauses\.push\(\{ images:/);
});
