const test = require('node:test');
const assert = require('node:assert/strict');

function reorderArrayItem(items, fromIndex, toIndex) {
  if (!Array.isArray(items) || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return;
  const [item] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, item);
}

test('image drag reorders the existing item without duplicating preview entries', () => {
  const images = Array.from({ length: 20 }, (_value, index) => `image-${index + 1}`);
  const beforeCount = images.length;

  reorderArrayItem(images, 19, 0);

  assert.equal(images.length, beforeCount);
  assert.deepEqual(images.slice(0, 4), ['image-20', 'image-1', 'image-2', 'image-3']);
  assert.equal(new Set(images).size, beforeCount);
});
