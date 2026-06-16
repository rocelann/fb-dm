// api/webhook.js
// Facebook Messenger DM-sorting webhook for Vercel.
// Handles two things:
//   1. GET  -> Meta's verification handshake (echoes hub.challenge)
//   2. POST -> incoming message events (classify + log)

export default async function handler(req, res) {
  // ---- 1. VERIFICATION (Meta sends a GET when you click "Verify and save") ----
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // VERIFY_TOKEN must match the string you typed into the Meta dashboard.
    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      console.log("Webhook verified by Meta.");
      return res.status(200).send(challenge); // echo the challenge back, raw
    }
    return res.status(403).send("Verification failed");
  }

  // ---- 2. INCOMING EVENTS ----
  if (req.method === "POST") {
    const body = req.body;

    // Only handle Page events (Messenger).
    if (body.object !== "page") {
      return res.status(404).send("Not a page event");
    }

    // Respond to Meta FAST (within ~20s) so it doesn't retry. Process after.
    res.status(200).send("EVENT_RECEIVED");

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        // Skip echoes (messages YOUR page sent) and non-message events.
        if (event.message && !event.message.is_echo) {
          const senderId = event.sender.id;          // PSID of the person
          const text = event.message.text || "";      // message body (may be empty for attachments)

          const category = classify(text);            // <-- your tagging logic

          // ---- WHERE THE TAG GOES (swap this out for GHL/Slack/etc.) ----
          await logToSheet({ senderId, text, category });
        }
      }
    }
    return;
  }

  return res.status(405).send("Method not allowed");
}

// ---------- TAGGING LOGIC ----------
// Dead simple keyword classifier. Replace/expand with whatever buckets you want.
function classify(text) {
  const t = text.toLowerCase();
  if (/\b(price|cost|how much|pricing|invest)\b/.test(t)) return "PRICING";
  if (/\b(book|call|schedule|calendar|available)\b/.test(t)) return "BOOKING";
  if (/\b(help|support|issue|problem|broken)\b/.test(t)) return "SUPPORT";
  if (/\b(interested|info|tell me more|learn)\b/.test(t)) return "LEAD";
  return "UNSORTED";
}

// ---------- DESTINATION ----------
// Logs to a Google Sheet via an Apps Script Web App URL (simplest to verify).
// Set SHEET_WEBHOOK_URL in Vercel env vars. See google-apps-script.gs.
async function logToSheet({ senderId, text, category }) {
  if (!process.env.SHEET_WEBHOOK_URL) {
    console.log("No SHEET_WEBHOOK_URL set. Would log:", { senderId, text, category });
    return;
  }
  try {
    await fetch(process.env.SHEET_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        senderId,
        text,
        category,
      }),
    });
  } catch (err) {
    console.error("Failed to log to sheet:", err);
  }
}
