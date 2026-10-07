# tgrambypass

A hosted web interface for chatting through a Telegram bot, served by GitHub Pages. Incoming messages appear live and you reply from the page.

There is no backend. The page talks to the Telegram Bot API directly from your browser.

## Use it

1. Message [@BotFather](https://t.me/BotFather), run `/newbot`, and copy the token.
2. Open the Pages site: https://rohitchannazhi.github.io/tgrambypass/
3. Paste the token and press Connect.
4. Send your bot a message in Telegram. The chat appears in the sidebar; select it and reply.

To message someone first, they must have started a conversation with the bot (Telegram's rule). Enter their numeric chat ID in the sidebar.

## Enabling GitHub Pages

Repo Settings → Pages → Source: Deploy from a branch → `main` / `(root)`.

## Things to know

- **Token safety:** the token is saved in your browser's localStorage, never in the repo and never sent anywhere but `api.telegram.org`. Anyone with access to your browser profile can read it, so use "Disconnect" on shared machines. Because the site is static, don't put the token in any file you commit.
- **Messages only arrive while the page is open.** Telegram holds undelivered messages for about 24 hours, so reopening the page picks up what you missed. History is cached in this browser only, so it isn't shared between devices.
- **One reader at a time.** Telegram allows only one `getUpdates` poller per bot. If the page shows a conflict warning, close other tabs or the local server.
- Only text is sent; incoming media shows as a placeholder like `[photo message]`.
- The page removes any webhook set on the bot when it connects.

## If your network blocks Telegram ("Failed to fetch")

Some networks block `api.telegram.org`. Deploy the relay in `proxy/worker.js` to a free Cloudflare Worker and give its URL to the page:

1. Sign in at https://dash.cloudflare.com, go to Workers & Pages → Create → Create Worker, and name it (e.g. `tg`).
2. Edit the code, paste the contents of `proxy/worker.js`, and Deploy.
3. In the Worker's Settings → Variables, add (recommended):
   - `ALLOWED_ORIGIN` = `https://rohitchannazhi.github.io`
   - `ALLOWED_BOT_ID` = the number before the `:` in your bot token
4. On the page, paste your token and the Worker URL (e.g. `https://tg.yourname.workers.dev`) in the Proxy field, then Connect.

The token passes through your Worker on its way to Telegram, so only deploy it in an account you control. If `workers.dev` is also blocked on your network, attach a custom domain to the Worker or use the local server below on a machine that can reach Telegram.

## Local server (optional)

`local-server/` is a dependency-free Node 18+ version that keeps history on disk and can run on your own machine or server:

```sh
cd local-server
TELEGRAM_BOT_TOKEN=123456:ABC... npm start   # http://127.0.0.1:3000
```

Set `UI_PASSWORD` if you bind it to anything other than localhost.
