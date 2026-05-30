const test = require('node:test');
const assert = require('node:assert/strict');

const { serializers, compact } = require('../src/routes/crud');

test('listing serializer includes floor_number separately from floor_count', () => {
  const data = compact(serializers.listing({
    title: '12 / 28 mərtəbə testi',
    floor_number: '12',
    floor_count: '28',
  }));

  assert.equal(data.floorNumber, 12);
  assert.equal(data.floorCount, '28');
});
