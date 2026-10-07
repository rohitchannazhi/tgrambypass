# tgrambypass

A small web interface for chatting through a Telegram bot: incoming messages appear live, and you can reply from the browser. No dependencies, Node 18+.

## Setup

1. Message [@BotFather](https://t.me/BotFather), run `/newbot`, and copy the token.
2. Start the server:

   ```sh
   TELEGRAM_BOT_TOKEN=123456:ABC... npm start
   ```

3. Open http://127.0.0.1:3000.
4. Send any message to your bot in Telegram. The chat shows up in the sidebar; select it and reply.

To message someone first, they must have started a conversation with the bot (Telegram's rule). Enter their numeric chat ID in the sidebar.

## Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | required | Bot token from BotFather |
| `PORT` | `3000` | HTTP port |
| `HOST` | `127.0.0.1` | Bind address. Only change this together with `UI_PASSWORD` |
| `UI_PASSWORD` | none | If set, the UI requires HTTP Basic auth (any username, this password) |
| `DATA_FILE` | `data/messages.json` | Where message history is stored |

## Notes

- The bot uses long polling (`getUpdates`); any existing webhook for the bot is removed on start.
- Anyone who can reach the UI can send as your bot. Keep it on localhost, or set `UI_PASSWORD` and put it behind HTTPS.
- Never commit your token. `.env` and `data/` are git-ignored.
- Only text is sent; incoming media is shown as a placeholder like `[photo message]`.
