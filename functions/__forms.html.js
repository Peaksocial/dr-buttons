// Cloudflare Pages Function: replaces Netlify Forms.
// The site's forms POST url-encoded data to /__forms.html; we forward it to n8n as JSON.

const WEBHOOK_URL = "https://n8n.creativepeaksocial.com/webhook/dr-buttons-contact-form";
const TIMEOUT_MS = 10000;

export async function onRequestPost({ request }) {
  let fields;
  try {
    const formData = await request.formData();
    fields = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") fields[key] = value;
    }
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Honeypot filled in: a bot. Pretend it worked.
  if (fields["bot-field"]) return new Response("OK", { status: 200 });

  // Nothing to contact anyone with: ignore quietly.
  const blank = (v) => !v || !v.trim();
  if (blank(fields.name) && blank(fields.email) && blank(fields.phone)) {
    return new Response("OK", { status: 200 });
  }

  const { "form-name": formName, "bot-field": _honeypot, ...rest } = fields;
  const payload = {
    formName: formName || "",
    ...rest,
    site: "drbuttons.com.au",
    page: request.headers.get("Referer") || "",
    submittedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return new Response("Webhook error", { status: 502 });
    return new Response("OK", { status: 200 });
  } catch {
    return new Response("Webhook unreachable", { status: 502 });
  }
}
