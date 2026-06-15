'use strict';
// Temporary — delete after use.
// GET /.netlify/functions/heygen-get-ids?video_id=XXX
// Pulls avatar_id and voice_id from an existing HeyGen video via v3 API.

exports.handler = async (event) => {
  const apiKey  = process.env.HEYGEN_API_KEY || process.env.HEYGEN_ADMIN_TOKEN || '';
  const videoId = (event.queryStringParameters || {}).video_id || 'b5cb42357a834c2f856f3451101dfe27';

  const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  // Try v3 endpoint first
  const v3Res  = await fetch(`https://api.heygen.com/v3/videos/${videoId}`, {
    headers: { 'x-api-key': apiKey, Accept: 'application/json' },
  });
  const v3Data = await v3Res.json();

  // Also try v2 for fallback detail
  const v2Res  = await fetch(`https://api.heygen.com/v2/video/${videoId}`, {
    headers: { 'x-api-key': apiKey, Accept: 'application/json' },
  });
  const v2Data = await v2Res.json();

  // Also try listing avatars so we can match
  const avatarRes  = await fetch('https://api.heygen.com/v2/avatars?limit=50', {
    headers: { 'x-api-key': apiKey, Accept: 'application/json' },
  });
  const avatarData = await avatarRes.json();

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ video_id: videoId, v3: v3Data, v2: v2Data, avatars_sample: avatarData }, null, 2),
  };
};
