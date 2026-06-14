// Netlify Function: HeyGen webhook receiver
// Public URL after deploy:
// https://capgenmkt.aproposgroupllc.com/.netlify/functions/heygen-webhook?token=<HEYGEN_WEBHOOK_TOKEN>

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    return json(200, {
      ok: true,
      service: 'capgen-heygen-webhook',
      message: 'HeyGen webhook endpoint is reachable. Use POST for webhook events.'
    });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const expectedToken = process.env.HEYGEN_WEBHOOK_TOKEN;
  const receivedToken = event.queryStringParameters?.token || event.headers['x-webhook-token'];

  // This protects the endpoint from random public POSTs. Keep this value secret in Netlify env vars.
  if (expectedToken && receivedToken !== expectedToken) {
    return json(401, { ok: false, error: 'Unauthorized webhook request' });
  }

  let payload;
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    return json(400, { ok: false, error: 'Invalid JSON body' });
  }

  const eventType = payload.event_type || payload.type || 'unknown';
  const eventData = payload.event_data || payload.data || payload;

  // Netlify logs become the first lightweight event log.
  // Later this can be upgraded to write to Supabase, Google Sheets, Airtable, or a CRM.
  console.log('[HeyGen webhook received]', JSON.stringify({
    event_type: eventType,
    event_data: eventData,
    received_at: new Date().toISOString()
  }));

  if (eventType.includes('success')) {
    console.log('[HeyGen video success]', JSON.stringify(eventData));
  }

  if (eventType.includes('fail')) {
    console.error('[HeyGen video failed]', JSON.stringify(eventData));
  }

  return json(200, {
    ok: true,
    received: true,
    event_type: eventType
  });
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}
