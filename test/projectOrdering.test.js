const test = require('node:test');
const assert = require('node:assert/strict');

const { orderedProjectRows, projectOrderBy } = require('../src/utils/projectOrdering');

test('project API order puts display order first, then newest unordered projects', () => {
  const projects = [
    { id: 2, displayOrder: null, createdAt: '2026-06-01T00:00:00.000Z' },
    { id: 1, displayOrder: 2, createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 4, displayOrder: null, createdAt: '2026-06-02T00:00:00.000Z' },
    { id: 3, displayOrder: 1, createdAt: '2025-01-01T00:00:00.000Z' },
    { id: 5, displayOrder: null, createdAt: '2026-06-02T00:00:00.000Z' },
  ];

  assert.deepEqual(orderedProjectRows(projects).map(({ id }) => id), [3, 1, 5, 4, 2]);
});

test('Prisma project order explicitly keeps null display orders last', () => {
  assert.deepEqual(projectOrderBy, [
    { displayOrder: { sort: 'asc', nulls: 'last' } },
    { createdAt: 'desc' },
    { id: 'desc' },
  ]);
});
