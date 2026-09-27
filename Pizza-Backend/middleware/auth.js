/**
 * JWT verification + role-based access control.
 *
 * The role is read from the signed token, never from a request body field or a
 * header, so a client cannot promote itself by editing localStorage or by
 * replaying a tampered payload.
 */
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    '[fatal] JWT_SECRET is missing or shorter than 32 characters. Refusing to start.'
  );
  process.exit(1);
}

/** DB roles are lowercase; accept any casing in configuration defensively. */
const ALL_ROLES = ['customer', 'kitchen', 'delivery', 'admin'];

const authMiddleware = (roles = []) => {
  const allowed = roles.map((r) => String(r).toLowerCase());

  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Sign in to continue.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(header.slice(7).trim(), JWT_SECRET);
    } catch (err) {
      const expired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        error: expired ? 'Your session has expired. Please sign in again.' : 'Invalid session.'
      });
    }

    const role = String(decoded.role || '').toLowerCase();
    if (!ALL_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Your account has no valid role.' });
    }
    if (allowed.length > 0 && !allowed.includes(role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }

    req.user = { id: decoded.id, email: decoded.email, name: decoded.name, role };
    return next();
  };
};

module.exports = authMiddleware;
