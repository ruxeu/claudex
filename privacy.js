// Claudex privacy: drive names, nicknamed folders and the user's home folder never reach the browser.
// Going out, every API answer has, in this order: each nicknamed folder ("/path/to/client-project" -> "Client A", plus its extra words
// listed in data/nicknames.json), each mounted drive ("/mnt/<drive>" -> "Drive A", stable in data/aliases.json) and the home folder ("~") replaced,
// also in their dashed forms (as in ~/.claude/projects folder names).
// Coming in, "Client A/…", "Drive A/…" and "~/…" are turned back into real paths, so jobs still get the real folders.
const fs = require("fs"), path = require("path"), os = require("os"), CFG = require("./config.js");
const HOME = os.homedir(), DATA = CFG.dataDir, FILE = path.join(DATA, "aliases.json"), NICK = path.join(DATA, "nicknames.json");
const dash = (p) => p.replace(/[^A-Za-z0-9]/g, "-");
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rj = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
/* nicknames start empty: right-click → Rename on a folder in the sidebar adds one ({"/real/path": {"name": "Client A", "words": ["Brand"]}}) */
if (!fs.existsSync(NICK)) { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(NICK, "{}"); }

let cache = { at: 0, pairs: [], words: [] };
function drives() {
  const map = rj(FILE, {}); let changed = false;
  for (const real of CFG.mounts()) { if (map[real]) continue; const n = Object.keys(map).length; map[real] = "Drive " + (n < 26 ? String.fromCharCode(65 + n) : n + 1); changed = true; }
  if (changed) try { fs.writeFileSync(FILE, JSON.stringify(map, null, 1)); } catch {}
  return map;
}
function pairs() {
  if (Date.now() - cache.at < 30e3) return cache;
  const nick = rj(NICK, {}), list = [], words = [];
  for (const [real, v] of Object.entries(nick)) if (v?.name) { list.push({ real, shown: v.name, nick: true }); for (const w of v.words || []) if (w) words.push({ w, shown: v.name }); }
  for (const [real, shown] of Object.entries(drives())) list.push({ real, shown });
  list.push({ real: HOME, shown: "~" });
  for (const p of list) { p.realDash = dash(p.real); p.shownDash = p.shown === "~" ? "-home" : dash(p.shown); }
  list.sort((a, b) => b.real.length - a.real.length); words.sort((a, b) => b.w.length - a.w.length);
  cache = { at: Date.now(), pairs: list, words };
  return cache;
}
/* real -> shown, for anything sent to the browser */
function mask(s) {
  if (typeof s !== "string" || !s) return s;
  const { pairs: list, words } = pairs();
  for (const p of list) { s = s.split(p.real).join(p.shown); s = s.split(p.realDash).join(p.shownDash); }
  for (const x of words) s = s.replace(new RegExp("(^|[^A-Za-z0-9])" + escRe(x.w) + "(?![A-Za-z0-9])", "g"), (_, a) => a + x.shown);
  return s;
}
/* shown -> real, for paths and messages coming in (only where a nickname starts a path) */
function unmask(s) {
  if (typeof s !== "string" || !s) return s;
  for (const p of pairs().pairs) {
    if (p.shown === "~") { s = s.replace(/(^|[\s`'"(\[=])~(?=\/|$|[\s`'")\]])/g, (_, a) => a + HOME); continue; }
    s = s.replace(new RegExp("(^|[\\s`'\"(\\[=])" + escRe(p.shown) + "(?=/|$|[\\s`'\")\\],.])", "g"), (_, a) => a + p.real);
  }
  return s;
}
/* right-click → Rename on a folder: set (or, with an empty name, remove) its nickname */
function setNickname(real, name) {
  name = String(name || "").replace(/[\/\\`"<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
  const nick = rj(NICK, {}), base = path.basename(real);
  if (!name) { delete nick[real]; }
  else {
    const taken = [...Object.values(drives()), "~", ...Object.entries(nick).filter(([r]) => r !== real).map(([, v]) => v.name)].some((x) => x.toLowerCase() === name.toLowerCase());
    if (taken) return { error: "That name is already used for another folder" };
    const words = base.length >= 4 && !/^(data|work|tools|src|app|test|backup|edit|renders?|clips?)$/i.test(base) ? [base] : [];
    nick[real] = { name, words: nick[real]?.words?.length ? nick[real].words : words };
  }
  fs.writeFileSync(NICK, JSON.stringify(nick, null, 1)); cache.at = 0;
  return { ok: true };
}
module.exports = { mask, unmask, setNickname };
