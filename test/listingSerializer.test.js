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


test('listing serializer maps camelCase listing fields to Prisma field names', () => {
  const data = compact(serializers.listing({
    title: 'Camel case test',
    listingType: 'Satış',
    propertyCategory: 'Mənzil',
    projectName: 'Sea Breeze',
    roomCount: '3',
    area: '120',
    floorNumber: '7',
    floorCount: '18',
    price: '250000',
    description: 'Tam məlumat',
  }));

  assert.equal(data.title, 'Camel case test');
  assert.equal(data.listingType, 'Satış');
  assert.equal(data.propertyCategory, 'Mənzil');
  assert.equal(data.projectName, 'Sea Breeze');
  assert.equal(data.roomCount, 3);
  assert.equal(data.area, '120');
  assert.equal(data.floorNumber, 7);
  assert.equal(data.floorCount, '18');
  assert.equal(data.price, 250000);
  assert.equal(data.description, 'Tam məlumat');
});


test('listing serializer maps region fields', () => {
  const data = compact(serializers.listing({
    title: 'Region test',
    region_type: 'baki',
    district: 'Yasamal',
  }));

  assert.equal(data.regionType, 'baki');
  assert.equal(data.district, 'Yasamal');
});


test('listing serializer maps owner, document, and subtype fields', () => {
  const data = compact(serializers.listing({
    title: 'Kupçalı vasitəçi elanı',
    owner_type: 'Vasitəçi',
    has_document: 'true',
    property_subtype: 'Yeni tikili',
  }));

  assert.equal(data.ownerType, 'agent');
  assert.equal(data.hasDocument, true);
  assert.equal(data.propertySubtype, 'Yeni tikili');
});

test('listing serializer maps unchecked document flag to false', () => {
  const data = compact(serializers.listing({
    title: 'Kupçasız sahib elanı',
    ownerType: 'Əmlak sahibi',
    hasDocument: 'false',
  }));

  assert.equal(data.ownerType, 'owner');
  assert.equal(data.hasDocument, false);
});
