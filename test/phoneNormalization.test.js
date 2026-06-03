const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeAzerbaijanPhone } = require('../src/utils/phone');

test('normalizes supported Azerbaijan phone formats to E.164', () => {
  assert.equal(normalizeAzerbaijanPhone('0501234567'), '+994501234567');
  assert.equal(normalizeAzerbaijanPhone('050 123 45 67'), '+994501234567');
  assert.equal(normalizeAzerbaijanPhone('+994501234567'), '+994501234567');
});

test('rejects empty or unsupported phone formats', () => {
  assert.equal(normalizeAzerbaijanPhone(''), null);
  assert.equal(normalizeAzerbaijanPhone('12345'), null);
  assert.equal(normalizeAzerbaijanPhone('+995501234567'), null);
});
