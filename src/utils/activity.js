async function logUserActivity(prisma, userId, action, details = {}) {
  if (!userId || !action) return null;
  const data = {
    userId: Number(userId),
    action,
    ipAddress: details.ipAddress || null,
    userAgent: details.userAgent || null,
    metadata: details.metadata || undefined,
  };
  console.log('AUTH ACTIVITY LOG START', { user_id: data.userId, action, ip_address: data.ipAddress });
  try {
    const activity = await prisma.userActivityLog.create({ data });
    console.log('AUTH ACTIVITY LOG SUCCESS', { id: activity.id, user_id: activity.userId, action: activity.action });
    return activity;
  } catch (error) {
    console.error('AUTH ERROR', {
      step: 'activity_log_create',
      user_id: Number(userId),
      action,
      error: { message: error.message, name: error.name, code: error.code, meta: error.meta },
    });
    throw error;
  }
}

module.exports = { logUserActivity };
