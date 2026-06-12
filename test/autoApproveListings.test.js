const test = require('node:test');
const assert = require('node:assert/strict');

const { autoApproveExpiredListings } = require('../src/utils/autoApproveListings');

function createPrismaMock() {
  const calls = [];
  return {
    calls,
    listing: {
      async updateMany(payload) {
        calls.push(payload);
        return { count: 3 };
      },
    },
  };
}

test('autoApproveExpiredListings approves only pending listings older than the delay', async (t) => {
  const prismaClient = createPrismaMock();
  const logs = [];
  t.mock.method(console, 'log', (...args) => logs.push(args));

  const now = new Date('2026-06-12T12:00:00.000Z');
  const count = await autoApproveExpiredListings({
    prismaClient,
    now,
    approvalDelayMs: 10 * 60 * 1000,
  });

  assert.equal(count, 3);
  assert.deepEqual(prismaClient.calls, [{
    where: {
      status: 'pending',
      createdAt: { lte: new Date('2026-06-12T11:50:00.000Z') },
    },
    data: {
      status: 'approved',
      approvedAt: now,
    },
  }]);
  assert.deepEqual(logs, [['Auto-approved pending listings:', 3]]);
});

test('startAutoApproveExpiredListingsJob starts only one interval per process', () => {
  const { startAutoApproveExpiredListingsJob } = require('../src/utils/autoApproveListings');
  const prismaClient = createPrismaMock();

  const first = startAutoApproveExpiredListingsJob({ prismaClient, intervalMs: 60 * 1000 });
  const second = startAutoApproveExpiredListingsJob({ prismaClient, intervalMs: 60 * 1000 });

  assert.equal(first, second);
  first.stop();
});
