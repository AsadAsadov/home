const DEFAULT_APPROVAL_DELAY_MS = 10 * 60 * 1000;
const DEFAULT_JOB_INTERVAL_MS = 60 * 1000;
const JOB_STATE_KEY = Symbol.for('besthome.autoApproveExpiredListingsJob');
const { sendListingApprovedEmail } = require('./email');

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function autoApproveDelayMs(env = process.env) {
  return positiveInteger(env.AUTO_APPROVE_PENDING_LISTINGS_AFTER_MS, DEFAULT_APPROVAL_DELAY_MS);
}

function autoApproveIntervalMs(env = process.env) {
  return positiveInteger(env.AUTO_APPROVE_PENDING_LISTINGS_INTERVAL_MS, DEFAULT_JOB_INTERVAL_MS);
}

function defaultPrismaClient() {
  return require('../lib/prisma');
}

async function autoApproveExpiredListings({
  prismaClient = defaultPrismaClient(),
  now = new Date(),
  approvalDelayMs = autoApproveDelayMs(),
} = {}) {
  const approvedAt = now instanceof Date ? now : new Date(now);
  const cutoff = new Date(approvedAt.getTime() - approvalDelayMs);
  const pendingListings = await prismaClient.listing.findMany({
    where: {
      status: 'pending',
      createdAt: { lte: cutoff },
    },
  });

  let count = 0;
  for (const pendingListing of pendingListings) {
    const updated = await prismaClient.listing.updateMany({
      where: {
        id: pendingListing.id,
        status: 'pending',
      },
      data: {
        status: 'approved',
        approvedAt,
      },
    });
    if (!updated?.count) continue;
    count += updated.count;
    const listing = await prismaClient.listing.findUnique({ where: { id: pendingListing.id } });
    let user = null;
    if (listing?.userId) {
      user = await prismaClient.user.findUnique({
        where: { id: Number(listing.userId) },
        select: { id: true, fullname: true, email: true },
      });
    }
    try {
      await sendListingApprovedEmail({ ...listing, user }, user);
    } catch (error) {
      console.error('[listing-approved-email] failed', {
        listingId: listing?.id || pendingListing.id,
        error: { message: error?.message, code: error?.code, status: error?.status },
      });
    }
  }

  console.log('Auto-approved pending listings:', count);
  return count;
}

function startAutoApproveExpiredListingsJob({
  prismaClient = defaultPrismaClient(),
  approvalDelayMs = autoApproveDelayMs(),
  intervalMs = autoApproveIntervalMs(),
} = {}) {
  const globalState = globalThis;
  if (globalState[JOB_STATE_KEY]?.interval) return globalState[JOB_STATE_KEY];

  const state = {
    interval: null,
    running: false,
    async run() {
      if (state.running) return;
      state.running = true;
      try {
        await autoApproveExpiredListings({ prismaClient, approvalDelayMs });
      } catch (error) {
        console.error('Auto-approve pending listings failed:', error?.message || error);
      } finally {
        state.running = false;
      }
    },
    stop() {
      if (state.interval) clearInterval(state.interval);
      state.interval = null;
      if (globalState[JOB_STATE_KEY] === state) delete globalState[JOB_STATE_KEY];
    },
  };

  state.interval = setInterval(state.run, intervalMs);
  if (typeof state.interval.unref === 'function') state.interval.unref();
  globalState[JOB_STATE_KEY] = state;
  state.run();
  return state;
}

module.exports = {
  DEFAULT_APPROVAL_DELAY_MS,
  DEFAULT_JOB_INTERVAL_MS,
  autoApproveExpiredListings,
  startAutoApproveExpiredListingsJob,
};
