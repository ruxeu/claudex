// Claudex settings: config.json next to this file (copy config.example.json), with sane defaults for anything left out.
// Everything machine- or person-specific lives there, never in the code.
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const D = __dirname, HOME = os.homedir();
const FILE = process.env.CLAUDEX_CONFIG || path.join(D, "config.json");
const expand = (p) => (typeof p === "string" && p ? path.resolve(p.replace(/^~(?=\/|$)/, HOME)) : "");
const list = (v) => (Array.isArray(v) ? v : []);
const str = (v, d = "") => (typeof v === "string" ? v.trim() : d);

let raw = {};
if (fs.existsSync(FILE)) {
  try { raw = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) { console.error(`claudex: ${FILE} is not valid JSON (${e.message}). Fix it or remove it.`); process.exit(1); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) { console.error(`claudex: ${FILE} must hold a JSON object.`); process.exit(1); }
} else console.warn(`claudex: no ${path.basename(FILE)} found, running with defaults (no web sign-in, the default Claude login, Codex in ~/.codex if logged in).`);

/* the claude / codex programs, as absolute paths: a bare name is looked up on PATH once here, so jobs never run a binary from their working folder */
function resolveBin(name) {
  const n = str(name); if (!n) return "";
  if (n.includes("/")) { const p = expand(n); return fs.existsSync(p) ? p : ""; }
  const dirs = [...String(process.env.PATH || "").split(path.delimiter), "/opt/homebrew/bin", "/usr/local/bin", path.join(HOME, ".local/bin")].filter((d) => d && path.isAbsolute(d));
  for (const d of dirs) { const p = path.join(d, n); try { fs.accessSync(p, fs.constants.X_OK); return p; } catch {} }
  return "";
}

const claudeAccounts = list(raw.accounts?.claude).filter((a) => a && typeof a === "object").map((a, i) => ({
  id: "cl" + (i + 1), name: str(a.name) || `Claude ${i + 1}`, configDir: expand(a.configDir) || path.join(HOME, ".claude"), auto: a.auto !== false,
  proxy: a.proxy && str(a.proxy.baseUrl) ? { baseUrl: str(a.proxy.baseUrl), tokenFile: expand(a.proxy.tokenFile), tokenUrl: str(a.proxy.tokenUrl) } : null,
}));
const codexAccounts = list(raw.accounts?.codex).filter((a) => a && typeof a === "object" && str(a.home)).map((a, i) => ({ n: i + 1, id: "cx" + (i + 1), name: str(a.name) || `Codex ${i + 1}`, home: expand(a.home), auto: a.auto !== false }));
/* no accounts in the file: the default Claude login and ~/.codex */
if (!raw.accounts) { claudeAccounts.push({ id: "cl1", name: "Claude", configDir: path.join(HOME, ".claude"), auto: true, proxy: null }); codexAccounts.push({ n: 1, id: "cx1", name: "Codex 1", home: path.join(HOME, ".codex"), auto: true }); }

const signIn = { emails: list(raw.signIn?.emails).map((x) => str(x).toLowerCase()).filter((x) => x.includes("@")), domains: list(raw.signIn?.domains).map((x) => str(x).toLowerCase().replace(/^@/, "")).filter(Boolean) };
const fb = raw.firebase || {}, real = (v) => (/^your[-_]/i.test(str(v)) ? "" : str(v));  // the example's placeholders count as unset
const publicHost = str(raw.publicHost).toLowerCase();

const config = {
  file: FILE,
  port: +process.env.CLAUDEX_PORT || +raw.port || 5750,
  dataDir: expand(raw.dataDir) || path.join(D, "data"),
  claudeBin: resolveBin(raw.claudeBin || "claude"),
  codexBin: resolveBin(raw.codexBin || "codex"),
  defaultFolder: expand(raw.defaultFolder) || HOME,
  allowedRoots: list(raw.allowedRoots).map(expand).filter(Boolean).map((r) => { try { return fs.realpathSync(r); } catch { return r; } }),
  publicHost,
  signIn,
  localNoSignIn: raw.localNoSignIn !== false,
  firebase: { apiKey: real(fb.apiKey), authDomain: real(fb.authDomain), projectId: real(fb.projectId) },
  pushSubject: str(raw.pushSubject) || (publicHost ? `https://${publicHost}` : "mailto:noreply@example.com"),
  accounts: { claude: claudeAccounts, codex: codexAccounts },
  claudeModels: list(raw.claudeModels).filter((m) => m && str(m.id)).map((m) => ({ id: str(m.id), label: str(m.label) || str(m.id) })),
  defaults: raw.defaults && typeof raw.defaults === "object" ? raw.defaults : {},
  extraPrompt: str(raw.extraPrompt),
};
if (!config.claudeBin && claudeAccounts.length) console.warn("claudex: the claude program wasn't found; set claudeBin in config.json.");
if (!config.codexBin && codexAccounts.length) console.warn("claudex: the codex program wasn't found; set codexBin in config.json.");
if (publicHost && !signIn.emails.length && !signIn.domains.length) console.warn("claudex: publicHost is set but signIn lists no emails or domains, so nobody can sign in from the web.");

/* is this email allowed in? an exact address, or any verified address on a listed domain */
config.allowed = (email) => { email = String(email || "").toLowerCase(); return !!email && (signIn.emails.includes(email) || signIn.domains.includes(email.split("@")[1] || "")); };
/* a working folder must sit inside allowedRoots, when that list is set */
config.inRoots = (p) => !config.allowedRoots.length || config.allowedRoots.some((r) => p === r || p.startsWith(r.endsWith(path.sep) ? r : r + path.sep));

/* the mounted drives besides the system disk, from the OS mount table (cached for 30 s) */
let mountCache = { at: 0, v: [] };
config.mounts = () => {
  if (Date.now() - mountCache.at < 30e3) return mountCache.v;
  const v = [];
  try {
    for (const line of cp.execFileSync("df", ["-Pkl"], { encoding: "utf8", timeout: 5000 }).split("\n").slice(1)) {
      const m = /^(\S.*?)\s+\d+\s+\d+\s+\d+\s+\d+%\s+(\/.*)$/.exec(line); if (!m || !m[1].startsWith("/dev/")) continue;
      const mp = m[2]; if (mp === "/" || mp.includes("/.") || /^\/(System|Library|private|dev|proc|sys|run|snap|boot|var|usr|nix)(\/|$)/.test(mp) || mp === HOME || HOME.startsWith(mp + "/")) continue;
      v.push(mp);
    }
  } catch {}
  mountCache = { at: Date.now(), v: v.sort() };
  return mountCache.v;
};
config.expand = expand;
module.exports = config;
