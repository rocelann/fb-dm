# Facebook DM Sorter — Vercel Webhook

A serverless endpoint that receives Facebook Page DMs, classifies them into
categories, and logs each one to a Google Sheet.

## What it does
- Verifies the Meta webhook handshake (GET)
- Receives message events (POST), ignores echoes/your own replies
- Tags each DM via keyword rules in `classify()`
- Logs `{timestamp, senderId, text, category}` to a Google Sheet

It does NOT auto-reply. Pure routing/tagging.

---

## Setup

### 1. Google Sheet (the destination)
1. Create a new Google Sheet.
2. Extensions > Apps Script. Paste `google-apps-script.gs`.
3. Deploy > New deployment > type "Web app".
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the Web app URL ending in `/exec`. That's your `SHEET_WEBHOOK_URL`.

### 2. Deploy to Vercel
```
npm i -g vercel        # if needed
cd fb-dm-sorter
vercel                 # follow prompts, links/creates a project
vercel --prod          # deploy to production
```
Your endpoint will be: `https://<your-project>.vercel.app/api/webhook`

### 3. Environment variables (Vercel dashboard > Settings > Environment Variables)
| Name              | Value                                                |
|-------------------|------------------------------------------------------|
| `VERIFY_TOKEN`    | any secret string you invent (e.g. `psr_dm_2026`)    |
| `SHEET_WEBHOOK_URL` | the `/exec` URL from step 1                        |
| `PAGE_ACCESS_TOKEN` | (optional, only needed later if you add replies)   |

Redeploy after adding env vars: `vercel --prod`

### 4. Wire up Meta (the screen you're on)
- **Callback URL:** `https://<your-project>.vercel.app/api/webhook`
- **Verify token:** the same string you set as `VERIFY_TOKEN`
- Click **Verify and save**.
- Then subscribe to webhook fields: **`messages`** and **`messaging_postbacks`**.
- Under "Add Page subscription," select your Facebook Page.

### 5. Test
- During development you can only message the Page from an account with
  admin/developer/tester role on the app.
- Send a DM to your Page. A row should appear in the Sheet within seconds.

---

## Customizing the tags
Edit the `classify()` function in `api/webhook.js`. It's plain keyword matching
right now. Categories returned become the "Category" column in your sheet.

## Going to production
To receive DMs from the public (not just testers), submit the
**`pages_messaging`** permission for App Review. Until then it works only for
app roles.

## Swapping the destination
Replace `logToSheet()` with a call to GHL, Slack, a database, etc. The
classification stays the same — only the destination changes.
