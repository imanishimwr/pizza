/**
 * Google Sign-In.
 *
 * The ID token is verified against Google with a fixed audience. If that
 * verification fails the request is rejected — there is deliberately no demo
 * fallback, because a fallback that accepts any non-empty string lets anyone
 * mint a session as any account.
 *
 * Google accounts are always created as customers. An existing account that has
 * already been given a staff role keeps that role.
 */
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function googleLoginHandler(req, res, neonClient, signToken) {
  const idToken = req.body?.idToken;
  if (!idToken) {
    return res.status(400).json({ error: 'Google ID token is required.' });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google Sign-In is not configured on this deployment.' });
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.warn('[auth] Google token verification failed:', err.message);
    return res.status(401).json({ error: 'Google Sign-In could not be verified.' });
  }

  const googleId = payload.sub;
  const email = String(payload.email || '').toLowerCase();
  if (!googleId || !email || payload.email_verified === false) {
    return res.status(401).json({ error: 'That Google account is not usable for sign-in.' });
  }

  let user = await neonClient.findUserByEmail(email);
  if (!user) {
    user = await neonClient.registerUser({
      name: payload.name || email.split('@')[0],
      email,
      googleId,
      avatarUrl: payload.picture || null
    });
  } else if (!user.googleId) {
    // First Google sign-in on an existing password account links the two.
    await neonClient.linkGoogleAccount(user.id, googleId, payload.picture || null);
  }

  return res.json({
    token: signToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      avatarUrl: user.avatarUrl || null,
      role: user.role
    }
  });
}

module.exports = { googleLoginHandler };
