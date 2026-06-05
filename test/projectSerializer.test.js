const test = require('node:test');
const assert = require('node:assert/strict');

const { serializers, compact } = require('../src/routes/crud');

test('project serializer maps archive status from camelCase and snake_case', () => {
  assert.equal(compact(serializers.project({ isArchived: true })).isArchived, true);
  assert.equal(compact(serializers.project({ is_archived: false })).isArchived, false);
});

test('project serializer maps structured project fields and legacy area fallback', () => {
  const project = compact(serializers.project({
    title: 'Premium Coast',
    zone: 'Sea Breeze',
    type: 'Villa',
    sea_distance: '100 m',
    building_count: '3',
    parking_spaces: '250',
    apartment_formats: 'Studio / 1 otaqlı',
    apartment_areas: 'Studio: 46–117 m²',
    area: '46–424 m²',
    price_per_m2: '3500 AZN',
    total_price: '250000 AZN',
    bank_mortgage: 'Mövcuddur',
    internal_credit: '36 ay',
    down_payment: '30%',
    infrastructure: 'Hovuz və park',
  }));

  assert.equal(project.category, 'Villa');
  assert.equal(project.zone, 'Sea Breeze');
  assert.equal(project.seaDistance, '100 m');
  assert.equal(project.buildingCount, '3');
  assert.equal(project.parkingSpaces, '250');
  assert.equal(project.areaRange, '46–424 m²');
  assert.equal(project.pricePerM2, '3500 AZN');
  assert.equal(project.infrastructure, 'Hovuz və park');
});
