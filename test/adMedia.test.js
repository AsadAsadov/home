const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AD_MEDIA_ACCEPTED_EXTENSIONS,
  adMediaTypeForFile,
  isValidAdMediaFile,
} = require('../src/utils/adMedia');

test('advertisement uploads accept only the requested image and video formats', () => {
  assert.deepEqual(AD_MEDIA_ACCEPTED_EXTENSIONS, ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov']);
  assert.equal(isValidAdMediaFile({ originalname: 'banner.webp', mimetype: 'image/webp' }), true);
  assert.equal(isValidAdMediaFile({ originalname: 'banner.mov', mimetype: 'video/quicktime' }), true);
  assert.equal(isValidAdMediaFile({ originalname: 'banner.avif', mimetype: 'image/avif' }), false);
  assert.equal(isValidAdMediaFile({ originalname: 'banner.jpg', mimetype: 'video/mp4' }), false);
});

test('uploaded advertisement files determine the stored media type', () => {
  assert.equal(adMediaTypeForFile({ originalname: 'banner.gif', mimetype: 'image/gif' }), 'gif');
  assert.equal(adMediaTypeForFile({ originalname: 'banner.mov', mimetype: 'video/quicktime' }), 'video');
  assert.equal(adMediaTypeForFile({ originalname: 'banner.jpeg', mimetype: 'image/jpeg' }), 'image');
});
