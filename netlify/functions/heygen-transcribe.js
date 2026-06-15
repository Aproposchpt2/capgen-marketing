'use strict';
// Temporary — delete after use.
// GET /.netlify/functions/heygen-transcribe?video_id=XXX
// Downloads MP4 from HeyGen, transcribes with OpenAI Whisper, returns script text.
// GET /.netlify/functions/heygen-transcribe?mode=list — returns all video IDs + durations.

const HEYGEN_KEY = process.env.HEYGEN_API_KEY || process.env.HEYGEN_ADMIN_TOKEN || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

exports.handler = async (event) => {
  if (!HEYGEN_KEY) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'HEYGEN_API_KEY not set' }) };
  if (!OPENAI_KEY) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'OPENAI_API_KEY not set' }) };

  const q      = event.queryStringParameters || {};
  const mode   = q.mode || 'transcribe';
  const videoId = q.video_id || '';

  // ── LIST MODE — get all videos with ID + duration so we know which to transcribe ──
  if (mode === 'list') {
    const listRes = await fetch('https://api.heygen.com/v1/video.list?limit=20', {
      headers: { 'X-Api-Key': HEYGEN_KEY, Accept: 'application/json' },
    });
    const listData = await listRes.json();
    const videos   = listData?.data?.videos || listData?.videos || [];
    const summary  = videos.map(v => ({
      video_id: v.video_id || v.id,
      title:    v.title || '(untitled)',
      status:   v.status,
      duration: v.duration || null,
      created:  v.created_at || null,
    }));
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ total: summary.length, videos: summary }, null, 2) };
  }

  // ── TRANSCRIBE MODE — download + whisper one video ──
  if (!videoId) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Provide ?video_id=XXX or ?mode=list' }) };
  }

  // Get fresh signed video URL from HeyGen
  const statusRes = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
    headers: { 'X-Api-Key': HEYGEN_KEY, Accept: 'application/json' },
  });
  const statusData = await statusRes.json();
  const videoUrl   = statusData?.data?.video_url;
  if (!videoUrl) {
    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'video_url not found', raw: statusData }) };
  }

  // Download the video as a buffer
  const videoRes    = await fetch(videoUrl);
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

  // Build multipart form for Whisper (Node 18 native FormData + File)
  const formData = new FormData();
  formData.append('file', new File([videoBuffer], `${videoId}.mp4`, { type: 'video/mp4' }));
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'text');

  // Call OpenAI Whisper
  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:  'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body:    formData,
  });

  if (!whisperRes.ok) {
    const err = await whisperRes.text();
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Whisper failed', detail: err }) };
  }

  const transcript = await whisperRes.text();

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ video_id: videoId, duration: statusData?.data?.duration, transcript }, null, 2),
  };
};
