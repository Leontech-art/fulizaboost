// api/stk-push.js
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, amount, reference } = req.body;

  if (!phone || !amount || !reference) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const MEGAPAY_API_KEY = process.env.MEGAPAY_API_KEY;

  try {
    const response = await fetch('https://api.megapay.co.ke/v1/stk-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MEGAPAY_API_KEY}`,
      },
      body: JSON.stringify({
        phone_number: '254' + phone,
        amount: amount,
        reference: reference,
        description: `Fuliza Boost - ${reference}`,
        callback_url: `https://${req.headers.host}/api/stk-callback`,
      }),
    });

    const data = await response.json();

    const success =
      data.success === true ||
      data.status === 'success' ||
      data.ResponseCode === '0';

    if (response.ok && success) {
      return res.status(200).json({
        success: true,
        checkoutRequestId: data.CheckoutRequestID || data.checkout_request_id || data.id || reference,
        message: 'STK Push sent successfully.',
      });
    }

    return res.status(400).json({
      success: false,
      error: data.message || data.errorMessage || 'STK Push failed. Please try again.',
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  }
};
  
