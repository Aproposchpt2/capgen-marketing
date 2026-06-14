// Netlify Function: Register the CapGen HeyGen webhook endpoint
// Call this once after setting Netlify env vars.
// Protected by HEYGEN_ADMIN_TOKEN.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const adminToken = process.env.HEYGEN_ADMIN_TOKEN;
  const receivedAdminToken = event.headers['x-admin-token'];

  if (!adminToken || receivedAdminToken !== adminToken) {
    return json(401, { ok: false, error: 'Unauthorized admin request' });
  }

  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return json(500, { ok: false, error: 'Missing HEYGEN_API_KEY env variable' });
  }

  const siteUrl = (process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '');
  const webhookToken = process.env.HEYGEN_WEBHOOK_TOKEN;

  if (!siteUrl) {
    return json(500, { ok: false, error: 'Missing SITE_URL or URL env variable' });
  }

  if (!webhookToken) {
    return json(500, { ok: false, error: 'Missing HEYGEN_WEBHOOK_TOKEN env variable' });
  }

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    return json(400, { ok: false, error: 'Invalid JSON body' });
  }

  const webhookUrl = body.url || `${siteUrl}/.netlify/functions/heygen-webhook?token=${encodeURIComponent(webhookToken)}`;
  const events = body.events || ['avatar_video.success', 'avatar_video.fail', 'video_agent.success', 'video_agent.fail'];

  const response = await fetch('https://api.heygen.com/v3/webhooks/endpoints', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'Idempotency-Key': createSafeIdempotencyKey()
    },
    body: JSON.stringify({
      url: webhookUrl,
      events
    })
  });

  const responseText = await response.text();
  let responseJson;
  try {
    responseJson = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    responseJson = { raw: responseText };
  }

  if (!response.ok) {
    return json(response.status, {
      ok: false,
      error: 'HeyGen webhook registration failed',
      details: responseJson
    });
  }

  return json(200, {
    ok: true,
    message: 'HeyGen webhook endpoint registered. Save the returned secret in Netlify as HEYGEN_WEBHOOK_SIGNING_SECRET if you plan to verify webhook signatures later.',
    heygen: responseJson
  });
};

function createSafeIdempotencyKey() {
  const random = Math.random().toString(36).slice(2);
  return `capgen_heygen_webhook_${Date.now()}_${random}`.slice(0, 255);
}

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
