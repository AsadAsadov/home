const projectOrderBy = [
  { displayOrder: { sort: 'asc', nulls: 'last' } },
  { createdAt: 'desc' },
  { id: 'desc' },
];

function compareIdsDesc(a, b) {
  try {
    const left = BigInt(a ?? 0);
    const right = BigInt(b ?? 0);
    return left === right ? 0 : (left > right ? -1 : 1);
  } catch (_error) {
    return String(b ?? '').localeCompare(String(a ?? ''), undefined, { numeric: true });
  }
}

function compareProjects(a, b) {
  const aOrder = Number(a?.displayOrder ?? a?.display_order);
  const bOrder = Number(b?.displayOrder ?? b?.display_order);
  const aHasOrder = Number.isFinite(aOrder);
  const bHasOrder = Number.isFinite(bOrder);

  if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
  if (aHasOrder && aOrder !== bOrder) return aOrder - bOrder;

  const aCreatedAt = Date.parse(a?.createdAt ?? a?.created_at ?? '') || 0;
  const bCreatedAt = Date.parse(b?.createdAt ?? b?.created_at ?? '') || 0;
  if (aCreatedAt !== bCreatedAt) return bCreatedAt - aCreatedAt;

  return compareIdsDesc(a?.id, b?.id);
}

function orderedProjectRows(rows) {
  return [...rows].sort(compareProjects);
}

module.exports = { compareProjects, orderedProjectRows, projectOrderBy };
