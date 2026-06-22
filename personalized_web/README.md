# The Personalized Web

An interactive proof of concept: AI rewrites today's headlines in real time to
match a reader's chosen "trusted source," showing how on-the-fly personalization
could turn the web from a shared record into a stream of private interpretations.

## Files

- **`index.html`** — the whole front end (links `../css/learnwithai-shared.css`).
- **`worker.js`** — optional backend for the webinar (live news + shared-key rewriting).

## Two phases

### Phase 1 — now (no account, no backend)

`index.html` works on its own. With no API key entered it uses **pre-generated
rewrites** for the four preset outlets — indistinguishable to a viewer. Anyone can
also paste their **own** Claude API key (Advanced panel) to get live rewriting;
that call goes straight from their browser to Claude, no server involved.

Nothing to deploy. Open the file or drop the folder on the live site.

### Phase 2 — the webinar (free for everyone, your key)

Deploy `worker.js` so participants get **live** national news headlines plus live
rewriting on **your** key — no key of their own needed.

#### 1. Make a budget-capped Claude key

In the [Anthropic Console](https://console.anthropic.com): create a **Workspace**
with a low monthly **spend limit** (e.g. $20), then create an **API key inside that
workspace**. This caps the blast radius if the key leaks. (Cost is tiny anyway —
rewriting 8 headlines is a fraction of a cent per click.)

#### 2. Deploy the Worker (Cloudflare, free, no credit card)

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
   → **Create** → **Create Worker** → give it a name → **Deploy**.
2. **Edit code** → delete the starter, paste all of `worker.js` → **Deploy**.
3. **Settings → Variables and Secrets**, add:
   | Name | Type | Value |
   |------|------|-------|
   | `ANTHROPIC_API_KEY` | Secret | your budget-capped key |
   | `WEBINAR_MODE` | Text | `on` |
   | `ACCESS_CODE` | Text | a short code you'll announce (e.g. `umaine26`) |
   | `ALLOWED_ORIGIN` | Text | your site origin, e.g. `https://learnwithai.umaine.edu` (or `*` while testing) |
   | `MODEL` | Text | *(optional)* `claude-sonnet-4-6` |
   Re-deploy after saving.
4. Copy the Worker URL (`https://your-worker.your-name.workers.dev`).

#### 3. Point the page at the Worker

In `index.html`, near the top of the `<script>`:

```js
const WORKER_URL = "https://your-worker.your-name.workers.dev";
```

Now the feed loads live headlines and "Personalize" calls your key. Tell
participants the access code; if `ALLOWED_ORIGIN` isn't `*`, also make sure the
page is served from that origin.

#### 4. After the webinar — flip it off

Set `WEBINAR_MODE` to `off` in the Worker (one dashboard change, re-deploy). The
`/rewrite` endpoint now declines, and the page **automatically falls back to
bring-your-own-key** — visitors paste their own key, calls go browser→Claude
directly, your key is never used. Then **revoke** the webinar key in the Console.

> Leaving `WORKER_URL` set keeps live national news working even after the webinar
> (the `/news` endpoint isn't gated). To go fully static again, blank out
> `WORKER_URL` — the page reverts to the curated headlines + canned rewrites.

## Alternative hosts

`worker.js` is a standard `export default { fetch }` module, so it also runs on
**[val.town](https://val.town)** or **Deno Deploy** with the same env-var names —
pick whichever you find easiest to sign up for. All are free for this load.

## Notes

- Headlines in the static fallback are **illustrative composites** (no real named
  individuals); the rewrites are deliberate caricatures of editorial slant.
- Model is **Claude Sonnet 4.6** (fast, good slant quality). Change `MODEL` to
  `claude-haiku-4-5` for cheapest/fastest, or `claude-opus-4-8` for best quality.
