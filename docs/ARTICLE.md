---
title: "Claudex: Claude Code and Codex from any browser, running on your own Mac"
published: false
description: "An open-source web app that puts the Claude Code look in a browser and runs real claude and codex jobs in folders on your machine, so you can reach them from your phone."
tags: claude, codex, ai, webdev, opensource
cover_image: https://raw.githubusercontent.com/ruxeu/claudex/main/docs/screenshot.png
---

I use Claude Code and the Codex CLI all day. The annoying part is that they live on one machine. When I leave my desk, the jobs stay there and I can't reach them.

So I built Claudex. It is a small web app that gives you the Claude desktop Code-tab look in a browser. You open it on your phone, type or talk, and a real job runs on your Mac.

Repo: https://github.com/ruxeu/claudex

## What it is

Claudex is a Node server that listens on `127.0.0.1` and serves a single-page app. There is no model call inside it and no API proxy. Each message starts the actual CLI in the chat's folder:

- For Claude, it runs `claude -p --resume <session>` with `--output-format stream-json`.
- For Codex, it runs `codex exec resume <thread>`, or `codex exec` for a new chat.

Replies stream back to the page with their steps, like "Reading file" or "Running command", so you see what the agent is doing. Your skills, plugins and project instructions work the way they do in the terminal, because it is the same CLI in the same folder.

The server uses only Node's standard library. Even the phone push code is plain `crypto`. The login page loads Firebase's SDK from Google's CDN, and that is the only outside script.

## Features

**Add account in one card.** Name the account, pick Claude or Codex, and sign in. Codex gives you a link and a short code. Claude gives you a claude.com link, and you paste back the code it shows. It works from your phone too. On the Mac there is also a "Sign in with Terminal" option that opens the usual sign-in. Every account you add shows up in the picker straight away.

**Accounts and settings.** The account picker shows each login with usage bars and reset times. For Codex, the bars come from the rate limits Codex already writes into its session files. Next to the input are chips for model, effort and permission mode.

**Voice input.** The mic button uses the browser's Web Speech API, so words land in the box as you talk. There is an optional "send when I stop talking" setting. The browser's speech service needs an internet connection, and it works in Chrome, Edge and Safari.

**Pictures and videos show in the chat.** If a reply names an image, video or sound file, or creates one in the chat's folder, it appears under the reply. Only files the server registered for that chat are served.

**Queued follow-ups.** Send a message while a reply is running and it waits in a queue. It goes out when the current reply ends, or immediately if you tap "Send now".

**Compact now, with a context ring.** A small ring shows how full the conversation is. Tap it to compact. Claudex asks for a short summary and starts the next session fresh from it.

**Projects, folders and sub-sessions.** Every chat is bound to a working folder. Sidebar folders group chats. A sub-session hangs under its parent chat. You can drop a file on a project in the sidebar and it is copied into that folder, never over an existing file.

**Import a Claude desktop session.** `/import` lists your Claude desktop app's local sessions. Picking one brings in its history and continues it as a branch, so the original stays as it was.

**Live ASCII wallpapers.** Each chat can have its own animated background painted in characters: night sky, rain, aurora, code rain and a few more. They pause when the tab is hidden and hold one still frame under reduced motion.

**Phone push when an account resets.** Ask Claudex to watch an account that is used up. A background check runs every minute, and when its window resets, your phone gets a notification. On iPhone, add the page to your Home Screen first.

**Small things.** Right-click a chat to save it as Markdown. Press `?` for the keyboard shortcuts.

**Drive-space guard.** Jobs, uploads and dropped files are refused on a drive with under 5 GB free. The page warns you earlier, below 20 GB or 10 percent.

## Setup

Requirements: Node 20 or newer, and the Claude Code CLI, the Codex CLI, or both.

The quickest route is to let Claude do it. Clone the repo, open the folder in Claude Code, and say "set up Claudex for me". The repo's `CLAUDE.md` walks it through the steps with you, and it never touches the logins you already have.

### 1. Clone and configure

```bash
git clone https://github.com/ruxeu/claudex ~/claudex
cd ~/claudex
```

Run `cp config.example.json config.json`, then open `config.json`. It holds the paths to the `claude` and `codex` binaries, your accounts, your default working folder and your domain. There are no other integrations to set up.

Check the setup, then start it:

```bash
node tools/doctor.js   # checks Node, the CLIs, the config and the port; changes nothing
node server.js
```

Open `http://127.0.0.1:5750` on the Mac. On the Mac itself there is no sign-in, but the page still has to be Claudex's own page. More on that below.

### 2. Connect your accounts

Open **Accounts** and choose **+ Add account**.

- **Codex:** each account gets its own `CODEX_HOME`, which starts with a copy of your main `config.toml`, so your MCP servers come along.
- **Claude:** Claudex runs `claude setup-token` for you and keeps the long-lived token in its private `data/` folder. Jobs on that account still use your normal `~/.claude` setup, so your skills, plugins and MCP servers all work.

A chat can move between accounts. Claudex copies the session (or the Codex rollout) across and resumes there.

You can also list logins in `config.json` by hand: a `CLAUDE_CONFIG_DIR` for each extra Claude login, and a `CODEX_HOME` for each Codex one. The README shows how.

### 3. Keep it running

A launchd agent works well. Save this as `~/Library/LaunchAgents/claudex.plist`, then run `launchctl load ~/Library/LaunchAgents/claudex.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>claudex</string>
  <key>ProgramArguments</key><array>
    <string>/usr/local/bin/node</string><string>server.js</string>
  </array>
  <key>WorkingDirectory</key><string>/path/to/claudex</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict></plist>
```

launchd needs absolute paths, so replace `/path/to/claudex` and the `node` path with yours. pm2 or any other process manager does the same job. On a stop signal, running jobs stop with the server, so a restart never leaves a duplicate job behind. A reply that was cut off by a restart is marked as failed, with a note telling you to send it again.

### 4. Put it behind a Cloudflare Tunnel

The server only binds to localhost. To reach it from your phone, create a named tunnel and point a hostname at the local port:

```yaml
tunnel: <your-tunnel-id>
credentials-file: ~/.cloudflared/<your-tunnel-id>.json
ingress:
  - hostname: claudex.<your-domain>
    service: http://127.0.0.1:5750
  - service: http_status:404
```

Add the DNS record with `cloudflared tunnel route dns`, then run the tunnel with `cloudflared tunnel run`. Use a Cloudflare Tunnel specifically. Claudex treats a request as "from the web" when it carries the `cf-connecting-ip` header that Cloudflare adds, and it applies the sign-in rule to those.

### 5. Google sign-in with Firebase

1. Create a Firebase project and enable the Google sign-in provider.
2. Add `claudex.<your-domain>` to the authorized domains.
3. Copy the web app config (`apiKey`, `authDomain`, `projectId`) into your Claudex config.
4. Set the one domain, or the one email address, that may come in.

The login page opens a Google popup and sends Firebase's ID token to the server. The server does the real check itself. It does not trust the page.

## Security

Claudex is a remote shell into your machine. A message in the chat can read files, run commands and delete things. I would not run it without these rules, and neither should you.

**One allowed account.** The server verifies the Firebase token signature against Google's published keys. It checks the audience, issuer and expiry. It requires the Google provider and a verified email. Then it requires your domain or your email. Anyone else gets a refusal. Sign-in attempts are limited to 10 per 15 minutes per address.

**No access codes over the web.** There is no password, shared link or PIN that works through the tunnel. A code that can run commands on your Mac is too easy to leak, so there isn't one. The session itself is a signed cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, valid for 14 days.

**Header, Origin and Host checks.** Every API call must carry a custom `x-claudex` header and an `Origin` that matches Claudex itself. The `Host` header must also match: your public hostname from the web, or `127.0.0.1` / `localhost` on the Mac. This is what stops another website open in your browser from calling the local server. The custom header cannot be sent cross-site without a preflight, and the Origin check refuses the rest. The Host check blocks DNS rebinding, where a hostile domain is pointed at `127.0.0.1`.

**Path masking.** Everything the server sends to the browser is rewritten first. Mounted drive names become "Drive A", "Drive B", and your home folder becomes `~`. Incoming paths are mapped back, so jobs still get the real folders. You can also give a folder a nickname, which hides its real name in the same way.

**Permission modes.** Each chat has one of four modes: Plan (reads and plans, changes nothing), Accept edits, Auto, and Bypass permissions. For Codex, Plan maps to a read-only sandbox, the middle two to a workspace-write sandbox, and Bypass to full access. Bypass is the default in my setup because I want the app to match my desktop. For a first try, pick Plan or Accept edits, or change the default.

**Never expose it without sign-in.** Do not put Claudex on a public port, a plain port forward or a tunnel with no Google check. If sign-in is not working, take the tunnel down and fix it. Do not weaken the check to get in.

Other protections are smaller: `nosniff`, `X-Frame-Options: DENY`, `no-store` caching on API answers, and size limits on request bodies and uploads. They are worth having, but they are not a replacement for the rules above.

## Using several accounts

Claudex lets you add your own logins, such as a personal and a work subscription, and choose one by hand per chat. "Auto" only falls back between logins you added yourself, and only when one reports a usage limit.

It is not a way around usage limits. Please follow Anthropic's and OpenAI's terms for the plans you use.

## What's next

- Live usage bars for Claude accounts, like the Codex ones.
- Sharing one chat as a read-only link.
- More wallpapers. They are plain JavaScript on a canvas, so adding one is a small file.

Issues and pull requests are welcome. If you find a way past the sign-in or Host checks, please report it privately before you post it.

Repo: https://github.com/ruxeu/claudex
