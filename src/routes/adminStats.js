const express = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function toNumber(value) {
  return Number(value || 0);
}

function mapCountRows(rows, key = 'label') {
  return rows.map(row => ({
    [key]: row[key] || 'Unknown',
    count: toNumber(row.count),
  }));
}

router.use(authenticate, authorize('admin'));

router.get('/overview', asyncHandler(async (_req, res) => {
  const [summaryRows, topPagesRows, deviceRows, browserRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE "created_at" >= date_trunc('day', NOW()))::int AS "todayVisits",
        COUNT(*) FILTER (WHERE "created_at" >= NOW() - INTERVAL '7 days')::int AS "last7DaysVisits",
        COUNT(*)::int AS "totalVisits",
        COUNT(DISTINCT COALESCE("user_id"::text, "ip_hash"))::int AS "uniqueVisitors"
      FROM public."page_views"
    `,
    prisma.$queryRaw`
      SELECT "path", COUNT(*)::int AS "count"
      FROM public."page_views"
      GROUP BY "path"
      ORDER BY COUNT(*) DESC, "path" ASC
      LIMIT 10
    `,
    prisma.$queryRaw`
      SELECT COALESCE("device_type", 'Unknown') AS "label", COUNT(*)::int AS "count"
      FROM public."page_views"
      GROUP BY COALESCE("device_type", 'Unknown')
      ORDER BY COUNT(*) DESC
    `,
    prisma.$queryRaw`
      SELECT COALESCE("browser", 'Unknown') AS "label", COUNT(*)::int AS "count"
      FROM public."page_views"
      GROUP BY COALESCE("browser", 'Unknown')
      ORDER BY COUNT(*) DESC
    `,
  ]);

  const summary = summaryRows[0] || {};
  res.json({
    todayVisits: toNumber(summary.todayVisits),
    last7DaysVisits: toNumber(summary.last7DaysVisits),
    totalVisits: toNumber(summary.totalVisits),
    uniqueVisitors: toNumber(summary.uniqueVisitors),
    topPages: topPagesRows.map(row => ({ path: row.path || '/', count: toNumber(row.count) })),
    deviceBreakdown: mapCountRows(deviceRows),
    browserBreakdown: mapCountRows(browserRows),
  });
}));

router.get('/visits', asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;

  const [visits, totalRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        pv."id", pv."path", pv."full_url" AS "fullUrl", pv."referrer", pv."user_agent" AS "userAgent",
        pv."ip_hash" AS "ipHash", pv."device_type" AS "deviceType", pv."browser", pv."os", pv."user_id" AS "userId",
        pv."created_at" AS "createdAt", u."fullname" AS "userName", u."email" AS "userEmail"
      FROM public."page_views" pv
      LEFT JOIN public."users" u ON u."id" = pv."user_id"
      ORDER BY pv."created_at" DESC, pv."id" DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    prisma.$queryRaw`SELECT COUNT(*)::int AS "count" FROM public."page_views"`,
  ]);

  res.json({
    page,
    limit,
    total: toNumber(totalRows[0]?.count),
    visits: visits.map(visit => ({
      id: visit.id,
      path: visit.path,
      fullUrl: visit.fullUrl,
      referrer: visit.referrer,
      userAgent: visit.userAgent,
      ipHash: visit.ipHash,
      deviceType: visit.deviceType,
      browser: visit.browser,
      os: visit.os,
      userId: visit.userId,
      userName: visit.userName,
      userEmail: visit.userEmail,
      createdAt: visit.createdAt,
    })),
  });
}));

module.exports = router;
