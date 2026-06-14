# HeyGen API + Webhook Setup for CapGen Marketing

This setup keeps the HeyGen API key server-side in Netlify environment variables and adds three Netlify Functions:

1. `heygen-webhook.js` — receives HeyGen webhook events.
2. `heygen-register-webhook.js` — registers the webhook endpoint with HeyGen.
3. `heygen-create-video.js` — submits a HeyGen avatar video generation request from a script.

## 1. Required Netlify environment variables

In Netlify:

`Site configuration` → `Environment variables` → `Add variable`

Add these variables:

```txt
HEYGEN_API_KEY=<your HeyGen API key>
HEYGEN_ADMIN_TOKEN=<create a long private admin token>
HEYGEN_WEBHOOK_TOKEN=<create a long private webhook token>
SITE_URL=https://capgenmkt.aproposgroupllc.com
```

Optional defaults:

```txt
HEYGEN_DEFAULT_AVATAR_ID=<your default HeyGen avatar id>
HEYGEN_DEFAULT_VOICE_ID=<your default HeyGen voice id>
HEYGEN_WEBHOOK_SIGNING_SECRET=<returned by HeyGen after webhook registration>
```

Do not put API keys in frontend HTML, JavaScript, GitHub commits, or browser-visible code.

## 2. Deploy the functions

After the files are in GitHub, trigger a Netlify deploy:

`Deploys` → `Trigger deploy` → `Clear cache and deploy site`

After deploy, test the webhook health endpoint in the browser:

```txt
https://capgenmkt.aproposgroupllc.com/.netlify/functions/heygen-webhook
```

Expected response:

```json
{
  "ok": true,
  "service": "capgen-heygen-webhook"
}
```

## 3. Register the webhook with HeyGen

Use Postman, Insomnia, curl, or a secure admin tool to POST to:

```txt
https://capgenmkt.aproposgroupllc.com/.netlify/functions/heygen-register-webhook
```

Required header:

```txt
x-admin-token: <HEYGEN_ADMIN_TOKEN>
```

Optional JSON body:

```json
{
  "events": ["avatar_video.success", "avatar_video.fail", "video_agent.success", "video_agent.fail"]
}
```

The function will register this webhook URL:

```txt
https://capgenmkt.aproposgroupllc.com/.netlify/functions/heygen-webhook?token=<HEYGEN_WEBHOOK_TOKEN>
```

HeyGen returns a webhook signing secret when the endpoint is created. Save that value in Netlify as:

```txt
HEYGEN_WEBHOOK_SIGNING_SECRET=<secret returned by HeyGen>
```

## 4. Create a HeyGen video from a script

POST to:

```txt
https://capgenmkt.aproposgroupllc.com/.netlify/functions/heygen-create-video
```

Required header:

```txt
x-admin-token: <HEYGEN_ADMIN_TOKEN>
Content-Type: application/json
```

Example body:

```json
{
  "title": "CapGen - SAM.gov Backwards Script",
  "campaign_id": "capgen-launch",
  "script": "Most small businesses search SAM.gov backwards. They start with random keywords instead of starting with their actual capability profile. CapGen helps turn that capability profile into a focused government contract opportunity pipeline.",
  "aspect_ratio": "9:16",
  "resolution": "1080p"
}
```

The function sends the request to HeyGen and returns the HeyGen response, including the submitted video ID/status where available.

## 5. What happens when the video is ready

HeyGen posts a webhook event to the CapGen webhook function.

Events currently subscribed:

- `avatar_video.success`
- `avatar_video.fail`
- `video_agent.success`
- `video_agent.fail`

The webhook function logs the event in Netlify Function logs.

Later upgrade options:

- Save video records to Supabase.
- Save campaign status to Google Sheets.
- Email notification when a video completes.
- Add a private dashboard for video production tracking.
- Add automatic download/archive of final video URLs.

## 6. Security notes

- Keep `HEYGEN_API_KEY` private.
- Keep `HEYGEN_ADMIN_TOKEN` private.
- Keep `HEYGEN_WEBHOOK_TOKEN` private.
- Never call HeyGen API directly from browser JavaScript.
- Do not commit secrets to GitHub.
- Rotate tokens if exposed.

## 7. Current architecture

```txt
Marketing Orchestrator script
        ↓
CapGen Netlify Function: heygen-create-video
        ↓
HeyGen API creates video
        ↓
HeyGen webhook callback
        ↓
CapGen Netlify Function: heygen-webhook
        ↓
Netlify logs now; Supabase/Google Sheets later
```
