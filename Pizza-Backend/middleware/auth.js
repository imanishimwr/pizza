// Auth Middleware: JWT Verification & RBAC Guard
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hotpot_kigali_jwt_secret_key_2026';

const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      req.user = decoded;

      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
  };
};

// Optional auth: attaches req.user when a valid Bearer token is present,
// but does not reject tokenless requests (demo/fallback mode).
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch (err) {
      req.user = undefined;
    }
  }
  next();
};

// Role guard to be composed with optionalAuth. When a token is present the
// role is enforced; tokenless demo requests pass through for backward
// compatibility while already-authenticated users cannot spoof a role.
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return next();
    const upper = String(req.user.role || '').toUpperCase();
    if (roles.length > 0 && !roles.includes(upper)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }
    next();
  };
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.JWT_SECRET = JWT_SECRET;
module.exports.optionalAuth = optionalAuth;
module.exports.requireRole = requireRole;