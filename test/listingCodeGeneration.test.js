const test = require('node:test');
const assert = require('node:assert/strict');

const { formatListingCodeForLog, maxListingCodeFromRawRows } = require('../src/utils/listingCode');

test('listing code formatter logs BH-prefixed six digit codes', () => {
  assert.equal(formatListingCodeForLog(12), 'BH000012');
  assert.equal(formatListingCodeForLog(13), 'BH000013');
});

test('raw SELECT MAX(listing_code) result is parsed before next code generation', () => {
  assert.equal(maxListingCodeFromRawRows([{ max_code: 12 }]), 12n);
  assert.equal(maxListingCodeFromRawRows([{ max_code: 12n }]), 12n);
  assert.equal(maxListingCodeFromRawRows([{ max_code: null }]), 0n);
});


test('locked listing code generation queries advisory lock before MAX(listing_code)', async () => {
  const { generateNextListingCodeInLockedTransaction } = require('../src/utils/listingCode');
  const calls = [];
  const tx = {
    $executeRaw(strings, value) {
      calls.push(['execute', strings.join('?'), value]);
      return Promise.resolve();
    },
    $queryRaw(strings) {
      calls.push(['max', strings.join('?')]);
      return Promise.resolve([{ max_code: 12 }]);
    },
  };

  const generated = await generateNextListingCodeInLockedTransaction(tx, 3);

  assert.equal(generated, 13n);
  assert.match(calls[0][1], /pg_advisory_xact_lock/);
  assert.ok(calls.some(([type, sql]) => type === 'max' && /MAX\(listing_code\)/.test(sql)));
  assert.match(calls.at(-1)[1], /UPDATE listing_code_sequence/);
});
