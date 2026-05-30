const jwt = require('jsonwebtoken');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication token is required.' });

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function optionalAuthenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_error) {
    req.auth = null;
  }
  return next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ message: 'Authentication is required.' });
    if (!roles.includes(req.auth.role)) return res.status(403).json({ message: 'You do not have permission for this action.' });
    return next();
  };
}

module.exports = { authenticate, optionalAuthenticate, authorize, signToken };
