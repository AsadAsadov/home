const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const watermark = require('../src/utils/listingWatermark');

test('listing watermark SVG contains subtle center and bottom-right besthome.az watermarks', () => {
  const svg = watermark.buildWatermarkSvg(1200, 800).toString('utf8');

  assert.match(svg, /besthome\.az/);
  assert.match(svg, /opacity="0\.12"/);
  assert.match(svg, /opacity="0\.42"/);
  assert.match(svg, /rotate\(-15 600 400\)/);
  assert.match(svg, /x="[^%][^"]*" y="[^"]*" text-anchor="end"/);
});

test('applyListingWatermark composites onto supported listing image paths in place', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'listing-watermark-'));
  const imagePath = path.join(tmpDir, 'listing.jpg');
  await fs.writeFile(imagePath, 'image');

  const calls = [];
  const pipeline = {
    rotate() { calls.push(['rotate']); return this; },
    metadata: async () => ({ width: 900, height: 600, format: 'jpeg' }),
    composite(layers) { calls.push(['composite', layers]); return this; },
    jpeg(options) { calls.push(['jpeg', options]); return this; },
    toFile: async (outputPath) => { calls.push(['toFile', outputPath]); await fs.writeFile(outputPath, 'watermarked'); },
  };

  watermark.setSharpForTest((inputPath, options) => {
    calls.push(['sharp', inputPath, options]);
    return pipeline;
  });

  try {
    const result = await watermark.applyListingWatermark(imagePath, { mimetype: 'image/jpeg' });

    assert.equal(result, imagePath);
    assert.equal(await fs.readFile(imagePath, 'utf8'), 'watermarked');
    assert.deepEqual(calls[0], ['sharp', imagePath, { failOn: 'none' }]);
    assert.equal(calls.some(([name]) => name === 'composite'), true);
    assert.equal(calls.some(([name]) => name === 'jpeg'), true);
  } finally {
    watermark.setSharpForTest(null);
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('applyListingWatermark skips unsupported files so non-listing media helpers can remain untouched', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'listing-watermark-skip-'));
  const imagePath = path.join(tmpDir, 'animated.gif');
  await fs.writeFile(imagePath, 'image');
  let called = false;
  watermark.setSharpForTest(() => { called = true; throw new Error('should not be called'); });

  try {
    const result = await watermark.applyListingWatermark(imagePath, { mimetype: 'image/gif' });
    assert.equal(result, imagePath);
    assert.equal(called, false);
  } finally {
    watermark.setSharpForTest(null);
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
