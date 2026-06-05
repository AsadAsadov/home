const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { localUploadUrl, safeFilename, uploadRoot } = require('../src/middleware/upload');

test('local upload URLs preserve the dated category path', () => {
  const filePath = path.join(uploadRoot, 'elanlar', 'listings', '2026', '06', 'image.jpg');
  assert.equal(localUploadUrl({ path: filePath }), '/uploads/elanlar/listings/2026/06/image.jpg');
});

test('safe filenames use a UUID and sanitized original filename', () => {
  const filename = safeFilename(' Mənzil Şəkli #1.JPG ');
  assert.match(filename, /^[0-9a-f-]{36}-[a-z0-9-]+\.jpg$/);
  assert.equal(filename.includes('..'), false);
});
