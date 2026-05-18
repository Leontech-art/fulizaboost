const store = {};

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    const id = req.query && req.query.id;
    if (id && store[id]) return res.status(200).json(store[id]);
    return res.status(200).json({ status: 'PENDING' });
  }

  if (req.method === 'POST') {
    try {
      const b = req.body || {};
      const cb = (b.Body && b.Body.stkCallback) ? b.Body.stkCallback : b;
      const id = cb.CheckoutRequestID || cb.checkout_request_id;
      const code = cb.ResultCode;
      if (id) {
        const items = cb.CallbackMetadata && cb.CallbackMetadata.Item;
        const mpesaRef = items && items.find(i => i.Name === 'MpesaReceiptNumber');
        store[id] = {
          paid: code === 0 || code === '0',
          failed: code !== 0 && code !== '0',
          status: (code === 0 || code === '0') ? 'SUCCESS' : 'FAILED',
          mpesaRef: mpesaRef ? mpesaRef.Value : ''
        };
      }
    } catch(e) {}
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }

  return res.status(405).end();
};
