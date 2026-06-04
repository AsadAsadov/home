const onlineUsers = new Map();
let io = null;

function userRoom(userId) {
  return `user:${userId}`;
}

function toSocketPayload(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? item.toString() : item)));
}

function initRealtime(server, { jwtSecret } = {}) {
  try {
    // socket.io is intentionally loaded lazily so the API can still boot in
    // restricted build environments until dependencies are installed.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const { Server } = require('socket.io');
    // eslint-disable-next-line global-require
    const jwt = require('jsonwebtoken');
    const origins = (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
    io = new Server(server, {
      cors: { origin: origins.length ? origins : true, credentials: true },
    });

    io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) return next(new Error('Authentication token is required.'));
      try {
        socket.auth = jwt.verify(token, jwtSecret || process.env.JWT_SECRET);
        return next();
      } catch (_error) {
        return next(new Error('Invalid or expired token.'));
      }
    });

    io.on('connection', (socket) => {
      const userId = String(socket.auth?.id || '');
      if (!userId) return socket.disconnect(true);
      socket.join(userRoom(userId));
      const currentCount = onlineUsers.get(userId) || 0;
      onlineUsers.set(userId, currentCount + 1);
      socket.on('disconnect', () => {
        const nextCount = (onlineUsers.get(userId) || 1) - 1;
        if (nextCount > 0) onlineUsers.set(userId, nextCount);
        else onlineUsers.delete(userId);
      });
      return undefined;
    });
    return io;
  } catch (error) {
    console.warn('[realtime] Socket.io disabled:', error.message);
    return null;
  }
}

function emitToUser(userId, event, payload) {
  if (!io || userId === undefined || userId === null) return false;
  io.to(userRoom(userId)).emit(event, toSocketPayload(payload));
  return true;
}

function isUserOnline(userId) {
  return onlineUsers.has(String(userId));
}

module.exports = { initRealtime, emitToUser, isUserOnline, toSocketPayload };
