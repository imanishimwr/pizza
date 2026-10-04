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

  return async (req, res, next) => {
    const header = req.headers.authorization;
    let token = null;
    if (header && header.startsWith('Bearer ')) {
      token = header.slice(7).trim();
    } else if (req.query.token) {
      token = String(req.query.token).trim();
    }

    if (!token) {
      return res.status(401).json({ error: 'Sign in to continue.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      const expired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        error: expired ? 'Your session has expired. Please sign in again.' : 'Invalid session.'
      });
    }

    let role = String(decoded.role || '').toLowerCase();

    // Verify current role & tokenVersion in database to prevent stale JWT claims / demoted admins
    try {
      const neonClient = require('../neonClient');
      if (neonClient && decoded.id) {
        const liveUser = await neonClient.findUserById(decoded.id);
        if (!liveUser) {
          return res.status(401).json({ error: 'Account no longer exists. Please sign in again.' });
        }
        const liveRole = String(liveUser.role || 'customer').toLowerCase();
        const liveTokenVersion = Number(liveUser.token_version ?? liveUser.tokenVersion ?? 1);
        const tokenVersion = Number(decoded.tokenVersion ?? 1);

        if (tokenVersion < liveTokenVersion) {
          return res.status(401).json({ error: 'Your session has been invalidated. Please sign in again.' });
        }
        if (decoded.role && String(decoded.role).toLowerCase() !== liveRole) {
          return res.status(401).json({ error: 'Your account permissions have changed. Please sign in again.' });
        }
        role = liveRole;
      }
    } catch (err) {
      if (err.statusCode || err.status || err.name === 'JsonWebTokenError') throw err;
      // In case DB is temporarily unreachable or in unit tests without DB, retain decoded role
    }

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
