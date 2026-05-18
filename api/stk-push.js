const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    }).on('error', reject);
  });
}

function post(url, token, body) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'Content-Length': Buffer.byteLength(b)
      }
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.write(b);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, amount, reference } = req.body || {};
  if (!phone || !amount || !reference)
    return res.status(400).json({ success: false, error: 'Missing fields' });

  const KEY    = process.env.UNIFIED_CONSUMER_KEY;
  const SECRET = process.env.UNIFIED_CONSUMER_SECRET;
  const CODE   = process.env.UNIFIED_SHORTCODE;

  try {
    // Get token
    const auth = await get(`https://unifiedpay.co.ke/auth/cred/${KEY}/${SECRET}/`);
    const token = auth.access_token || auth.token || auth.accessToken;
    if (!token) return res.status(200).json({ success: false, error: 'Auth failed', raw: auth });

    // Format phone as 07XXXXXXXX
    let p = String(phone).replace(/\D/g, '');
    if (p.startsWith('254')) p = '0' + p.slice(3);
    if (p.startsWith('7') || p.startsWith('1')) p = '0' + p;

    // STK Push
    const stk = await post('https://unifiedpay.co.ke/api/stkpush/', token, {
      phone_number: p,
      amount: String(amount),
      shortcode: String(CODE),
      reference: reference,
      account_number: reference
    });

    const ok = stk.ResponseCode === '0' || stk.ResponseCode === 0 ||
               stk.success === true || !!stk.CheckoutRequestID ||
               stk.status === 'success';

    return res.status(200).json({
      success: ok,
      checkoutRequestId: stk.CheckoutRequestID || stk.checkout_request_id || reference,
      merchantRequestId: stk.MerchantRequestID || stk.merchant_request_id || '',
      error: ok ? null : (stk.message || stk.errorMessage || JSON.stringify(stk)),
      raw: stk
    });

  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
};
