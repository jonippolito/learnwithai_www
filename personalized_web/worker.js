/**
 * The Personalized Web — backend Worker
 * ─────────────────────────────────────
 * Two jobs, one tiny serverless function:
 *   GET  /news     → today's real headlines from Google News (solves the
 *                    browser CORS block on a static site). Always on.
 *   POST /rewrite  → rewrites headlines via Claude using a SHARED key held
 *                    here as a secret. Gated by WEBINAR_MODE so you can switch
 *                    it off after the event (then the page falls back to
 *                    bring-your-own-key, calling Claude directly from the browser).
 *
 * Runs as-is on Cloudflare Workers. The same file also runs on val.town or
 * Deno Deploy (it's a standard `export default { fetch }` module).
 *
 * ── Environment variables (set in the host's dashboard) ──
 *   ANTHROPIC_API_KEY  (secret, required)  your Claude key — use a budget-capped one
 *   WEBINAR_MODE       "on" | "off"        "on" enables shared-key rewriting
 *   ACCESS_CODE        (optional)          if set, /rewrite requires a matching code
 *   ALLOWED_ORIGIN     (optional)          CORS origin; defaults to "*"
 *   MODEL              (optional)          defaults to claude-sonnet-4-6
 */

const DEFAULT_MODEL = "claude-sonnet-4-6";

// Tried in order until one yields headlines. NPR/BBC first because Google News
// returns 503 to data-center IPs (like Cloudflare's). `stripSuffix` removes the
// " - Source" tail that only Google News appends.
const NEWS_FEEDS = [
  { url: "https://feeds.npr.org/1001/rss.xml", stripSuffix: false },
  {
    url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml",
    stripSuffix: false,
  },
  {
    url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
    stripSuffix: true,
  },
];

export default {
  async fetch(request, env) {
    const origin = (env && env.ALLOWED_ORIGIN) || "*";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    try {
      if (url.pathname === "/news" && request.method === "GET") {
        return json({ headlines: await fetchHeadlines() }, 200, origin);
      }
      if (url.pathname === "/rewrite" && request.method === "POST") {
        return await handleRewrite(request, env, origin);
      }
      return json({ error: "not_found" }, 404, origin);
    } catch (err) {
      return json(
        { error: "server_error", detail: String((err && err.message) || err) },
        500,
        origin,
      );
    }
  },
};

/* ───────────────────────── /news ───────────────────────── */
async function fetchHeadlines() {
  let lastErr = "none";
  for (const feed of NEWS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept:
            "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (!res.ok) {
        lastErr = "upstream_" + res.status;
        continue;
      }
      const headlines = parseHeadlines(await res.text(), feed.stripSuffix);
      if (headlines.length >= 3) return headlines;
      lastErr = "parse_empty";
    } catch (e) {
      lastErr = String((e && e.message) || e);
    }
  }
  throw new Error("news_unavailable_" + lastErr);
}

// Workers has no DOMParser; parse the RSS items with a small regex pass.
function parseHeadlines(xml, stripSuffix) {
  const items = xml.split("<item>").slice(1);
  const headlines = [];
  for (const item of items) {
    const m = item.match(/<title>([\s\S]*?)<\/title>/);
    if (!m) continue;
    let t = decodeEntities(m[1]).trim();
    if (stripSuffix) t = t.replace(/\s+-\s+[^-]+$/, "").trim();
    if (t) headlines.push(t);
    if (headlines.length >= 8) break;
  }
  return headlines;
}

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

/* ──────────────────────── /rewrite ──────────────────────── */
async function handleRewrite(request, env, origin) {
  if ((env.WEBINAR_MODE || "").toLowerCase() !== "on") {
    return json({ error: "webinar_closed" }, 403, origin);
  }
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "no_key_configured" }, 500, origin);
  }

  const body = await request.json().catch(() => ({}));
  const { source, intensity, headlines, accessCode } = body;

  if (env.ACCESS_CODE && (accessCode || "") !== env.ACCESS_CODE) {
    return json({ error: "bad_access_code" }, 401, origin);
  }
  if (!source || !Array.isArray(headlines) || !headlines.length) {
    return json({ error: "bad_request" }, 400, origin);
  }

  const tone = String(intensity || "moderate").toLowerCase();
  const system =
    "You are demonstrating, for a media-literacy exhibit, how AI can silently rewrite the news " +
    "to fit a reader's assumptions. Given neutral wire-service headlines and a reader's chosen " +
    "trusted outlet, rewrite each headline in that outlet's characteristic framing, word choice, " +
    "and emphasis—as that outlet's own editors plausibly might. Keep each a single realistic " +
    "headline of similar length. Do not add quotation marks, labels, commentary, or disclaimers.";
  const user =
    `Trusted outlet / worldview: ${source}\nSlant intensity: ${tone}\n\n` +
    `Rewrite these ${headlines.length} headlines, preserving order:\n` +
    headlines.map((h, i) => `${i + 1}. ${h}`).join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.MODEL || DEFAULT_MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              rewritten: { type: "array", items: { type: "string" } },
            },
            required: ["rewritten"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!res.ok) {
    return json(
      { error: "model_" + res.status, detail: await res.text() },
      502,
      origin,
    );
  }
  const data = await res.json();
  const txt = (data.content || []).find((b) => b.type === "text")?.text || "{}";
  const rewritten = JSON.parse(txt).rewritten;
  return json({ rewritten }, 200, origin);
}

/* ───────────────────────── helpers ───────────────────────── */
function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...cors(origin) },
  });
}
