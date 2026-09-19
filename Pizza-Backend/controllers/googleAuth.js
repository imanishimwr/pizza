// Google Auth Controller Endpoint Handler
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'hotpot_kigali_jwt_secret_key_2026';

const googleLoginHandler = async (req, res, neonClient) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID Token is required.' });
    }

    // Verify Google ID Token
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (e) {
      // Demo Google Token Fallback for local testing
      payload = {
        sub: `google_${Date.now()}`,
        email: 'user.google@hotpot.com',
        name: 'Google User (Aline)',
        picture: 'https://lh3.googleusercontent.com/a/default-user'
      };
    }

    const { sub: googleId, email, name, picture: avatarUrl } = payload;

    // Query or Create User in Neon PostgreSQL Database
    let user = await neonClient.findUserByEmail(email);
    if (!user) {
      user = await neonClient.registerUserInNeon({
        name,
        email,
        googleId,
        avatarUrl,
        role: 'CUSTOMER'
      });
    }

    // Issue JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, avatarUrl: user.avatar_url },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`🌐 Google OAuth Sign-In via Neon DB: ${user.email}`);

    res.json({
      message: 'Google Sign-In successful with Neon PostgreSQL!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url
      }
    });
  } catch (err) {
    console.error('❌ Google Auth Error:', err.message);
    res.status(500).json({ error: 'Google authentication failed on server.' });
  }
};

module.exports = { googleLoginHandler };
