const test = require('node:test');
const assert = require('node:assert/strict');

const storage = require('../src/utils/supabaseStorage');

test('career-cv paths are normalized before signed URL creation', () => {
  assert.equal(storage.normalizeStorageObjectPath('career-cv/2026/05/cv.pdf', 'career-cv'), '2026/05/cv.pdf');
  assert.equal(storage.normalizeStorageObjectPath('career-cv/career-cv/2026/05/cv.pdf', 'career-cv'), '2026/05/cv.pdf');
  assert.equal(
    storage.normalizeStorageObjectPath('https://demo.supabase.co/storage/v1/object/public/career-cv/2026/05/cv.pdf?download=1', 'career-cv'),
    '2026/05/cv.pdf',
  );
});

test('createCareerCvSignedUrl calls Supabase without duplicating bucket name', async () => {
  process.env.SUPABASE_URL = 'https://demo.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  let requestedUrl = '';
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({ signedURL: '/storage/v1/object/sign/career-cv/2026/05/cv.pdf?token=abc' }),
    };
  };

  try {
    const signedUrl = await storage.createCareerCvSignedUrl('career-cv/2026/05/cv.pdf', 60);
    assert.equal(requestedUrl, 'https://demo.supabase.co/storage/v1/object/sign/career-cv/2026/05/cv.pdf');
    assert.equal(signedUrl, 'https://demo.supabase.co/storage/v1/object/sign/career-cv/2026/05/cv.pdf?token=abc');
  } finally {
    global.fetch = originalFetch;
  }
});

test('elanlar uploads return public URLs from the elanlar bucket', async () => {
  process.env.SUPABASE_URL = 'https://demo.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  let requestedUrl = '';
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    requestedUrl = url;
    return { ok: true, text: async () => '' };
  };

  try {
    const publicUrl = await storage.uploadListingImage({
      originalname: 'Mənzil şəkli.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('image'),
    });
    assert.match(requestedUrl, /^https:\/\/demo\.supabase\.co\/storage\/v1\/object\/elanlar\/listings\//);
    assert.match(publicUrl, /^https:\/\/demo\.supabase\.co\/storage\/v1\/object\/public\/elanlar\/listings\//);
  } finally {
    global.fetch = originalFetch;
  }
});

test('career-cv debug signed URL reports normalized path and Supabase response', async () => {
  process.env.SUPABASE_URL = 'https://demo.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ signedURL: '/storage/v1/object/sign/career-cv/2026/05/733b3f88-b426-49c0-b7b1-b72a923c9aa0-receipt.pdf?token=abc' }),
  });

  try {
    const result = await storage.createCareerCvSignedUrlDebug('career-cv/2026/05/733b3f88-b426-49c0-b7b1-b72a923c9aa0-receipt.pdf', 60);
    assert.equal(result.normalizedPath, '2026/05/733b3f88-b426-49c0-b7b1-b72a923c9aa0-receipt.pdf');
    assert.equal(result.requestUrl, 'https://demo.supabase.co/storage/v1/object/sign/career-cv/2026/05/733b3f88-b426-49c0-b7b1-b72a923c9aa0-receipt.pdf');
    assert.deepEqual(result.supabaseResponse, { signedURL: '/storage/v1/object/sign/career-cv/2026/05/733b3f88-b426-49c0-b7b1-b72a923c9aa0-receipt.pdf?token=abc' });
  } finally {
    global.fetch = originalFetch;
  }
});

test('career-cv debug signed URL normalizes second requested sample path', async () => {
  process.env.SUPABASE_URL = 'https://demo.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ signedURL: '/storage/v1/object/sign/career-cv/2026/05/25dafeef-8618-4717-a776-d0a44faed85c-receipt.pdf?token=abc' }),
  });

  try {
    const result = await storage.createCareerCvSignedUrlDebug('career-cv/2026/05/25dafeef-8618-4717-a776-d0a44faed85c-receipt.pdf', 60);
    assert.equal(result.normalizedPath, '2026/05/25dafeef-8618-4717-a776-d0a44faed85c-receipt.pdf');
    assert.equal(result.requestUrl, 'https://demo.supabase.co/storage/v1/object/sign/career-cv/2026/05/25dafeef-8618-4717-a776-d0a44faed85c-receipt.pdf');
  } finally {
    global.fetch = originalFetch;
  }
});

test('storage object paths encode each path segment for Supabase requests', () => {
  assert.equal(storage.encodeStorageObjectPath('2026/05/my receipt #1.pdf'), '2026/05/my%20receipt%20%231.pdf');
});
