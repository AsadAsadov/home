const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findExistingProject,
  mergeProjectImages,
  projectImportPreview,
  upsertProjectImports,
} = require('../src/utils/projectBulkImport');

function fakeTransaction(initialProjects = []) {
  const projects = initialProjects.map((project) => ({ ...project }));
  let nextId = Math.max(0, ...projects.map((project) => project.id)) + 1;
  return {
    projects,
    project: {
      findMany: async () => projects.map((project) => ({ ...project })),
      findUnique: async ({ where }) => projects.find((project) => project.slug === where.slug) || null,
      create: async ({ data }) => {
        const project = { id: nextId++, displayOrder: null, featuredInHero: false, ...data };
        projects.push(project);
        return { ...project };
      },
      update: async ({ where, data }) => {
        const project = projects.find((item) => item.id === where.id);
        Object.assign(project, data);
        return { ...project };
      },
    },
  };
}

test('project matching prioritizes slug then case-insensitive and normalized titles', () => {
  const projects = [
    { id: 1, slug: 'special', title: 'Different title' },
    { id: 2, slug: 'the-grand', title: 'THE   GRAND' },
  ];

  assert.equal(findExistingProject(projects, { slug: 'special', title: 'THE GRAND' }).id, 1);
  assert.equal(findExistingProject(projects, { title: 'the   grand' }).id, 2);
  assert.equal(findExistingProject(projects, { title: '  The Grand  ' }).id, 2);
});

test('bulk preview reports create, update, and skip before save', () => {
  const rows = projectImportPreview([
    { title: 'THE GRAND' },
    { title: 'New Project' },
    { title: ' new   project ' },
    { description: 'missing title' },
  ], [{ id: 7, title: 'the grand', slug: 'the-grand' }]);

  assert.deepEqual(rows.map((row) => row.action), ['UPDATE', 'CREATE', 'UPDATE', 'SKIP']);
});

test('bulk upsert preserves omitted values and hero flag while merging unique images', async () => {
  const tx = fakeTransaction([{
    id: 10,
    title: 'THE GRAND',
    slug: 'the-grand',
    pricePerM2: '$3500',
    infrastructure: 'SPA',
    featuredInHero: true,
    imageUrl: 'hero.jpg',
    images: ['one.jpg', 'hero.jpg'],
  }]);

  const result = await upsertProjectImports(tx, [{
    title: 'the grand',
    pricePerM2: '$3600',
    images: ['one.jpg', 'two.jpg'],
    infrastructure: '',
  }]);

  assert.deepEqual(result.summary, { created: 0, updated: 1, skipped: 0 });
  assert.equal(result.projects[0].id, 10);
  assert.equal(result.projects[0].pricePerM2, '$3600');
  assert.equal(result.projects[0].infrastructure, 'SPA');
  assert.equal(result.projects[0].featuredInHero, true);
  assert.deepEqual(result.projects[0].images, ['one.jpg', 'hero.jpg', 'two.jpg']);
});

test('reimporting the same new project is idempotent', async () => {
  const tx = fakeTransaction();
  const first = await upsertProjectImports(tx, [{ title: 'Marina Village', zone: '1' }]);
  const second = await upsertProjectImports(tx, [{ title: ' MARINA   VILLAGE ', zone: '2' }]);

  assert.deepEqual(first.summary, { created: 1, updated: 0, skipped: 0 });
  assert.deepEqual(second.summary, { created: 0, updated: 1, skipped: 0 });
  assert.equal(tx.projects.length, 1);
  assert.equal(tx.projects[0].id, first.projects[0].id);
  assert.equal(tx.projects[0].zone, '2');
});

test('image merging removes duplicates and empty values', () => {
  assert.deepEqual(mergeProjectImages(['a.jpg', '', 'b.jpg'], ['b.jpg', 'c.jpg']), ['a.jpg', 'b.jpg', 'c.jpg']);
});
