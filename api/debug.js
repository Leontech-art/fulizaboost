const https = require('https');

function post(url, body) {
  return new Promise((resolve, reject) => {
    const b = body ? JSON.stringify(body) : '{}';
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve({ status: r.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: r.statusCode, body: d }); } });
    });
    req.on('error', reject);
    req.write(b);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const KEY    = process.env.UNIFIED_CONSUMER_KEY;
  const SECRET = process.env.UNIFIED_CONSUMER_SECRET;
  const CODE   = process.env.UNIFIED_SHORTCODE;

  if (!KEY || !SECRET || !CODE) {
    return res.status(200).json({
      result: 'ENV_MISSING',
      KEY: !!KEY, SECRET: !!SECRET, CODE: !!CODE
    });
  }

  try {
    // Use correct /url endpoint for validation
    const r = await post(`https://unifiedpay.co.ke/auth/cred/${KEY}/${SECRET}/url`, null);

    const ok = r.body.ResultCode === 0 || r.body.ResultCode === '0';

    return res.status(200).json({
      result: ok ? 'AUTH_SUCCESS' : 'AUTH_FAILED',
      httpStatus: r.status,
      response: r.body,
      KEY_preview: KEY.slice(0, 8) + '...',
      CODE
    });
  } catch (err) {
    return res.status(200).json({ result: 'NETWORK_ERROR', error: err.message });
  }
};
