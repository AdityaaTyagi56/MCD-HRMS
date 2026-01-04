
export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, message } = req.body;
  
  const TWILIO_ACCOUNT_SID = process.env.VITE_TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.VITE_TWILIO_AUTH_TOKEN;
  const TWILIO_WHATSAPP_NUMBER = process.env.VITE_TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return res.status(500).json({ error: 'Twilio credentials not configured in environment variables' });
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: TWILIO_WHATSAPP_NUMBER,
          To: to,
          Body: message,
        }).toString(),
      }
    );

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, messageId: data.sid });
    } else {
      return res.status(400).json({ success: false, error: data.message || 'Failed to send message' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
