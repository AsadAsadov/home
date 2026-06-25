const crypto = require('crypto');

const LISTING_CODE_LOCK_KEY = 987654;
const LISTING_CODE_MAX_RETRIES = 5;
const LISTING_CODE_ERROR_RESPONSE = { success: false, message: 'Elan kodu yaradılarkən xəta baş verdi.' };

function numericListingCode(code) {
  if (typeof code === 'bigint') return code;
  const normalized = String(code ?? '').replace(/^BH/i, '').trim();
  if (!/^\d+$/.test(normalized)) return 0n;
  return BigInt(normalized);
}

function formatListingCodeForLog(code) {
  const numeric = numericListingCode(code);
  return `BH${String(numeric).padStart(6, '0')}`;
}

function maxListingCodeFromRawRows(rows) {
  const row = Array.isArray(rows) ? rows[0] : rows;
  const raw = row?.max_code ?? row?.max ?? row?.listing_code ?? row?.listingCode ?? 0;
  return numericListingCode(raw);
}

function fallbackListingCode(date = new Date()) {
  const pad = (value, size = 2) => String(value).padStart(size, '0');
  const timestamp = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}${pad(date.getUTCMilliseconds(), 3)}`;
  return BigInt(`${timestamp}${crypto.randomInt(1000, 10000)}`);
}

async function ensureListingCodeSequenceTable(tx) {
  await tx.$executeRaw`
    CREATE TABLE IF NOT EXISTS listing_code_sequence (
      id INTEGER PRIMARY KEY DEFAULT 1,
      last_code BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT listing_code_sequence_singleton CHECK (id = 1)
    )
  `;
  await tx.$executeRaw`INSERT INTO listing_code_sequence (id, last_code) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`;
}

async function generateNextListingCodeInLockedTransaction(tx, retryCount = 0) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LISTING_CODE_LOCK_KEY})`;
  await ensureListingCodeSequenceTable(tx);
  const rows = await tx.$queryRaw`
    SELECT GREATEST(
      COALESCE((SELECT MAX(listing_code)::BIGINT FROM listings), 0),
      COALESCE((SELECT last_code FROM listing_code_sequence WHERE id = 1), 0)
    ) AS max_code
  `;
  const currentMaxCode = maxListingCodeFromRawRows(rows);
  const generatedCode = currentMaxCode + 1n;
  await tx.$executeRaw`
    UPDATE listing_code_sequence
    SET last_code = ${generatedCode}, updated_at = now()
    WHERE id = 1
  `;
  console.info('[listings] listing_code generation', {
    currentMaxCode: currentMaxCode.toString(),
    currentMaxCodeFormatted: formatListingCodeForLog(currentMaxCode),
    generatedCode: generatedCode.toString(),
    generatedCodeFormatted: formatListingCodeForLog(generatedCode),
    retryCount,
  });
  return generatedCode;
}

async function reserveTimestampListingCodeInLockedTransaction(tx, retryCount = LISTING_CODE_MAX_RETRIES) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LISTING_CODE_LOCK_KEY})`;
  await ensureListingCodeSequenceTable(tx);
  const generatedCode = fallbackListingCode();
  await tx.$executeRaw`
    UPDATE listing_code_sequence
    SET last_code = GREATEST(last_code, ${generatedCode}), updated_at = now()
    WHERE id = 1
  `;
  console.info('[listings] listing_code timestamp fallback generation', {
    currentMaxCode: 'timestamp-fallback',
    generatedCode: generatedCode.toString(),
    generatedCodeFormatted: formatListingCodeForLog(generatedCode),
    retryCount,
  });
  return generatedCode;
}

async function generateUniqueFallbackListingCode(prisma, retryCount = 0) {
  for (let attempt = 1; attempt <= LISTING_CODE_MAX_RETRIES; attempt += 1) {
    const generatedCode = fallbackListingCode();
    const existing = await prisma.listing.findUnique({ where: { listingCode: generatedCode }, select: { id: true } });
    if (!existing) {
      console.info('[listings] listing_code numeric fallback generation', {
        generatedCode: generatedCode.toString(),
        generatedCodeFormatted: formatListingCodeForLog(generatedCode),
        retryCount,
        fallbackAttempt: attempt,
      });
      return generatedCode;
    }
  }
  throw new Error('Unable to generate unique fallback listing_code');
}

async function generateListingCode(prisma, retryCount = 0) {
  try {
    return await prisma.$transaction((tx) => generateNextListingCodeInLockedTransaction(tx, retryCount));
  } catch (error) {
    console.error('[listing_code] generation failed', error);
    return generateUniqueFallbackListingCode(prisma, retryCount);
  }
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
  generateListingCode,
  generateNextListingCodeInLockedTransaction,
  reserveTimestampListingCodeInLockedTransaction,
  isListingCodeCollision,
};
