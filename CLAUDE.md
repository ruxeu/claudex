# Setting up Claudex (for Claude Code, or any coding agent, helping someone install it)

The person wants Claudex running on their computer. Walk them through it, doing the steps yourself where you can.
Talk plainly. Explain what each step is for before you do it, one step at a time.

## Ground rules
- **Never touch their existing logins.** Don't run `claude /login`, `codex login`, or `codex logout` on folders they already use.
  New accounts go in through **Add account** inside Claudex, where they sign in themselves.
- **Never handle their passwords, tokens or codes.** They type sign-in codes into the browser themselves.
- **Web access is optional and is a remote shell.** Set up `publicHost`, Firebase and the Cloudflare Tunnel only if they ask for phone or web access.
  Explain the risk first (README → Security). Then use `signIn.emails` with their exact address. Never use a public mail domain in `signIn.domains`.
- Don't commit `config.json` or `data/`. Both are git-ignored, so keep it that way.

## Steps
1. **Check the computer.** Run `node tools/doctor.js`.
   - It reads `config.json` and checks Node 20+, the `claude` and `codex` programs, Python 3, the accounts and the port.
   - It changes nothing.
   - Fix each ✗ it reports. A missing CLI is fine as long as one of the two is installed.
2. **Make the config.** `cp config.example.json config.json`, then edit it together with them:
   - `defaultFolder`: where their projects live, e.g. `~/Projects`. `allowedRoots` is optional.
   - `accounts`: keep only what exists.
     - Their main Claude login is `{ "name": "Claude", "configDir": "~/.claude" }`.
     - Their main Codex login is `{ "name": "Codex", "home": "~/.codex" }`.
     - Delete the example entries for logins they don't have.
     - More accounts are easiest to add later, with **Add account** in the app.
   - For local use only, leave `publicHost` empty and remove the `firebase` and `signIn` placeholders, or leave them as they are (placeholders count as unset).
   - `defaults.mode`: `acceptEdits` is the safe start. Tell them the other modes exist (plan, auto, bypass).
3. **Run it.** Run `node server.js`, then open `http://127.0.0.1:5750` (or the port they set). Run `node tools/doctor.js` again: it should say "All set."
4. **Connect accounts.** In Claudex, open **Accounts** in the sidebar and choose **+ Add account**. They name it, then pick Claude or Codex:
   - **Codex**: Claudex shows a link and a short code. They open the link, sign in and enter the code.
   - **Claude**: Claudex shows a claude.com link. They approve it, copy the code it shows and paste it back.
   - **On a Mac**, the same card has **Sign in with Terminal**, which opens Terminal with the usual sign-in.
   - Each provider's terms apply. These are their own accounts.
5. **Start at login (optional, macOS).** Use the launchd plist in the README, with `which node` for the node path.
6. **Phone or web access (optional).** Follow README → Google sign-in, then Cloudflare Tunnel. Run `node tools/doctor.js` afterwards: it checks the sign-in list and the Firebase config.

## Where things are
- `server.js` is the HTTP server. It handles sign-in and the header, Origin and Host checks.
- `engine.js` holds chats, jobs, accounts and Add account.
- `config.js` loads config.json and fills in defaults.
- `public/` is the page.
- `tools/` holds the sign-in helpers, `doctor.js` and the optional helper scripts.
- `data/` holds the person's chats, uploads, the cookie secret and added accounts. It is private, so never print what's in it.

## If something fails
- **"not signed in" on a Claude account:** that login has expired. Remove it in Accounts and add it again, or sign in again in its own config folder.
- **A Codex account doesn't show:** its home has no `auth.json`. Add it again with Add account.
- **Port in use:** set `port` in config.json.
- **The page loads but replies fail:** read the error line in the chat, then `data/logs/` for that chat's last job.
