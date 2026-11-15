#!/usr/bin/env node
// Claudex setup check: `node tools/doctor.js`. Reads config.json through config.js, checks what Claudex needs, changes nothing.
// Each line is ✓ (fine), ! (works, but worth a look) or ✗ (must fix), with the fix. Exit code 1 when something must be fixed.
const fs = require("fs"), path = require("path"), net = require("net"), cp = require("child_process"), os = require("os");
const CFG = require("../config.js");
let bad = 0;
const ok = (m) => console.log("✓ " + m), warn = (m, fix) => console.log("! " + m + (fix ? "\n    → " + fix : "")), fail = (m, fix) => { bad++; console.log("✗ " + m + (fix ? "\n    → " + fix : "")); };
const ver = (bin) => { try { return cp.execFileSync(bin, ["--version"], { encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n")[0]; } catch { return ""; } };

(async () => {
  const major = +process.versions.node.split(".")[0];
  major >= 20 ? ok(`Node ${process.versions.node}`) : fail(`Node ${process.versions.node} is too old`, "install Node 20 or newer");

  fs.existsSync(CFG.file) ? ok(`config: ${CFG.file}`) : warn("no config.json: running on defaults (local only, your default logins)", "cp config.example.json config.json, then edit it");

  if (CFG.claudeBin) ok(`Claude Code: ${ver(CFG.claudeBin) || CFG.claudeBin}`); else warn("the claude program wasn't found", "install Claude Code (https://docs.anthropic.com/en/docs/claude-code), or set claudeBin in config.json");
  if (CFG.codexBin) ok(`Codex: ${ver(CFG.codexBin) || CFG.codexBin}`); else warn("the codex program wasn't found", "install the Codex CLI (npm i -g @openai/codex), or set codexBin in config.json");
  if (!CFG.claudeBin && !CFG.codexBin) fail("neither Claude Code nor Codex is installed", "install at least one of them");

  const py = ver("/usr/bin/python3") || ver("python3");
  py ? ok(`${py} (for Add account and the helper scripts)`) : warn("python3 wasn't found", "Add account for Claude needs it; install Python 3");

  /* accounts: Claude logins are checked when a job runs; Codex ones need an auth.json */
  for (const a of CFG.accounts.claude) ok(`Claude account "${a.name}" (${a.configDir.replace(os.homedir(), "~")}${a.proxy ? ", through a proxy" : ""})`);
  for (const c of CFG.accounts.codex) fs.existsSync(path.join(c.home, "auth.json")) ? ok(`Codex account "${c.name}" is signed in`) : warn(`Codex account "${c.name}" isn't signed in, so it stays hidden`, `CODEX_HOME=${c.home} codex login   (or use Add account in Claudex)`);
  const extra = path.join(CFG.dataDir, "accounts.json");
  if (fs.existsSync(extra)) { try { const n = JSON.parse(fs.readFileSync(extra, "utf8")).length; ok(`${n} account${n === 1 ? "" : "s"} added from the app`); } catch { fail("data/accounts.json is damaged", "fix or delete it, then add the accounts again"); } }

  /* the port: free, or already Claudex */
  await new Promise((done) => {
    const s = net.createServer().once("error", () => {
      fetch(`http://127.0.0.1:${CFG.port}/`).then((r) => r.text()).then((t) => { t.includes("<title>Claudex") ? ok(`Claudex is already running on http://127.0.0.1:${CFG.port}`) : fail(`port ${CFG.port} is used by something else`, "set another port in config.json"); }).catch(() => fail(`port ${CFG.port} is used by something else`, "set another port in config.json")).finally(done);
    }).once("listening", () => { s.close(); ok(`port ${CFG.port} is free (start with: node server.js)`); done(); }).listen(CFG.port, "127.0.0.1");
  });

  /* web access is optional; when publicHost is set, everything it needs must be set too */
  if (!CFG.publicHost) ok("web access is off (publicHost is empty): this computer only");
  else {
    ok(`web host: ${CFG.publicHost}`);
    CFG.signIn.emails.length || CFG.signIn.domains.length ? ok(`sign-in list: ${CFG.signIn.emails.length} address(es), ${CFG.signIn.domains.length} domain(s)`) : fail("nobody is on the sign-in list", "add your address to signIn.emails");
    for (const d of CFG.signIn.domains) if (/^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|proton|protonmail)\./.test(d)) fail(`signIn.domains lets anyone with a ${d} address in`, "use signIn.emails with your exact address instead");
    CFG.firebase.apiKey && CFG.firebase.authDomain && CFG.firebase.projectId ? ok("Firebase web config is set") : fail("Firebase web config is missing", "fill firebase.apiKey, authDomain and projectId (README → Google sign-in)");
    const cf = ver("cloudflared"); cf ? ok(cf) : warn("cloudflared wasn't found", "install it for the Cloudflare Tunnel (README → Cloudflare Tunnel)");
  }
  if (!CFG.localNoSignIn) ok("local sign-in is required too (localNoSignIn: false)");

  console.log(bad ? `\n${bad} thing${bad === 1 ? "" : "s"} to fix.` : "\nAll set.");
  process.exit(bad ? 1 : 0);
})();
