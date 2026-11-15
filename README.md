# Claudex

Claudex is a web version of the Claude desktop app's Code tab. It runs on your own computer and you use it from a browser, on the same machine or on your phone.

Each chat runs real coding-agent jobs in a working folder on that computer:

- **Claude Code** jobs run as `claude -p`, and later turns use `--resume`.
- **Codex** jobs run as `codex exec --json`, and later turns use `codex exec resume`.

Claudex itself is a small Node server with no dependencies, plus one plain HTML/JS page.

_Screenshots: coming soon._

## Features

- **Chats like the desktop app.** Chats, pins, folders in the sidebar, sub-sessions under a parent chat and search. You can also import a session from the Claude desktop app; it carries on here as a branch.
- **Chips under the composer:** working folder, account, model and effort, and permission mode (plan, accept edits, auto, bypass).
- **Accounts.** You pick one of your own Claude logins or Codex logins for each chat, or choose Auto. A chat can move between accounts and between engines; Claudex carries the session over or sends a recap.
- **Voice input** through the browser's own speech recognition, with an optional hands-free mode.
- **Media in the chat.** Any picture, video or sound file that a reply names by its full path appears under that reply. Attachments and drag-and-drop into project folders are supported.
- **Queued follow-ups.** You can send while a reply is still running; your message goes out when the reply finishes. "Send now" stops the current reply first.
- **Compaction.** One tap summarises a long chat, and the next message starts a fresh session from that summary.
- **Animated ASCII wallpapers**, set per chat.
- **Web Push notifications.** For example, "this account is available again". This works on Android Chrome, and on an iPhone once the app is added to the Home Screen.
- **Drive guard.** Jobs, uploads and dropped files are refused on a drive with less than 5 GB free.
- **Masking layer.** The home folder, mounted drive names and folders you nickname are replaced before anything reaches the browser.
- **Google sign-in through Firebase** for access from the web, plus strict header, Origin and Host checks.

## Requirements

- macOS is the main target, since it has the desktop-app import and launchd. Linux mostly works.
- Node.js 20 or newer.
- The [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI, the [Codex](https://github.com/openai/codex) CLI, or both, already signed in.
- Python 3, only for the optional helper scripts in `tools/`.
- For access from the web: a Cloudflare account with a domain, and a Firebase project (both have free tiers).

## Setup

```sh
git clone <this repo> claudex && cd claudex
cp config.example.json config.json   # then edit it
node server.js                       # http://127.0.0.1:5750
```

Open `http://127.0.0.1:5750` on the same computer. No sign-in is needed there.

### config.json

Leave out any key and Claudex uses a sensible default. With no `config.json` at all, Claudex runs with the default Claude login, Codex in `~/.codex` and no web access.

| Key | What it does |
| --- | --- |
| `port` | Local port. The server only listens on `127.0.0.1`. `CLAUDEX_PORT` overrides it. |
| `claudeBin`, `codexBin` | The CLI programs. A bare name is looked up on `PATH` once at startup and resolved to an absolute path. |
| `defaultFolder` | The working folder for a new chat when there is no recent folder. |
| `allowedRoots` | If set, chats and drag-and-drop can only use folders inside these roots, and the agents are told to stay inside them. This does not sandbox the agent: in bypass mode it can still reach anything your user account can. |
| `publicHost` | The hostname your tunnel serves, e.g. `claudex.example.com`. If it is empty, all web traffic is refused. |
| `signIn.emails`, `signIn.domains` | Who may sign in from the web: exact addresses, whole domains, or both. If both lists are empty, nobody can get in. |
| `localNoSignIn` | `true` (the default) lets the local browser in without signing in. Set it to `false` to require sign-in everywhere. |
| `firebase` | The Firebase **web** config: `apiKey`, `authDomain`, `projectId`. |
| `pushSubject` | The VAPID contact for Web Push (`mailto:` or `https:`). |
| `accounts.claude[]` | `name`, `configDir` (its `CLAUDE_CONFIG_DIR`; default `~/.claude`), `auto` (whether Auto may use it), and an optional `proxy`. |
| `accounts.codex[]` | `name`, `home` (its `CODEX_HOME`), and `auto` (whether Auto may use it). The homes that Auto may use are also the ones Claude is told it can send picture jobs to. |
| `claudeModels`, `defaults` | The model list, and the default account, mode, model and effort for new chats. |
| `extraPrompt` | Extra standing instructions added to every job. |

### Your accounts

Claudex can switch between several of **your own** logins, chosen per chat. One example is a personal Claude login and a work Claude login. Each provider's terms decide how you may use its accounts; follow the terms of each one.

**A second Claude login.** Give it its own config folder and sign in once:

```sh
CLAUDE_CONFIG_DIR=~/.claude-work claude   # then run /login inside it
```

Then add `{ "name": "Work", "configDir": "~/.claude-work" }` to `accounts.claude`. Each config folder keeps its own sessions, skills, plugins and MCP servers. When a chat moves to another account, Claudex copies the session file across.

**Several Codex homes.** Each Codex login lives in its own `CODEX_HOME`:

```sh
codex login                        # ~/.codex
CODEX_HOME=~/.codex2 codex login
CODEX_HOME=~/.codex3 codex login
```

List each home in `accounts.codex`. A Codex account only shows up once its `auth.json` exists. Each home uses its own `config.toml` (including MCP servers) and its own `AGENTS.md`.

**Optional proxy per Claude account.** If you run a gateway in front of the API, such as a corporate or self-hosted LLM gateway that you are allowed to use, add this to the account:

```json
"proxy": { "baseUrl": "http://127.0.0.1:8080", "tokenFile": "~/.config/my-gateway/token" }
```

You can use `"tokenUrl": "http://127.0.0.1:8080/token"` instead. That URL must answer `{"token": "..."}`, and Claudex fetches it again every 30 seconds. Jobs for that account then run with `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` set.

**Auto.** Auto uses the first Claude account marked `auto` that is signed in, then a Codex account marked `auto`. You can always pick an account by hand from the account chip.

### Google sign-in (Firebase)

Firebase only proves who someone is. Claudex itself decides who gets in.

1. Create a Firebase project. In **Authentication → Sign-in method**, enable **Google**.
2. In **Authentication → Settings → Authorized domains**, add your `publicHost`.
3. In **Project settings → Your apps**, add a Web app and copy `apiKey`, `authDomain` and `projectId` into `config.firebase`. The web API key identifies the project and is not a secret. Even so, keep it in `config.json`, which is git-ignored.
4. Put your address in `signIn.emails`, or your Google Workspace domain in `signIn.domains`.

The server checks each Google ID token on the server side:

- the RS256 signature against Google's published certificates;
- the audience and issuer, which must match `projectId`;
- the expiry;
- that the provider is `google.com`;
- that the email is verified and on your list.

After that it sets an HMAC-signed, HttpOnly, Secure cookie that lasts 14 days. If you take an address off the list and restart Claudex, that address is locked out on its next request, even with a valid cookie.

### Cloudflare Tunnel

The server only listens on `127.0.0.1`, so the web reaches it through a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):

```sh
cloudflared tunnel login
cloudflared tunnel create claudex
cloudflared tunnel route dns claudex claudex.example.com
```

Then set up `~/.cloudflared/config.yml`:

```yaml
tunnel: claudex
credentials-file: ~/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: claudex.example.com
    service: http://127.0.0.1:5750
  - service: http_status:404
```

Keep the original `Host` header (which is cloudflared's default), so it matches `publicHost`. Requests through the tunnel carry `cf-connecting-ip`, and that header is how Claudex tells web traffic from local traffic. You can also put Cloudflare Access in front as a second door.

### Run it at login (launchd)

`~/Library/LaunchAgents/com.example.claudex.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.example.claudex</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/path/to/claudex/server.js</string>
  </array>
  <key>WorkingDirectory</key><string>/path/to/claudex</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/claudex.log</string>
  <key>StandardErrorPath</key><string>/tmp/claudex.log</string>
</dict>
</plist>
```

Use `which node` for the node path. Then load it:

```sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.example.claudex.plist
```

When the server stops, any jobs it is running stop too, so a restart never leaves a twin job behind.

### Helper scripts (optional)

- `tools/ask-session.sh "<session name>" "<question>"` asks one of your Claude desktop sessions a question through a read-only fork (`--fork-session`, plan mode), and the live session is left untouched. Jobs know about this script.
- `tools/claudex-send.sh "<chat name>" "<message>" --from NAME [--wait]` posts into a Claudex chat from another script or session. It only works on the same computer, and only while `localNoSignIn` is `true`.
- `node tools/make-icons.js` regenerates the logo and the PNG icons.

## Security

**Claudex is a remote shell.** Anyone who gets past its door can run any command on your computer as your user, read your files and use your signed-in CLIs. Treat it that way.

- **Restrict sign-in hard.** Put exact addresses in `signIn.emails` where you can. Use `signIn.domains` only for a domain where you control every account (your own Google Workspace), never a public mail domain.
- **Expose it only through Cloudflare Tunnel.** Claudex decides "web or local" from the `cf-connecting-ip` header. Another reverse proxy on the same machine (nginx, Caddy, `ssh -R`, ngrok) that doesn't add that header would make web traffic look local, and local traffic skips sign-in. If you must use something else, set `localNoSignIn: false` so every request needs a signed-in Google account. Never bind the server to `0.0.0.0` and never forward its port.
- **Keep the header, Origin and Host checks.** Every API call must carry the `x-claudex: 1` header, a matching `Origin` and a matching `Host`. The `Host` is `publicHost` through the tunnel, or `127.0.0.1`/`localhost` with the right port locally. These checks stop other websites open in your browser (CSRF) and DNS-rebinding pages from driving it. Don't loosen them.
- **On a shared computer**, set `localNoSignIn: false`. Any local user can reach `127.0.0.1`.
- **Permission modes matter.** Bypass mode means the agent runs with no questions asked. New chats start in `acceptEdits` unless you change `defaults.mode`; use `allowedRoots` to keep working folders where you expect them.
- **Accept edits has limits.** In accept-edits mode a headless Claude job can't run Bash, so handing pictures to Codex and `ask-session.sh` only work in auto or bypass mode, or when that account's Claude settings allow Bash. Codex's `workspace-write` sandbox also blocks network access.
- **`data/` is private.** It holds the cookie-signing secret, the Web Push private key, chats and uploads. Back it up, never commit it, and delete `data/session.secret` to sign everyone out.
- **The masking layer is a privacy convenience, not a security boundary.** It hides home, drive and folder names on screen. Agents still see the real paths.
- **Media are served only from paths a reply named or created.** Files are not served by arbitrary path. Sign-in attempts are limited to 10 per IP address every 15 minutes.
- **Follow your providers' terms.** Running Claude Code or Codex through Claudex is still you using those products with your accounts.

## License

MIT, see [LICENSE](LICENSE). The Geist and Geist Mono fonts are under the SIL Open Font License 1.1 ([public/fonts/OFL.txt](public/fonts/OFL.txt)).
