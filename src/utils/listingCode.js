const LISTING_CODE_LOCK_KEY = 424242001;
const LISTING_CODE_MAX_RETRIES = 10;
const LISTING_CODE_ERROR_RESPONSE = { success: false, message: 'Kod yaradılarkən xəta baş verdi.' };

function formatListingCodeForLog(code) {
  const numeric = Math.max(Number(code || 0), 0);
  return `BH${String(numeric).padStart(6, '0')}`;
}

function maxListingCodeFromRawRows(rows) {
  const row = Array.isArray(rows) ? rows[0] : rows;
  const raw = row?.max_code ?? row?.max ?? row?.listing_code ?? row?.listingCode ?? 0;
  const numeric = Number(raw || 0);
  return Number.isFinite(numeric) ? Math.max(numeric, 0) : 0;
}

async function generateNextListingCodeInLockedTransaction(tx, retryCount = 0) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LISTING_CODE_LOCK_KEY})`;
  const rows = await tx.$queryRaw`SELECT MAX(listing_code) AS max_code FROM listings`;
  const currentMaxCode = maxListingCodeFromRawRows(rows);
  const generatedCode = currentMaxCode + 1;
  console.info('[listings] listing_code generation', {
    currentMaxCode,
    currentMaxCodeFormatted: formatListingCodeForLog(currentMaxCode),
    generatedCode,
    generatedCodeFormatted: formatListingCodeForLog(generatedCode),
    retryCount,
  });
  return generatedCode;
}

function isListingCodeCollision(error) {
  if (error?.code !== 'P2002') return false;
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.includes('listing_code') || target.includes('listingCode');
  return String(target || '').includes('listing_code') || String(target || '').includes('listingCode');
}

module.exports = {
  LISTING_CODE_MAX_RETRIES,
  LISTING_CODE_ERROR_RESPONSE,
  formatListingCodeForLog,
  maxListingCodeFromRawRows,
  generateNextListingCodeInLockedTransaction,
  isListingCodeCollision,
};
