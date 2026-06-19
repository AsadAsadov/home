const test = require('node:test');
const assert = require('node:assert/strict');

const { autoApproveExpiredListings } = require('../src/utils/autoApproveListings');

function createPrismaMock({ pendingListings = [{ id: 1n, userId: 7n, title: 'Test elan', listingCode: 1001n, price: 250000, currency: 'AZN' }] } = {}) {
  const calls = [];
  const users = new Map([[7, { id: 7, fullname: 'Test User', email: 'test@example.com' }]]);
  return {
    calls,
    listing: {
      async findMany(payload) {
        calls.push({ method: 'findMany', payload });
        return pendingListings;
      },
      async updateMany(payload) {
        calls.push({ method: 'updateMany', payload });
        return { count: 1 };
      },
      async findUnique(payload) {
        calls.push({ method: 'findUnique', payload });
        return pendingListings.find((listing) => listing.id === payload.where.id) || null;
      },
    },
    user: {
      async findUnique(payload) {
        calls.push({ method: 'user.findUnique', payload });
        return users.get(payload.where.id) || null;
      },
    },
  };
}

test('autoApproveExpiredListings approves only pending listings older than the delay', async (t) => {
  const prismaClient = createPrismaMock();
  const logs = [];
  const errors = [];
  t.mock.method(console, 'log', (...args) => logs.push(args));
  t.mock.method(console, 'error', (...args) => errors.push(args));

  const now = new Date('2026-06-12T12:00:00.000Z');
  const count = await autoApproveExpiredListings({
    prismaClient,
    now,
    approvalDelayMs: 10 * 60 * 1000,
  });

  assert.equal(count, 1);
  assert.deepEqual(prismaClient.calls[0], {
    method: 'findMany',
    payload: {
      where: {
        status: 'pending',
        createdAt: { lte: new Date('2026-06-12T11:50:00.000Z') },
      },
    },
  });
  assert.deepEqual(prismaClient.calls[1], {
    method: 'updateMany',
    payload: {
      where: { id: 1n, status: 'pending' },
      data: {
        status: 'approved',
        approvedAt: now,
      },
    },
  });
  const approvalEmailErrors = errors.filter((entry) => entry[0] === '[listing-approved-email] failed');
  assert.equal(approvalEmailErrors.length, 1);
  assert.deepEqual(logs, [['Auto-approved pending listings:', 1]]);
});

test('startAutoApproveExpiredListingsJob starts only one interval per process', () => {
  const { startAutoApproveExpiredListingsJob } = require('../src/utils/autoApproveListings');
  const prismaClient = createPrismaMock();

  const first = startAutoApproveExpiredListingsJob({ prismaClient, intervalMs: 60 * 1000 });
  const second = startAutoApproveExpiredListingsJob({ prismaClient, intervalMs: 60 * 1000 });

  assert.equal(first, second);
  first.stop();
});
