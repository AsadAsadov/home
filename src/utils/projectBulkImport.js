const { serializeProject } = require('./projectSerializer');
const { makeUniqueSlug, normalizeManualSlug } = require('./seo');

function normalizeProjectTitle(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function caseInsensitiveProjectTitle(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeImages(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function mergeProjectImages(existing, incoming) {
  return [...new Set([...normalizeImages(existing), ...normalizeImages(incoming)])];
}

function findExistingProject(projects, imported) {
  const slug = normalizeManualSlug(imported?.slug);
  if (slug) {
    const slugMatch = projects.find((project) => normalizeManualSlug(project.slug) === slug);
    if (slugMatch) return slugMatch;
  }

  const title = caseInsensitiveProjectTitle(imported?.title);
  if (title) {
    const exactTitleMatch = projects.find((project) => caseInsensitiveProjectTitle(project.title) === title);
    if (exactTitleMatch) return exactTitleMatch;
  }

  const normalizedTitle = normalizeProjectTitle(imported?.title);
  return normalizedTitle
    ? projects.find((project) => normalizeProjectTitle(project.title) === normalizedTitle) || null
    : null;
}

function projectImportPayload(row) {
  const payload = Object.fromEntries(Object.entries(serializeProject(row || {})).filter(([, value]) => value !== undefined));
  if (payload.images == null || (Array.isArray(payload.images) && !payload.images.length)) delete payload.images;
  return payload;
}

function projectImportPreview(rows, projects) {
  const candidates = [...projects];
  return (Array.isArray(rows) ? rows : []).map((row, index) => {
    const payload = projectImportPayload(row);
    if (!payload.title) return { index, action: 'SKIP', existingId: null };
    const existing = findExistingProject(candidates, payload);
    if (existing) return { index, action: 'UPDATE', existingId: existing.id };
    candidates.push({ ...payload, id: `new-${index}` });
    return { index, action: 'CREATE', existingId: null };
  });
}

async function upsertProjectImports(tx, rows) {
  const projects = await tx.project.findMany({ orderBy: { id: 'asc' } });
  const summary = { created: 0, updated: 0, skipped: 0 };
  const saved = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    const payload = projectImportPayload(row);
    if (!payload.title) {
      summary.skipped += 1;
      continue;
    }

    const existing = findExistingProject(projects, payload);
    if (existing) {
      if (payload.images || payload.imageUrl) {
        payload.images = mergeProjectImages(
          [...normalizeImages(existing.images), existing.imageUrl].filter(Boolean),
          [...normalizeImages(payload.images), payload.imageUrl].filter(Boolean),
        );
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'slug')) {
        const slug = normalizeManualSlug(payload.slug);
        if (!slug) delete payload.slug;
        else payload.slug = await makeUniqueSlug({ model: 'project', title: slug, currentId: existing.id, tx, fallback: 'project' });
      }
      const updated = await tx.project.update({ where: { id: existing.id }, data: payload });
      Object.assign(existing, updated);
      saved.push(updated);
      summary.updated += 1;
      continue;
    }

    const manualSlug = normalizeManualSlug(payload.slug);
    payload.slug = manualSlug
      ? await makeUniqueSlug({ model: 'project', title: manualSlug, tx, fallback: 'project' })
      : await makeUniqueSlug({ model: 'project', title: payload.title, tx, fallback: 'project' });
    let created = await tx.project.create({ data: payload });
    if (created.displayOrder == null) {
      created = await tx.project.update({ where: { id: created.id }, data: { displayOrder: created.id } });
    }
    projects.push(created);
    saved.push(created);
    summary.created += 1;
  }

  return { summary, projects: saved };
}

module.exports = {
  findExistingProject,
  mergeProjectImages,
  normalizeProjectTitle,
  projectImportPayload,
  projectImportPreview,
  upsertProjectImports,
};
