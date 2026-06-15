'use strict';
// Temporary — delete after use.
// GET /.netlify/functions/heygen-get-ids

async function safeGet(url, headers) {
  try {
    const res  = await fetch(url, { headers });
    const text = await res.text();
    try { return { status: res.status, data: JSON.parse(text) }; }
    catch { return { status: res.status, data: text.slice(0, 300) }; }
  } catch(e) {
    return { status: 0, error: e.message };
  }
}

exports.handler = async (event) => {
  const apiKey = process.env.HEYGEN_API_KEY || process.env.HEYGEN_ADMIN_TOKEN || '';
  const h      = { 'x-api-key': apiKey, Accept: 'application/json' };
  const CORS   = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  const [avatars, voices, videoDetail] = await Promise.all([
    safeGet('https://api.heygen.com/v2/avatars?limit=20', h),
    safeGet('https://api.heygen.com/v2/voices?limit=20', h),
    safeGet('https://api.heygen.com/v3/videos/b5cb42357a834c2f856f3451101dfe27', h),
  ]);

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ avatars, voices, videoDetail }, null, 2),
  };
};
