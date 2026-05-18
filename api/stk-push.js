const https = require('https');

function post(url, body) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

  // Format phone — UnifiedPay accepts both 254XXXXXXXXX and 07XXXXXXXX
  let msisdn = String(phone).replace(/\D/g, '');
  if (msisdn.startsWith('0')) msisdn = '254' + msisdn.slice(1);
  if (!msisdn.startsWith('254')) msisdn = '254' + msisdn;

  // Truncate reference to max 20 chars
  const ref = String(reference).slice(0, 20);

  try {
    const stk = await post(
      `https://unifiedpay.co.ke/auth/cred/${KEY}/${SECRET}/sendstk`,
      {
        amount: parseInt(amount),
        msisdn: msisdn,
        reference: ref,
        account_number: ref
      }
    );

    const ok = stk.ResponseCode === '0' || stk.success === true;

    return res.status(200).json({
      success: ok,
      transaction_request_id: stk.transaction_request_id || '',
      checkoutRequestId: stk.CheckoutRequestID || stk.transaction_request_id || reference,
      merchantRequestId: stk.MerchantRequestID || '',
      error: ok ? null : (stk.errorMessage || stk.message || JSON.stringify(stk)),
      raw: stk
    });

  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
};
