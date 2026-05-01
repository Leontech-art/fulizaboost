// api/stk-status.js
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { checkoutRequestId } = req.body;
  if (!checkoutRequestId) {
    return res.status(400).json({ error: 'Missing checkoutRequestId' });
  }

  const MEGAPAY_API_KEY = process.env.MEGAPAY_API_KEY;

  try {
    const response = await fetch(`https://api.megapay.co.ke/v1/stk-status/${checkoutRequestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MEGAPAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    const paid =
      data.status === 'SUCCESS' ||
      data.status === 'success' ||
      data.ResultCode === '0' ||
      data.payment_status === 'COMPLETED';

    const failed =
      data.status === 'FAILED' ||
      data.status === 'failed' ||
      data.ResultCode === '1032' ||
      data.ResultCode === '1037';

    return res.status(200).json({
      paid,
      failed,
      status: data.status || 'PENDING',
      message: data.ResultDesc || data.message || 'Pending',
    });

  } catch (err) {
    return res.status(500).json({ paid: false, failed: false, status: 'PENDING' });
  }
};
