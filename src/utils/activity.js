async function logUserActivity(prisma, userId, action) {
  if (!userId || !action) return null;
  try {
    return await prisma.userActivityLog.create({ data: { userId: Number(userId), action } });
  } catch (error) {
    if (['P2021', 'P2022'].includes(error.code)) return null;
    throw error;
  }
}

module.exports = { logUserActivity };
