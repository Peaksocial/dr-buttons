// Cloudflare Pages Function: the assessment page's initial-info form.
// The page POSTs JSON here; we forward it to n8n so the browser never talks to n8n directly.

const WEBHOOK_URL = "https://n8n.creativepeaksocial.com/webhook/initial-info-form-dr-buttons";
const TIMEOUT_MS = 10000;
const FIELDS = [
  "firstName", "lastName", "dob", "email", "mobile",
  "street", "suburb", "city", "state", "postcode",
  "medicare", "medicareIrn", "treatment",
];

export async function onRequestPost({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const fields = {};
  for (const key of FIELDS) {
    fields[key] = typeof body[key] === "string" ? body[key].trim() : "";
  }

  // Nothing to contact anyone with: ignore quietly.
  if (!fields.email && !fields.mobile) return new Response("OK", { status: 200 });

  const payload = {
    ...fields,
    name: [fields.firstName, fields.lastName].filter(Boolean).join(" "),
    // dob arrives as YYYY-MM-DD; also send it Australian-style for humans.
    dobFormatted: /^\d{4}-\d{2}-\d{2}$/.test(fields.dob) ? fields.dob.split("-").reverse().join("/") : fields.dob,
    address: [fields.street, fields.suburb, fields.city, [fields.state, fields.postcode].filter(Boolean).join(" ")]
      .filter(Boolean).join(", "),
    criteria: Array.isArray(body.criteria) ? body.criteria.map(String) : [],
    criteriaConfirmed: body.criteriaConfirmed === true,
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
