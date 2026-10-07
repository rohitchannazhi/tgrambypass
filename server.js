// Telegram bot web interface. Zero dependencies; requires Node 18+.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const UI_PASSWORD = process.env.UI_PASSWORD || "";
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data", "messages.json");
const API = `https://api.telegram.org/bot${TOKEN}`;

if (!TOKEN) {
  console.error("Set TELEGRAM_BOT_TOKEN (get one from @BotFather).");
  process.exit(1);
}

// ---- storage -------------------------------------------------------------
let messages = [];
try {
  messages = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} catch {}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(messages.slice(-5000)));
  }, 500);
}

const clients = new Set();
function addMessage(m) {
  messages.push(m);
  save();
  for (const res of clients) res.write(`data: ${JSON.stringify(m)}\n\n`);
}

// ---- telegram ------------------------------------------------------------
async function tg(method, body) {
  const r = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.description || "Telegram API error");
  return j.result;
}

function chatName(c) {
  return c.title || [c.first_name, c.last_name].filter(Boolean).join(" ") || c.username || String(c.id);
}

function fromUpdate(u) {
  const m = u.message || u.channel_post;
  if (!m) return null;
  return {
    id: `${m.chat.id}:${m.message_id}`,
    chatId: m.chat.id,
    chatName: chatName(m.chat),
    from: m.from ? [m.from.first_name, m.from.last_name].filter(Boolean).join(" ") : chatName(m.chat),
    text: m.text || m.caption || `[${Object.keys(m).find((k) => ["photo", "document", "voice", "sticker", "video", "audio", "location"].includes(k)) || "non-text"} message]`,
    date: m.date * 1000,
    direction: "in",
  };
}

async function poll() {
  let offset = 0;
  const me = await tg("getMe");
  console.log(`Bot connected: @${me.username}`);
  await tg("deleteWebhook").catch(() => {});
  for (;;) {
    try {
      const updates = await tg("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "channel_post"] });
      for (const u of updates) {
        offset = u.update_id + 1;
        const m = fromUpdate(u);
        if (m) addMessage(m);
      }
    } catch (e) {
      console.error("poll error:", e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// ---- http ----------------------------------------------------------------
function authorized(req) {
  if (!UI_PASSWORD) return true;
  const h = req.headers.authorization || "";
  const [scheme, b64] = h.split(" ");
  if (scheme !== "Basic" || !b64) return false;
  const pass = Buffer.from(b64, "base64").toString().split(":").slice(1).join(":");
  const a = Buffer.from(pass);
  const b = Buffer.from(UI_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let s = "";
    req.on("data", (c) => {
      s += c;
      if (s.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(s || "{}"));
      } catch (e) {
        reject(e);
      }
    });
  });
}

const json = (res, code, obj) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
};

const server = http.createServer(async (req, res) => {
  if (!authorized(req)) {
    res.writeHead(401, { "www-authenticate": 'Basic realm="telegram-bot-interface"' });
    return res.end("Unauthorized");
  }
  const url = new URL(req.url, "http://x");

  if (req.method === "GET" && url.pathname === "/api/messages") return json(res, 200, messages);

  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    res.write(": connected\n\n");
    clients.add(res);
    const ping = setInterval(() => res.write(": ping\n\n"), 25000);
    req.on("close", () => {
      clearInterval(ping);
      clients.delete(res);
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/send") {
    try {
      const { chatId, text } = await readJson(req);
      if (!chatId || !text || !String(text).trim()) return json(res, 400, { error: "chatId and text are required" });
      const sent = await tg("sendMessage", { chat_id: chatId, text });
      const m = {
        id: `${sent.chat.id}:${sent.message_id}`,
        chatId: sent.chat.id,
        chatName: chatName(sent.chat),
        from: "Bot",
        text: sent.text,
        date: sent.date * 1000,
        direction: "out",
      };
      addMessage(m);
      return json(res, 200, m);
    } catch (e) {
      return json(res, 502, { error: e.message });
    }
  }

  if (req.method === "GET") {
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const full = path.join(__dirname, "public", path.normalize(file));
    if (!full.startsWith(path.join(__dirname, "public"))) return json(res, 403, { error: "forbidden" });
    return fs.readFile(full, (err, buf) => {
      if (err) return json(res, 404, { error: "not found" });
      const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
      res.writeHead(200, { "content-type": types[path.extname(full)] || "application/octet-stream" });
      res.end(buf);
    });
  }
  json(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => console.log(`UI on http://${HOST}:${PORT}`));
poll().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(1);
});
