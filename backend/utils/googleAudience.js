const getAllowedClientIds = () =>
  String(process.env.GOOGLE_CLIENT_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

// Confirms the token was issued to OUR OAuth client and belongs to the same email userinfo returned.
// Returns { ok: boolean, notConfigured: boolean }. Fails closed on any error.
const verifyGoogleAudience = async (googleToken, googleUser) => {
  const allowed = getAllowedClientIds();
  if (allowed.length === 0) return { ok: false, notConfigured: true };
  const expectedEmail = String((googleUser && googleUser.email) || '').toLowerCase().trim();
  if (!expectedEmail) return { ok: false, notConfigured: false };

  for (const param of ['access_token', 'id_token']) {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?${param}=${encodeURIComponent(googleToken)}`);
      if (!response.ok) continue;
      const info = await response.json();
      const infoEmail = String(info.email || '').toLowerCase().trim();
      if (allowed.includes(info.aud) && infoEmail === expectedEmail) {
        return { ok: true, notConfigured: false };
      }
    } catch (e) {
      // fall through and try the next token type; ultimately fails closed
    }
  }
  return { ok: false, notConfigured: false };
};

module.exports = { verifyGoogleAudience };
