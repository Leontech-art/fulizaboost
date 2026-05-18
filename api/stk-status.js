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

  const { checkoutRequestId } = req.body || {};
  if (!checkoutRequestId)
    return res.status(400).json({ error: 'Missing checkoutRequestId' });

  const KEY    = process.env.UNIFIED_CONSUMER_KEY;
  const SECRET = process.env.UNIFIED_CONSUMER_SECRET;

  try {
    const s = await post(
      `https://unifiedpay.co.ke/auth/cred/${KEY}/${SECRET}/sendstatus`,
      { transaction_request_id: checkoutRequestId }
    );

    // From docs: TransactionStatus = "Completed", TransactionCode = "0" = success
    const paid =
      s.TransactionStatus === 'Completed' ||
      s.TransactionCode === '0' ||
      s.TransactionCode === 0 ||
      s.ResultCode === '0' ||
      s.ResultCode === 0;

    const failed =
      s.ResultCode === 1032 || s.ResultCode === '1032' ||
      s.ResultCode === 1037 || s.ResultCode === '1037' ||
      s.TransactionStatus === 'Failed';

    const mpesaRef = s.TransactionReceipt || s.MpesaReceiptNumber || '';

    return res.status(200).json({
      paid,
      failed,
      status: s.TransactionStatus || s.ResultDesc || 'Pending',
      mpesaRef,
      raw: s
    });

  } catch (err) {
    return res.status(200).json({ paid: false, failed: false, status: 'Pending' });
  }
};
