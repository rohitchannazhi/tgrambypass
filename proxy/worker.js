// Cloudflare Worker: relays Telegram Bot API calls for networks that block api.telegram.org.
// Deploy it in your own Cloudflare account (see README). Optional settings (Worker variables):
//   ALLOWED_ORIGIN  e.g. https://rohitchannazhi.github.io  (default: allow any origin)
//   ALLOWED_BOT_ID  e.g. 8906169783 (the number before the colon in your token); other bots are refused
export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, GET, OPTIONS",
      "access-control-allow-headers": "content-type",
      "vary": "origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const m = url.pathname.match(/^\/bot(\d+):[\w-]+\/\w+$/);
    if (!m || (env.ALLOWED_BOT_ID && m[1] !== env.ALLOWED_BOT_ID)) {
      return new Response("Not allowed", { status: 403, headers: cors });
    }

    const upstream = await fetch("https://api.telegram.org" + url.pathname, {
      method: request.method,
      headers: { "content-type": request.headers.get("content-type") || "application/json" },
      body: request.method === "GET" ? undefined : request.body,
    });
    const headers = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
