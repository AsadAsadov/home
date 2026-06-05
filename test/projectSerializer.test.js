const test = require('node:test');
const assert = require('node:assert/strict');

const { serializers, compact } = require('../src/routes/crud');

test('project serializer maps archive status from camelCase and snake_case', () => {
  assert.equal(compact(serializers.project({ isArchived: true })).isArchived, true);
  assert.equal(compact(serializers.project({ is_archived: false })).isArchived, false);
});
