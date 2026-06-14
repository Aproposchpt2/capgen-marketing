// Netlify Function: Create a HeyGen avatar video from a script
// Protected by HEYGEN_ADMIN_TOKEN.
// Keeps HEYGEN_API_KEY server-side only.

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

  let requestBody;
  try {
    requestBody = event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    return json(400, { ok: false, error: 'Invalid JSON body' });
  }

  const script = requestBody.script;
  const title = requestBody.title || 'CapGen Marketing Video';
  const avatarId = requestBody.avatar_id || process.env.HEYGEN_DEFAULT_AVATAR_ID;
  const voiceId = requestBody.voice_id || process.env.HEYGEN_DEFAULT_VOICE_ID;
  const aspectRatio = requestBody.aspect_ratio || '9:16';
  const resolution = requestBody.resolution || '1080p';
  const campaignId = requestBody.campaign_id || 'capgen-marketing';
  const callbackId = requestBody.callback_id || `${campaignId}-${Date.now()}`;

  if (!script || typeof script !== 'string') {
    return json(400, { ok: false, error: 'Missing required string field: script' });
  }

  if (!avatarId) {
    return json(400, { ok: false, error: 'Missing avatar_id or HEYGEN_DEFAULT_AVATAR_ID env variable' });
  }

  const siteUrl = (process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '');
  const webhookToken = process.env.HEYGEN_WEBHOOK_TOKEN;
  const callbackUrl = requestBody.callback_url || (siteUrl && webhookToken
    ? `${siteUrl}/.netlify/functions/heygen-webhook?token=${encodeURIComponent(webhookToken)}`
    : undefined);

  const heygenPayload = {
    type: 'avatar',
    avatar_id: avatarId,
    title,
    aspect_ratio: aspectRatio,
    resolution,
    output_format: 'mp4',
    script,
    callback_id: callbackId
  };

  if (voiceId) {
    heygenPayload.voice_id = voiceId;
  }

  if (callbackUrl) {
    heygenPayload.callback_url = callbackUrl;
  }

  if (requestBody.engine) {
    heygenPayload.engine = requestBody.engine;
  }

  if (requestBody.background) {
    heygenPayload.background = requestBody.background;
  }

  if (requestBody.caption) {
    heygenPayload.caption = requestBody.caption;
  }

  const response = await fetch('https://api.heygen.com/v3/videos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'Idempotency-Key': createSafeIdempotencyKey(callbackId)
    },
    body: JSON.stringify(heygenPayload)
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
      error: 'HeyGen video creation failed',
      request: sanitizeRequestForLogs(heygenPayload),
      details: responseJson
    });
  }

  return json(200, {
    ok: true,
    message: 'HeyGen video creation submitted',
    callback_id: callbackId,
    heygen: responseJson
  });
};

function createSafeIdempotencyKey(callbackId) {
  const safeCallback = String(callbackId || 'capgen').replace(/[^A-Za-z0-9_:.\-]/g, '_');
  return `capgen_${safeCallback}_${Date.now()}`.slice(0, 255);
}

function sanitizeRequestForLogs(payload) {
  return {
    title: payload.title,
    aspect_ratio: payload.aspect_ratio,
    resolution: payload.resolution,
    callback_id: payload.callback_id,
    has_callback_url: Boolean(payload.callback_url),
    script_length: payload.script?.length || 0,
    has_avatar_id: Boolean(payload.avatar_id),
    has_voice_id: Boolean(payload.voice_id)
  };
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
