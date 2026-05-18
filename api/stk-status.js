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

  const { checkoutRequestId, merchantRequestId } = req.body || {};
  if (!checkoutRequestId)
    return res.status(400).json({ error: 'Missing checkoutRequestId' });

  const KEY    = process.env.UNIFIED_CONSUMER_KEY;
  const SECRET = process.env.UNIFIED_CONSUMER_SECRET;
  const CODE   = process.env.UNIFIED_SHORTCODE;

  try {
    const auth = await get(`https://unifiedpay.co.ke/auth/cred/${KEY}/${SECRET}/`);
    const token = auth.access_token || auth.token || auth.accessToken;
    if (!token) return res.status(200).json({ paid: false, failed: false, status: 'PENDING' });

    const s = await post('https://unifiedpay.co.ke/api/stkquery/', token, {
      checkout_request_id: checkoutRequestId,
      merchant_request_id: merchantRequestId || '',
      shortcode: String(CODE)
    });

    const paid   = s.ResultCode === 0 || s.ResultCode === '0' || s.status === 'SUCCESS';
    const failed = s.ResultCode === 1032 || s.ResultCode === '1032' ||
                   s.ResultCode === 1037 || s.ResultCode === '1037' ||
                   s.status === 'FAILED';
    const mpesaRef = (s.CallbackMetadata && s.CallbackMetadata.Item &&
      s.CallbackMetadata.Item.find(i => i.Name === 'MpesaReceiptNumber') &&
      s.CallbackMetadata.Item.find(i => i.Name === 'MpesaReceiptNumber').Value) || '';

    return res.status(200).json({ paid, failed, status: s.ResultDesc || 'PENDING', mpesaRef });

  } catch (err) {
    return res.status(200).json({ paid: false, failed: false, status: 'PENDING' });
  }
};
