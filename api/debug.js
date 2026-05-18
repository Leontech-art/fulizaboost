// api/debug.js
const https = require('https');

function request(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: { ...headers, ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}) },
    };
    const req = https.request(opts, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve({ status: r.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: r.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const KEY    = process.env.UNIFIED_CONSUMER_KEY;
  const SECRET = process.env.UNIFIED_CONSUMER_SECRET;
  const CODE   = process.env.UNIFIED_SHORTCODE;

  const envCheck = {
    KEY_loaded:     !!KEY,
    SECRET_loaded:  !!SECRET,
    CODE_loaded:    !!CODE,
    KEY_preview:    KEY    ? KEY.slice(0,8)+'...'    : 'MISSING',
    SECRET_preview: SECRET ? SECRET.slice(0,8)+'...' : 'MISSING',
    CODE_value:     CODE   || 'MISSING',
  };

  if (!KEY || !SECRET || !CODE) {
    return res.status(200).json({ step: 'ENV_CHECK_FAILED', envCheck });
  }

  let authResult;
  try {
    authResult = await request(
      `https://unifiedpay.co.ke/auth/cred/${KEY}/${SECRET}/`,
      'GET',
      { 'Content-Type': 'application/json' },
      null
    );
  } catch (err) {
    return res.status(200).json({ step: 'AUTH_NETWORK_FAILED', error: err.message, envCheck });
  }

  const token =
    authResult.body?.access_token ||
    authResult.body?.token ||
    authResult.body?.accessToken;

  return res.status(200).json({
    step:         token ? 'AUTH_SUCCESS' : 'AUTH_FAILED_NO_TOKEN',
    envCheck,
    authStatus:   authResult.status,
    authResponse: authResult.body,
    tokenFound:   !!token,
    tokenPreview: token ? token.slice(0,16)+'...' : null,
  });
};
