'use strict';
// Temporary script extraction function — delete after use.
// GET /.netlify/functions/heygen-scripts

exports.handler = async () => {
  const API_KEY   = process.env.HEYGEN_API_KEY || '';
  const ADM_TOKEN = process.env.HEYGEN_ADMIN_TOKEN || '';
  const authKey   = API_KEY || ADM_TOKEN;

  const CORS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!authKey) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'No HeyGen API key configured' }) };
  }

  // Step 1 — get video list
  const listRes = await fetch('https://api.heygen.com/v1/video.list?limit=20', {
    headers: { 'X-Api-Key': authKey, Accept: 'application/json' },
  });
  const listData = await listRes.json();
  const videos   = listData?.data?.videos || listData?.videos || [];

  if (!videos.length) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ raw: listData, message: 'No videos found or unexpected response structure' }) };
  }

  // Step 2 — pull status/script for each video
  const results = [];
  for (const v of videos) {
    const vid = v.video_id || v.id;
    const statusRes = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${vid}`, {
      headers: { 'X-Api-Key': authKey, Accept: 'application/json' },
    });
    const statusData = await statusRes.json();
    results.push({
      title:    v.title || v.name || '(untitled)',
      video_id: vid,
      status:   v.status,
      script:   statusData?.data?.script
             || statusData?.data?.caption_url
             || statusData?.data?.caption
             || statusData?.script
             || 'NOT FOUND IN API RESPONSE',
      raw_status: statusData,
    });
    await new Promise(r => setTimeout(r, 200)); // gentle rate limiting
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ total: results.length, videos: results }, null, 2),
  };
};
