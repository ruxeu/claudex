// Claudex engine: chats that run real Claude Code and Codex jobs on this computer, in a working folder, one job per chat.
// Accounts come from config.json: each Claude account is a CLAUDE_CONFIG_DIR (optionally through a proxy), each Codex account a CODEX_HOME.
// Picking an account only picks the environment a job runs in: it never touches anyone's login.
// A chat keeps going across accounts: the Claude session file (or Codex rollout) is copied to the account that takes over;
// a switch between Claude and Codex starts the other engine with a recap of the conversation.
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os"), crypto = require("crypto");
const CFG = require("./config.js");
const DATA = CFG.dataDir, CHATS = path.join(DATA, "chats"), UP = path.join(DATA, "uploads"), LOGS = path.join(DATA, "logs"), ARCH = path.join(DATA, "archive");
for (const d of [CHATS, UP, LOGS, ARCH]) fs.mkdirSync(d, { recursive: true });
const HOME = os.homedir(), USER = os.userInfo().username;
const CLAUDE = CFG.claudeBin, CODEX = CFG.codexBin, DEFAULT_CLAUDE_DIR = path.join(HOME, ".claude");
const CLAUDES = CFG.accounts.claude, CODEX_HOMES = CFG.accounts.codex.filter((c) => fs.existsSync(path.join(c.home, "auth.json")));
const claudeOf = (id) => CLAUDES.find((a) => a.id === id);
const CLAUDE_FULL = 95;  // past this, Auto leaves a Claude account alone

/* optional per-account proxy: the token comes from a file, or from a URL that answers {"token": "..."} (refreshed every 30 s; a slow or failed fetch keeps the last good token) */
const TOKENS = {};
async function fetchToken(a) {
  if (!a.proxy?.tokenUrl) return TOKENS[a.id] || "";
  try { const r = await fetch(a.proxy.tokenUrl, { signal: AbortSignal.timeout(8000) }); if (r.ok) { const t = String((await r.json()).token || ""); TOKENS[a.id] = t; if (t) signedOut[a.id] = 0; } else if (r.status === 404) TOKENS[a.id] = ""; } catch {}
  return TOKENS[a.id] || "";
}
function proxyToken(a) {
  if (!a.proxy) return "";
  if (a.proxy.tokenUrl) return TOKENS[a.id] || "";
  try { return fs.readFileSync(a.proxy.tokenFile, "utf8").trim(); } catch { return ""; }
}
async function refreshTokens() { for (const a of CLAUDES) if (a.proxy?.tokenUrl) await fetchToken(a); }
refreshTokens(); setInterval(refreshTokens, 30e3).unref();
const DEFAULT_CWD = CFG.defaultFolder;
const rj = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const uid = () => Date.now().toString(36) + crypto.randomBytes(3).toString("hex");

/* ---------- accounts ---------- */
let cxCache = { at: 0, v: {} };
/* each Codex account's newest session file carries its rate limits; go straight to the newest day folder (year/month/day)
   instead of listing thousands of files, so this never stalls the server */
function newestSessions(home) {
  const out = [], root = path.join(home, "sessions"), desc = (d) => { try { return fs.readdirSync(d).filter((x) => /^\d+$/.test(x)).sort().reverse(); } catch { return []; } };
  for (const y of desc(root)) for (const m of desc(path.join(root, y))) for (const d of desc(path.join(root, y, m))) {
    const dir = path.join(root, y, m, d);
    try { for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".jsonl") && !x.startsWith("._")).map((x) => [x, fs.statSync(path.join(dir, x)).mtimeMs]).sort((a, b) => b[1] - a[1])) { out.push(path.join(dir, f[0])); if (out.length >= 3) return out; } } catch {}
  }
  return out;
}
function codexUsage() {
  if (Date.now() - cxCache.at < 60e3) return cxCache.v; const v = {};
  for (const c of CODEX_HOMES) { v[c.n] = null; try {
    for (const f of newestSessions(c.home)) {
      const fd = fs.openSync(f, "r"), size = fs.fstatSync(fd).size, len = Math.min(size, 300000), buf = Buffer.alloc(len); fs.readSync(fd, buf, 0, len, size - len); fs.closeSync(fd);
      const m = [...buf.toString().matchAll(/"primary":\{"used_percent":([\d.]+)([^}]*)\},"secondary":\{"used_percent":([\d.]+)([^}]*)\}/g)].pop();
      const at = (x) => { const r = /"resets_at":(\d+)/.exec(x || ""); return r ? +r[1] * 1000 : null; };
      if (m) { v[c.n] = { five: +m[1], week: +m[3], fiveAt: at(m[2]), weekAt: at(m[4]) }; break; } }
  } catch {} }
  cxCache = { at: Date.now(), v }; return v;
}
/* how many Claudex jobs run on a Codex home right now (Auto spreads the load) */
const busyCount = (h) => { let n = 0; for (const j of jobs.values()) if (j.home === h) n++; return n; };
/* a window whose reset time has passed is back to 0%: the stored number is from before the reset */
const eff = (u) => { if (!u) return null; const now = Date.now(), f = u.fiveAt && u.fiveAt < now ? 0 : u.five, w = u.weekAt && u.weekAt < now ? 0 : u.week; return { five: f ?? null, week: w ?? null, fiveAt: u.fiveAt && u.fiveAt > now ? u.fiveAt : null, weekAt: u.weekAt && u.weekAt > now ? u.weekAt : null }; };
const top = (u) => { const e = eff(u); return e && (e.five != null || e.week != null) ? Math.max(e.five ?? 0, e.week ?? 0) : null; };

/* a Claude login that failed to sign in, or hit its usage limit, is skipped by Auto for 30 minutes and shows why in the menu (cleared by the next good reply) */
const signedOut = {}, limited = {};
const isOut = (id) => Date.now() - (signedOut[id] || 0) < 30 * 60e3;
const isLimited = (id) => Date.now() - (limited[id] || 0) < 30 * 60e3;
const OUT_NOTE = (a) => (a.proxy ? "the proxy gave no token" : `not signed in (run claude and /login${a.configDir !== DEFAULT_CLAUDE_DIR ? " with CLAUDE_CONFIG_DIR set" : ""})`);
const claudeHeld = (a) => (a.proxy && !proxyToken(a) ? "proxy not reachable" : isOut(a.id) ? OUT_NOTE(a) : isLimited(a.id) ? "hit its usage limit recently" : "");
const autoClaudes = () => CLAUDES.filter((a) => a.auto);
const autoCodex = () => CODEX_HOMES.filter((c) => c.auto);

function accounts() {
  const xu = codexUsage(), ac = autoClaudes().map((a) => a.name);
  const autoNote = [ac.length ? ac.join(", ") : "", autoCodex().length ? "the least-used Codex" : ""].filter(Boolean).join(", then ") || "no account is set for Auto";
  return [
    { id: "auto", engine: "auto", name: "Auto", note: autoNote, use: null },
    ...CLAUDES.map((a) => ({ id: a.id, engine: "claude", name: a.name, note: "Claude" + (a.auto ? "" : " · only when you pick it"), use: null, held: claudeHeld(a) })),
    ...(autoCodex().length ? [{ id: "cx", engine: "codex", name: "Codex Auto", note: "least-used Codex", use: null }] : []),
    ...CODEX_HOMES.map((c) => ({ id: c.id, engine: "codex", name: c.name, win: eff(xu[c.n]), note: c.auto ? "" : "only when you pick it", use: top(xu[c.n]) })),
  ];
}

/* ---------- models ---------- */
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const CLAUDE_MODELS = (CFG.claudeModels.length ? CFG.claudeModels : [{ id: "claude-opus-5-5", label: "Opus 5.5" }, { id: "claude-sonnet-5-5", label: "Sonnet 5.5" }, { id: "claude-haiku-5-5", label: "Haiku 5.5" }]).map((m) => ({ ...m, efforts: EFFORTS }));
const modelsCache = () => rj(path.join((CODEX_HOMES[0] || CFG.accounts.codex[0] || { home: path.join(HOME, ".codex") }).home, "models_cache.json"), {});
function codexWindow(slug) { try { const j = modelsCache(); return ((j.models || j || []).find((x) => x.slug === slug) || {}).context_window || 272000; } catch { return 272000; } }
function codexModels() {
  try {
    const j = modelsCache(), list = (j.models || j || []).filter((m) => m.visibility === "list" && m.slug);
    const nice = (m) => String(m.display_name || m.slug).replace(/^gpt-/i, "GPT-");
    const out = list.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99)).map((m) => ({ id: m.slug, label: nice(m), efforts: ["low", "medium", "high", "xhigh", "ultra", "max"].filter((e) => (m.supported_reasoning_levels || []).some((x) => (x.effort || x) === e)) }));
    if (out.length) return out;
  } catch {}
  const id = CFG.defaults.codex?.model || "gpt-6-luna";
  return [{ id, label: id.replace(/^gpt-/i, "GPT-"), efforts: ["low", "medium", "high", "xhigh"] }];
}
const MODES = [
  { id: "plan", label: "Plan mode", note: "Reads and plans, changes nothing" },
  { id: "acceptEdits", label: "Accept edits", note: "Edits files in the folder" },
  { id: "auto", label: "Auto mode", note: "Decides the safe steps itself" },
  { id: "bypassPermissions", label: "Bypass permissions", note: "Full access, no questions" },
];
const DEF = { account: "auto", claude: { model: CLAUDE_MODELS[0].id, effort: "high" }, codex: { model: "gpt-6-luna", effort: "medium" }, mode: "acceptEdits" };
const PREFS = path.join(DATA, "prefs.json");
let prefs = cleanSettings({ ...CFG.defaults, ...rj(PREFS, {}) }, DEF);
function cleanSettings(b, base) {
  const s = JSON.parse(JSON.stringify(base));
  if (accounts().some((a) => a.id === b.account)) s.account = b.account;
  if (MODES.some((m) => m.id === b.mode)) s.mode = b.mode;
  for (const e of ["claude", "codex"]) {
    const list = e === "claude" ? CLAUDE_MODELS : codexModels(), want = b[e] || {}, cur = { ...s[e] };
    if (list.some((m) => m.id === want.model)) cur.model = want.model;
    const m = list.find((x) => x.id === cur.model) || list[0]; cur.model = m.id;
    if (m.efforts.includes(want.effort)) cur.effort = want.effort;
    if (!m.efforts.includes(cur.effort)) cur.effort = m.efforts.includes("medium") ? "medium" : m.efforts[0];
    s[e] = cur;
  }
  return s;
}

/* ---------- folders ---------- */
let folderCache = { at: 0, v: [] };
function recentFolders() {
  if (Date.now() - folderCache.at < 300e3) return folderCache.v;
  const seen = new Map();
  for (const root of [...new Set(CLAUDES.map((a) => path.join(a.configDir, "projects")))]) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch {}
    for (const d of dirs) { try {
      const p = path.join(root, d), files = fs.readdirSync(p).filter((f) => f.endsWith(".jsonl")).map((f) => [f, fs.statSync(path.join(p, f)).mtimeMs]).sort((a, b) => b[1] - a[1]);
      if (!files.length) continue;
      const fd = fs.openSync(path.join(p, files[0][0]), "r"), buf = Buffer.alloc(20000), n = fs.readSync(fd, buf, 0, 20000, 0); fs.closeSync(fd);
      const cwd = /"cwd":"((?:[^"\\]|\\.)*)"/.exec(buf.slice(0, n).toString())?.[1]; if (!cwd) continue;
      const real = JSON.parse(`"${cwd}"`); if (/\/\.claude\/worktrees\//.test(real) || /claude-tmp|scratchpad/.test(real) || !fs.existsSync(real) || !CFG.inRoots(real)) continue;
      if (!seen.has(real) || seen.get(real) < files[0][1]) seen.set(real, files[0][1]);
    } catch {} }
  }
  for (const c of [...chats.values()]) if (c.cwd && fs.existsSync(c.cwd) && (!seen.has(c.cwd) || seen.get(c.cwd) < c.updated)) seen.set(c.cwd, c.updated);
  folderCache = { at: Date.now(), v: [...seen].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([p]) => ({ path: p })) };  // the page names a folder from its (masked) path, so a drive root never shows its real name
  return folderCache.v;
}
/* a real, existing folder inside allowedRoots (when set), or null */
function checkFolder(p) { p = String(p || "").trim().replace(/^~(?=\/|$)/, HOME); if (!path.isAbsolute(p)) return null; p = path.resolve(p); try { const real = fs.realpathSync(p); return fs.statSync(real).isDirectory() && CFG.inRoots(real) ? p : null; } catch { return null; } }

/* ---------- chats ---------- */
const chats = new Map(), jobs = new Map();
for (const f of fs.readdirSync(CHATS)) if (/^c\w+\.json$/.test(f)) { const c = rj(path.join(CHATS, f), null); if (c?.id) { for (const m of c.messages || []) if (m.running) { m.running = false; m.failed = true; m.parts = [...(m.parts || []), { t: "error", text: "Claudex restarted before this reply finished. Send it again." }]; } chats.set(c.id, c); } }
let ver = 0;
const save = (c) => { c.messages = c.messages.slice(-400); const f = path.join(CHATS, c.id + ".json"); fs.writeFileSync(f + ".tmp", JSON.stringify(c)); fs.renameSync(f + ".tmp", f); ver++; };
const titleOf = (c) => c.title || (c.messages.find((m) => m.who === "you")?.text || "New chat").replace(/\s+/g, " ").slice(0, 70);
/* the sidebar's own folders (like the Claude app's sections): data/folders.json [{id, name}]; a chat sits in at most one */
const FOLDERS = path.join(DATA, "folders.json");
let folders = rj(FOLDERS, []);
const saveFolders = () => { fs.writeFileSync(FOLDERS, JSON.stringify(folders)); ver++; };
const folderApi = {
  list: () => folders,
  create: (name) => { name = String(name || "").replace(/\s+/g, " ").trim().slice(0, 40); if (!name) return { error: "Give the folder a name" }; const f = { id: "f" + uid(), name }; folders.push(f); saveFolders(); return f; },
  update: (id, b) => { const f = folders.find((x) => x.id === id); if (!f) return { error: "No such folder" }; if (typeof b.name === "string" && b.name.trim()) f.name = b.name.replace(/\s+/g, " ").trim().slice(0, 40); saveFolders(); return { ok: true }; },
  remove: (id) => { const i = folders.findIndex((x) => x.id === id); if (i < 0) return { error: "No such folder" }; folders.splice(i, 1); for (const c of chats.values()) if (c.folder === id) { c.folder = null; save(c); } saveFolders(); return { ok: true }; },
};
/* a sub-session hangs under its parent chat; no loops */
const isAncestor = (maybe, of) => { for (let c = chats.get(of), n = 0; c && n < 50; c = chats.get(c.parent), n++) if (c.parent === maybe) return true; return false; };
function create(b = {}) {
  const par = b.parent && chats.get(b.parent);
  const c = { id: "c" + uid(), title: "", pinned: false, created: Date.now(), updated: Date.now(), cwd: checkFolder(b.cwd) || par?.cwd || recentFolders()[0]?.path || DEFAULT_CWD, settings: cleanSettings(b.settings || par?.settings || {}, prefs), claude: null, codex: null, last: null, messages: [], parent: par ? par.id : null, folder: par ? par.folder || null : folders.some((f) => f.id === b.folder) ? b.folder : null };
  chats.set(c.id, c); save(c); return c;
}
function update(id, b) {
  const c = chats.get(id); if (!c) return { error: "No such chat" };
  if (typeof b.title === "string") c.title = b.title.trim().slice(0, 100);
  if ("pinned" in b) c.pinned = !!b.pinned;
  if ("theme" in b) c.theme = /^[a-z]{2,20}$/.test(String(b.theme || "")) ? b.theme : null;  // each chat keeps its own wallpaper
  if ("folder" in b) { if (b.folder && !folders.some((f) => f.id === b.folder)) return { error: "No such folder" }; c.folder = b.folder || null; }
  if ("parent" in b) { const p = b.parent || null; if (p && (p === id || !chats.has(p) || isAncestor(id, p))) return { error: "A chat can't go under itself" }; c.parent = p; if (p) c.folder = chats.get(p).folder || null; }
  if (b.cwd !== undefined) { const p = checkFolder(b.cwd); if (!p) return { error: "That folder doesn't exist on the Mac" }; if (jobs.has(id)) return { error: "Wait until the reply lands" }; if (p !== c.cwd) { c.cwd = p; c.claude = null; c.codex = null; } }
  if (b.settings) { c.settings = cleanSettings(b.settings, c.settings); prefs = cleanSettings(b.settings, prefs); fs.writeFileSync(PREFS, JSON.stringify(prefs)); }
  save(c); return { ok: true, chat: view(c) };
}
function remove(id) { const c = chats.get(id); if (!c) return { error: "No such chat" }; if (jobs.has(id)) return { error: "Stop the reply first" }; fs.renameSync(path.join(CHATS, id + ".json"), path.join(ARCH, id + ".json")); chats.delete(id); ver++; return { ok: true }; }
const lastFrom = (c) => { for (let i = c.messages.length - 1; i >= 0; i--) if (c.messages[i].from) return { from: c.messages[i].from, at: c.messages[i].at }; return null; };
const list = () => [...chats.values()].map((c) => ({ id: c.id, title: titleOf(c), pinned: !!c.pinned, updated: c.updated, cwd: c.cwd, busy: jobs.has(c.id), lastFrom: lastFrom(c), parent: c.parent && chats.has(c.parent) ? c.parent : null, folder: c.folder && folders.some((f) => f.id === c.folder) ? c.folder : null })).sort((a, b) => b.pinned - a.pinned || b.updated - a.updated);
function view(c, last = 120) { const j = jobs.get(c.id); return { queue: (c.queue || []).map((q) => ({ id: q.id, text: q.compact ? "Compact the conversation" : q.text, files: q.files.length, from: q.from || null, compact: !!q.compact })), theme: c.theme || null, total: c.messages.length, ctx: c.ctx || null, compacted: !!c.summary, id: c.id, title: titleOf(c), pinned: !!c.pinned, parent: c.parent || null, folder: c.folder || null, cwd: c.cwd, settings: c.settings, messages: c.messages.slice(-Math.max(1, Math.min(400, last || 120))), busy: !!j, live: j ? { label: j.label, step: j.step, text: j.live, started: j.started } : null }; }

/* ---------- what every job is told: it lives in Claudex, files it names show in the chat, it can make pictures, it has skills ---------- */
const TOOLS_DIR = path.join(__dirname, "tools"), ASK = path.join(TOOLS_DIR, "ask-session.sh");
const PIC_HOMES = autoCodex().map((c) => c.home);
const ROOTS_NOTE = CFG.allowedRoots.length ? `\nWORK INSIDE THESE FOLDERS: ${CFG.allowedRoots.join(", ")}. Don't read or change files outside them unless the user asks.` : "";
const EXTRA = CFG.extraPrompt ? "\n" + CFG.extraPrompt : "";
const KNOW_CLAUDE = `You are working inside Claudex, a web version of the Claude Code app running on the user's own computer. The user may be on a phone and talking by voice: keep replies short and plain.
FILES SHOW IN THE CHAT: whenever you make, edit or find a picture, video or sound file the user should see, write its full path in backticks in your reply, e.g. \`/full/path/name.png\`. Claudex shows it under your reply.
${PIC_HOMES.length && CODEX ? `YOU CAN HAND PICTURES TO CODEX: you have no image tool yourself, but Codex can make pictures. Run it with Bash from the folder the file should land in:
  CODEX_HOME=<home> ${CODEX} exec --ephemeral --skip-git-repo-check --sandbox workspace-write [--image=ref.png] - <<'END'
  Use your image generation tool to generate exactly one image, then copy the generated file into the current folder as NAME.png. Do not overwrite files. Reply with the saved path only.
  Prompt for the image: (the full picture brief)
  END
<home> is one of: ${PIC_HOMES.join(", ")}. Then give the saved paths in backticks.
` : ""}ASKING OTHER SESSIONS: when the user says "ask <session name> …" (one of their Claude app sessions), run ${ASK} "<session name>" "<the question, with the context it needs>" and pass the answer on, saying it came from that session. It is a private read-only branch: the live session doesn't see it and nothing changes there. ${ASK} --list shows the names.
YOUR KIT IS THE SAME AS IN THE CLAUDE APP: the skills, plugins, agents, slash commands and MCP servers of this account's Claude config are loaded. Use them as you would there.${ROOTS_NOTE}${EXTRA}`;
const KNOW_CODEX = `(Claudex note: you are working inside Claudex, a web app running on the user's own computer; they may be on a phone and talking by voice, so keep replies short and plain. You have an image generation tool: when asked for a picture, use it, then copy the result into the working folder with a clear name. Whenever you make or find a picture, video or sound file the user should see, write its full path in backticks in your reply; Claudex shows it under your reply. To ask one of the user's Claude app sessions (e.g. "ask <session name> ..."), run ${ASK} "<session name>" "<question>" and pass the answer on (read-only; --list shows the names).${ROOTS_NOTE.replace(/^\n/, " ")}${EXTRA ? " " + CFG.extraPrompt : ""})

`;
/* after a reply: the pictures, videos and sounds it made or named, shown under it in the chat (only these registered paths are ever served) */
const MEDIA_RE = /\.(png|jpe?g|webp|gif|mp4|mov|webm|m4v|mp3|wav|m4a|ogg)$/i;
const kindOf = (f) => (/\.(mp4|mov|webm|m4v)$/i.test(f) ? "video" : /\.(mp3|wav|m4a|ogg)$/i.test(f) ? "audio" : "image");
function collectMedia(c, ai) {
  const found = new Map(), sizes = new Set(), t0 = (ai.t0 || ai.at) - 2000;
  const add = (p, fresh) => {
    try {
      p = path.resolve(c.cwd, String(p).trim().replace(/^~(?=\/)/, HOME)); if (!MEDIA_RE.test(p) || found.has(p) || found.size >= 24) return;
      const st = fs.statSync(p); if (!st.isFile() || st.size > 800e6 || (fresh && st.mtimeMs < t0)) return;
      if (sizes.has(st.size)) return; sizes.add(st.size);  // Codex's own copy and the one it saved into the folder are the same picture
      found.set(p, { path: p, name: path.basename(p), kind: kindOf(p), size: st.size });
    } catch {}
  };
  const text = (ai.parts || []).filter((x) => x.t === "text").map((x) => x.text).join("\n"), EXT = "png|jpe?g|webp|gif|mp4|mov|webm|m4v|mp3|wav|m4a|ogg";
  for (const m of text.matchAll(new RegExp("`([^`\\n]+?\\.(?:" + EXT + "))`", "gi"))) add(m[1]);
  for (const m of text.matchAll(new RegExp("\\]\\(([^)\\s]+?\\.(?:" + EXT + "))\\)", "gi"))) { try { add(decodeURI(m[1])); } catch {} }
  for (const m of text.matchAll(new RegExp("(?:^|[\\s(\\[:\"'])((?:~|/)[^\\s`\"'()<>\\]]+?\\.(?:" + EXT + "))(?=$|[\\s)\\].,;:!?\"'])", "gim"))) add(m[1]);
  const named = found.size, t1 = Date.now(); let seen = 0;  // new media in the chat's folder, a short bounded look
  const walk = (dir, depth) => { if (depth > 3 || seen > 6000 || Date.now() - t1 > 1500) return; let es = []; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of es) { if (++seen > 6000) return; if (e.name.startsWith(".") || e.name === "node_modules") continue; const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, depth + 1); else if (MEDIA_RE.test(e.name)) add(p, true); } };
  if (!named) walk(c.cwd, 0);
  if (ai.gen) { try { for (const f of fs.readdirSync(ai.gen)) add(path.join(ai.gen, f), true); } catch {} }
  if (found.size) ai.media = [...found.values()];
}
function mediaFile(cid, mid, i) { const c = chats.get(cid), m = c?.messages.find((x) => x.id === mid), f = m?.media?.[+i]; return f && fs.existsSync(f.path) ? f : null; }

/* ---------- running a job ---------- */
const binDirs = [CLAUDE, CODEX].filter(Boolean).map((b) => path.dirname(b));
const envBase = () => ({ ...process.env, HOME, USER, LOGNAME: USER, PATH: [...new Set([...binDirs, "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"])].join(":") });
/* a Claude account = its config folder (CLAUDE_CONFIG_DIR, left unset for the default ~/.claude) plus, optionally, a proxy base URL and token */
function claudeEnv(a) {
  const e = envBase(); for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CONFIG_DIR"]) delete e[k];
  if (a.configDir !== DEFAULT_CLAUDE_DIR) e.CLAUDE_CONFIG_DIR = a.configDir;
  if (a.proxy) Object.assign(e, { ANTHROPIC_BASE_URL: a.proxy.baseUrl, ANTHROPIC_AUTH_TOKEN: proxyToken(a) });
  return e;
}
const slug = (cwd) => cwd.replace(/[^A-Za-z0-9]/g, "-");
/* the Claude session file lives in the account's own config folder: copy the newest one across before resuming on another account */
function carryClaude(sessionId, cwd, to) {
  if (!/^[\w-]+$/.test(sessionId)) return false;
  const rel = path.join("projects", slug(cwd), sessionId + ".jsonl"), dst = path.join(to.configDir, rel);
  let src = null, at = 0; for (const a of CLAUDES) { const f = path.join(a.configDir, rel); try { const m = fs.statSync(f).mtimeMs; if (m > at) { src = f; at = m; } } catch {} }
  try { if (src && src !== dst) { let d = null; try { d = fs.statSync(dst); } catch {} if (!d || d.mtimeMs < at) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); } } } catch {}
  return fs.existsSync(dst);
}
function findRollout(home, thread) {
  if (!/^[\w-]+$/.test(thread)) return ""; const root = path.join(home, "sessions"), ls = (d) => { try { return fs.readdirSync(d).filter((x) => /^\d+$/.test(x)); } catch { return []; } };
  for (const y of ls(root)) for (const m of ls(path.join(root, y))) for (const d of ls(path.join(root, y, m))) { const dir = path.join(root, y, m, d); try { const f = fs.readdirSync(dir).find((x) => x.endsWith(".jsonl") && x.includes(thread) && !x.startsWith("._")); if (f) return path.join(dir, f); } catch {} }
  return "";
}
function carryCodex(thread, fromHome, toHome) {
  if (fromHome === toHome) return true; const src = findRollout(fromHome, thread); if (!src) return !!findRollout(toHome, thread);
  const dst = path.join(toHome, path.relative(fromHome, src)); try { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); return true; } catch { return false; }
}
function pickCodex(skip = []) {
  const xu = codexUsage(), load = (c) => (top(xu[c.n]) ?? 50) + busyCount(c.home) * 10;
  return autoCodex().filter((c) => !skip.includes(c.n) && (top(xu[c.n]) ?? 0) < 98).sort((a, b) => load(a) - load(b))[0] || null;
}
/* the order to try accounts in for one job: the picked one, or Auto's chain (each Auto Claude account that isn't held, then the least-used Codex) */
function chain(account) {
  if (claudeOf(account)) return [{ engine: "claude", acct: account }];
  const cxn = /^cx(\d+)$/.exec(account); if (cxn) return [{ engine: "codex", acct: +cxn[1] }];
  const cx = autoCodex().length ? [{ engine: "codex", acct: "auto" }] : [];
  if (account === "cx") return cx;
  return [...autoClaudes().filter((a) => !claudeHeld(a)).map((a) => ({ engine: "claude", acct: a.id })), ...cx];
}
const nameOf = (x) => (x.engine === "claude" ? claudeOf(x.acct)?.name || "Claude" : x.acct === "auto" ? "Codex" : CODEX_HOMES.find((c) => c.n === x.acct)?.name || `Codex ${x.acct}`);
const modelLabel = (e, id) => (e === "claude" ? CLAUDE_MODELS : codexModels()).find((m) => m.id === id)?.label || id;
const short = (s, n = 90) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const base = (p) => path.basename(String(p || ""));
function stepOfTool(name, i = {}) {
  switch (name) {
    case "Read": return { kind: "read", text: `Read ${base(i.file_path)}` };
    case "Edit": case "MultiEdit": return { kind: "edit", text: `Edited ${base(i.file_path)}` };
    case "Write": return { kind: "edit", text: `Wrote ${base(i.file_path)}` };
    case "NotebookEdit": return { kind: "edit", text: `Edited ${base(i.notebook_path)}` };
    case "Bash": return { kind: /codex exec/.test(String(i.command)) && /image|picture|png/i.test(String(i.command)) ? "image" : "run", text: i.description ? short(i.description, 80) : `Ran ${short(i.command, 70)}`, detail: short(i.command, 400) };
    case "Grep": return { kind: "search", text: `Searched for ${short(i.pattern, 50)}` };
    case "Glob": return { kind: "search", text: `Looked for ${short(i.pattern, 50)}` };
    case "WebSearch": return { kind: "web", text: `Searched the web: ${short(i.query, 60)}` };
    case "WebFetch": return { kind: "web", text: `Opened ${(() => { try { return new URL(i.url).host; } catch { return "a page"; } })()}` };
    case "Task": case "Agent": return { kind: "agent", text: `Agent: ${short(i.description || i.prompt, 60)}` };
    case "TodoWrite": return { kind: "plan", text: "Updated the plan" };
    case "Skill": return { kind: "read", text: `Loaded skill ${short(i.skill || i.name, 40)}` };
    default: return { kind: "tool", text: short(String(name).replace(/^mcp__[^_]+__/, "").replace(/_/g, " "), 60) };
  }
}
function parentNote(c, idx) {
  const p = idx <= 1 && c.parent && chats.get(c.parent); if (!p || !p.messages.length) return "";
  const msgs = p.messages.slice(-16).map((m) => `${m.who === "you" ? "Me" : "You"}: ${short(m.who === "you" ? m.text : (m.parts || []).filter((x) => x.t === "text").map((x) => x.text).join("\n"), 1500)}`);
  return `(This is a sub-session of the chat "${titleOf(p)}". Here is that chat so far, for context.)\n${msgs.join("\n")}\n\n`;
}
const COMPACT = "Compact this conversation: write a summary I can continue from in a fresh session. Cover the goal, what we decided, the files and folders involved (full paths), what is done, what is not done yet, and the next step. Plain words, under 350 words. Do not run anything.";
function recap(c, upto) {
  if (c.summary) {  // a compacted chat: the summary, then only what came after it
    const after = c.messages.slice(c.summaryIdx + 1, upto).slice(-12).map((m) => `${m.who === "you" ? "Me" : "You"}: ${short(m.who === "you" ? m.text : (m.parts || []).filter((p) => p.t === "text").map((p) => p.text).join("\n"), 1500)}`);
    return `(Summary of our conversation so far, from a compaction:)\n${c.summary}\n${after.length ? "\n(Since then:)\n" + after.join("\n") + "\n" : ""}\n`;
  }
  const msgs = c.messages.slice(0, upto).slice(-16).map((m) => `${m.who === "you" ? "Me" : "You"}: ${short(m.who === "you" ? m.text : (m.parts || []).filter((p) => p.t === "text").map((p) => p.text).join("\n"), 1500)}`);
  return msgs.length ? `(We were talking on another engine; here is the conversation so far, for context.)\n${msgs.join("\n")}\n\n` : "";
}

function send(id, text, files = [], opts = {}) {
  const c = chats.get(id); if (!c) return { error: "No such chat" };
  text = String(text || "").trim().slice(0, 20000); if (!text && !files.length) return { error: "Say something first" };
  if (jobs.has(id)) {  // a follow-up (or a compaction) while the reply runs waits its turn and goes out by itself
    const att0 = (Array.isArray(files) ? files : []).slice(0, 10).filter((f) => upload(f));
    if (opts.compact && (c.queue || []).some((q) => q.compact)) return { ok: true, queued: true };
    (c.queue = c.queue || []).push({ id: uid(), text, files: att0, at: Date.now(), ...(opts.from ? { from: opts.from } : {}), ...(opts.compact ? { compact: true } : {}) }); save(c); return { ok: true, queued: true };
  }
  if (!fs.existsSync(c.cwd)) return { error: "This chat's folder isn't on the Mac any more. Pick another folder." };
  { const d = lowDrive(c.cwd); if (d) return { error: d }; }
  const att = (Array.isArray(files) ? files : []).slice(0, 10).map((f) => upload(f)).filter(Boolean);
  if (opts.compact && c.messages.length < 2) return { error: "Nothing to compact yet" };
  c.messages.push({ id: uid(), who: "you", text, files: att.map((a) => ({ id: a.id, name: a.name, image: a.image })), at: Date.now(), ...(opts.compact ? { compact: true } : {}), ...(opts.from ? { from: opts.from } : {}) });
  const ai = { id: uid(), who: "ai", parts: [], at: Date.now(), running: true, label: "", ...(opts.compact ? { compact: true } : {}) };
  c.messages.push(ai); c.updated = Date.now(); save(c);
  const tries = chain(c.settings.account);
  if (!tries.length) { finish(c, ai, "Every account is held or used up right now. Pick one by hand in the account menu.", true); return { ok: true }; }
  start(c, ai, opts.from ? `(This message is from the user's "${opts.from}" session, a teammate, not from the user themselves. Help with it, but anything that needs the user's OK still needs their OK.)\n\n${text}` : text, att, tries, 0);
  return { ok: true };
}

function start(c, ai, text, att, tries, k) {
  const t = tries[k], s = c.settings, e = t.engine, m = s[e], jid = uid(), log = path.join(LOGS, `${jid}.log`);
  const idx = c.messages.indexOf(ai);
  const j = { started: Date.now(), step: "Thinking", live: "", proc: null, stopped: false, label: "" }; if (!ai.t0) ai.t0 = j.started;
  jobs.set(c.id, j); ver++;
  const fileNote = att.length ? `\n\n(Attached files, open them: ${att.map((a) => a.path).join(", ")})` : "";
  const failNext = (why) => { jobs.delete(c.id); if (k + 1 < tries.length && !j.stopped) { ai.parts.push({ t: "note", text: `${why} Moving to ${nameOf(tries[k + 1])}.` }); save(c); return start(c, ai, text, att, tries, k + 1); } finish(c, ai, why, true); };
  const fall = (lg) => /usage limit|rate.?limit|429|out of (?:extra )?usage|limit reached|exceeded your/i.test(lg);

  if (e === "claude") {
    const acct = t.acct, a = claudeOf(acct);
    if (!a) return failNext("That Claude account is no longer in config.json.");
    if (!CLAUDE) return failNext("The claude program wasn't found (set claudeBin in config.json).");
    if (a.proxy && !proxyToken(a)) {
      if (!t.asked && a.proxy.tokenUrl) { t.asked = true; j.step = "Getting the account ready"; return fetchToken(a).then(() => { if (!j.stopped) { jobs.delete(c.id); start(c, ai, text, att, tries, k); } }); }
      return failNext(`${nameOf(t)}: ${OUT_NOTE(a)}.`);
    }
    j.label = ai.label = `${nameOf(t)} · ${modelLabel(e, m.model)} · ${m.effort}`;
    let resume = c.last === "claude" && c.claude?.session ? c.claude.session : null;
    if (resume && !carryClaude(resume, c.cwd, a)) resume = null;
    const prompt = parentNote(c, idx) + (!resume && idx > 1 ? recap(c, idx - 1) : "") + text + fileNote;
    const args = ["-p", "--model", m.model, "--effort", m.effort, "--permission-mode", s.mode, "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--append-system-prompt", KNOW_CLAUDE, ...(resume ? ["--resume", resume] : []), ...(resume && c.claude?.fork ? ["--fork-session"] : [])];
    const p = cp.spawn(CLAUDE, args, { cwd: c.cwd, env: claudeEnv(a), stdio: ["pipe", "pipe", fs.openSync(log, "w")], detached: true });
    j.proc = p; p.stdin.end(prompt);
    let buf = "", session = resume, result = "", isErr = false, gotText = false; const open = new Map();
    p.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); let ev; try { ev = JSON.parse(line); } catch { continue; }
      if (ev.session_id) session = ev.session_id;
      if (ev.type === "stream_event") { const x = ev.event || {};
        if (x.type === "message_start") j.live = "";
        if (x.type === "content_block_delta" && x.delta?.type === "text_delta") { j.live += x.delta.text; j.step = "Writing"; ver++; }
        if (x.type === "content_block_delta" && x.delta?.type === "thinking_delta" && !j.live) j.step = "Thinking";
        continue; }
      if (ev.type === "assistant") { for (const b of ev.message?.content || []) {
        if (b.type === "text" && b.text.trim()) { ai.parts.push({ t: "text", text: b.text }); gotText = true; j.live = ""; }
        if (b.type === "tool_use") { const st = { t: "step", ...stepOfTool(b.name, b.input), state: "run" }; ai.parts.push(st); open.set(b.id, st); j.step = st.text; }
      } save(c); }
      if (ev.type === "user") for (const b of ev.message?.content || []) if (b.type === "tool_result" && open.has(b.tool_use_id)) { const st = open.get(b.tool_use_id); st.state = b.is_error ? "fail" : "done"; open.delete(b.tool_use_id); ver++; }
      if (ev.type === "result") { result = String(ev.result || ""); isErr = !!ev.is_error; if (ev.total_cost_usd) ai.cost = ev.total_cost_usd;
        const it = ev.usage?.iterations?.at(-1) || ev.usage, mu = Object.values(ev.modelUsage || {})[0];  // the last call's size = how full the conversation is now
        if (it) c.ctx = { used: (it.input_tokens || 0) + (it.cache_read_input_tokens || 0) + (it.cache_creation_input_tokens || 0) + (it.output_tokens || 0), max: mu?.contextWindow || 200000 }; }
    } });
    p.on("error", () => {});
    p.on("close", (code) => {
      const lg = (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "") + (isErr ? result : "");
      if (session) { c.claude = { session, acct }; c.last = "claude"; }  // a fork comes back with its own new session id; the fork flag goes away with it
      if (j.stopped) return finish(c, ai, "Stopped.", false, true);
      if (isErr && result) ai.parts = ai.parts.filter((p) => !(p.t === "text" && p.text.trim() === result.trim()));  // the CLI echoes its error as a reply too
      if ((isErr || (!gotText && !result)) && /Failed to authenticate|auth(?:entication)? (?:failed|error)|login reached its time limit|claude auth login|not logged in|please run \/login|invalid.{0,20}token|\b401\b/i.test(lg)) { signedOut[acct] = Date.now(); return failNext(`${nameOf(t)}: ${OUT_NOTE(a)}.`); }
      if ((isErr || (!gotText && !result)) && fall(lg)) { limited[acct] = Date.now(); return failNext(`${nameOf(t)} hit its limit.`); }
      if (!isErr) { signedOut[acct] = 0; limited[acct] = 0; }
      if (!gotText && result && !isErr) ai.parts.push({ t: "text", text: result });
      if (isErr || (!gotText && !result)) return finish(c, ai, short(result || lg.split("\n").filter(Boolean).pop() || `Claude stopped (code ${code}).`, 400), true);
      finish(c, ai);
    });
    return;
  }

  /* Codex */
  const cx = t.acct === "auto" ? pickCodex() : CODEX_HOMES.find((x) => x.n === t.acct);
  if (!CODEX) return failNext("The codex program wasn't found (set codexBin in config.json).");
  if (!cx) return failNext(t.acct === "auto" ? "Every Codex account is busy or used up." : `${nameOf(t)} isn't logged in (CODEX_HOME=… codex login).`);
  j.label = ai.label = `${cx.name} · ${modelLabel(e, m.model)} · ${m.effort}`; j.home = cx.home;
  let thread = c.last === "codex" && c.codex?.thread ? c.codex.thread : null;
  if (thread && c.codex.home !== cx.home && !carryCodex(thread, c.codex.home, cx.home)) thread = null;
  const prompt = (thread ? "" : KNOW_CODEX) + parentNote(c, idx) + (!thread && idx > 1 ? recap(c, idx - 1) : "") + text + fileNote;
  const sandbox = s.mode === "plan" ? "read-only" : "workspace-write", bypass = s.mode === "bypassPermissions";
  const common = ["--json", "-m", m.model, "-c", `model_reasoning_effort="${m.effort}"`, "--skip-git-repo-check", ...(bypass ? ["--dangerously-bypass-approvals-and-sandbox"] : []), ...att.filter((a) => a.image).map((a) => `--image=${a.path}`)];
  const args = thread ? ["exec", "resume", ...common, ...(bypass ? [] : ["-c", `sandbox_mode="${sandbox}"`]), thread, "-"] : ["exec", ...common, ...(bypass ? [] : ["--sandbox", sandbox]), "--cd", c.cwd, "-"];
  const p = cp.spawn(CODEX, args, { cwd: c.cwd, env: { ...envBase(), CODEX_HOME: cx.home }, stdio: ["pipe", "pipe", fs.openSync(log, "w")], detached: true });
  j.proc = p; p.stdin.end(prompt);
  let buf = "", gotText = false, err = ""; const open = new Map();
  p.stdout.on("data", (d) => { fs.appendFileSync(log, d); buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); let ev; try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === "thread.started" && ev.thread_id) thread = ev.thread_id;
    if (ev.type === "turn.completed" && ev.usage) c.ctx = { used: (ev.usage.input_tokens || 0) + (ev.usage.output_tokens || 0), max: codexWindow(m.model) };
    if (ev.type === "error" || ev.type === "turn.failed") err = ev.message || ev.error?.message || err;
    const it = ev.item; if (!it) continue;
    if (it.type === "reasoning") j.step = "Thinking";
    if (it.type === "agent_message" && ev.type === "item.completed" && it.text?.trim()) { ai.parts.push({ t: "text", text: it.text }); gotText = true; j.live = ""; save(c); }
    if (it.type === "command_execution") {
      if (ev.type === "item.started") { const st = { t: "step", kind: "run", text: `Ran ${short(String(it.command).replace(/^\/bin\/(?:ba|z)sh -lc '?|'$/g, ""), 70)}`, detail: short(it.command, 400), state: "run" }; ai.parts.push(st); open.set(it.id, st); j.step = st.text; ver++; }
      if (ev.type === "item.completed" && open.has(it.id)) { open.get(it.id).state = it.exit_code === 0 ? "done" : "fail"; open.delete(it.id); save(c); }
    }
    if (it.type === "file_change" && ev.type === "item.completed") { ai.parts.push({ t: "step", kind: "edit", text: `Edited ${(it.changes || []).map((x) => base(x.path)).join(", ")}`, state: "done" }); save(c); }
    if (it.type === "web_search" && ev.type === "item.started") { ai.parts.push({ t: "step", kind: "web", text: `Searched the web: ${short(it.query, 60)}`, state: "done" }); ver++; }
    if (it.type === "mcp_tool_call" && ev.type === "item.started") { ai.parts.push({ t: "step", kind: "tool", text: short(`${it.tool || "tool"}`, 60), state: "done" }); ver++; }
    if (it.type === "todo_list") j.step = "Updated the plan";
    if (/image/i.test(String(it.type))) {
      if (ev.type === "item.started") { const st = { t: "step", kind: "image", text: "Making a picture", state: "run" }; ai.parts.push(st); open.set(it.id, st); j.step = st.text; ver++; }
      if (ev.type === "item.completed") { const st = open.get(it.id); if (st) { st.state = "done"; open.delete(it.id); } else ai.parts.push({ t: "step", kind: "image", text: "Made a picture", state: "done" }); save(c); }
    }
  } });
  p.on("error", () => {});
  p.on("close", (code) => {
    if (thread) { c.codex = { thread, home: cx.home, n: cx.n }; c.last = "codex"; ai.gen = path.join(cx.home, "generated_images", thread); }
    if (j.stopped) return finish(c, ai, "Stopped.", false, true);
    const lg = fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "";
    if (!gotText && fall(err + lg)) {
      cxCache.at = 0;
      if (t.acct === "auto") { const nxt = pickCodex([cx.n]); if (nxt) { ai.parts.push({ t: "note", text: `${cx.name} hit its limit. Moving to ${nxt.name}.` }); jobs.delete(c.id); const t2 = [...tries]; t2[k] = { engine: "codex", acct: nxt.n }; return start(c, ai, text, att, t2, k); } }
      return failNext(`${cx.name} hit its limit.`);
    }
    if (!gotText) return finish(c, ai, short(err || lg.split("\n").filter(Boolean).pop() || `Codex stopped (code ${code}).`, 400), true);
    finish(c, ai);
  });
}

function finish(c, ai, note, failed = false, stopped = false) {
  jobs.delete(c.id);
  for (const p of ai.parts) if (p.t === "step" && p.state === "run") p.state = stopped ? "stop" : "done";
  if (note) ai.parts.push({ t: failed ? "error" : "note", text: note });
  try { collectMedia(c, ai); } catch (e) { console.error("media", e.message); }
  if (ai.compact && !failed && !stopped) {
    const sum = (ai.parts || []).filter((p) => p.t === "text").map((p) => p.text).join("\n\n").trim();
    if (sum) { c.summary = sum; c.summaryIdx = c.messages.indexOf(ai); c.claude = null; c.codex = null; c.last = null; c.ctx = null; ai.parts.push({ t: "note", text: "Compacted. The next message starts a fresh session from this summary." }); }
  }
  ai.running = false; if (failed) ai.failed = true; ai.done = Date.now(); c.updated = Date.now(); save(c);
  /* the next queued follow-up goes out by itself (after a Stop only when "Send now" asked for it) */
  if (c.queue?.length && (!stopped || c.sendNow)) { c.sendNow = false; setTimeout(() => { if (jobs.has(c.id) || !c.queue?.length) return; const q = c.queue.shift(); save(c); const r = send(c.id, q.text, q.files, { ...(q.from ? { from: q.from } : {}), ...(q.compact ? { compact: true } : {}) }); if (r?.error) { c.queue.unshift(q); save(c); } }, 400); }
}
function queueApi(id, qid, action) {
  const c = chats.get(id); if (!c) return { error: "No such chat" }; const i = (c.queue || []).findIndex((q) => q.id === qid); if (i < 0) return { error: "That message already went out" };
  if (action === "remove") { c.queue.splice(i, 1); save(c); return { ok: true }; }
  const [q] = c.queue.splice(i, 1); c.queue.unshift(q);  // send now: to the front, stop the running reply, it goes out when the stop lands
  if (jobs.has(id)) { c.sendNow = true; save(c); stop(id); return { ok: true }; }
  c.queue.shift(); save(c); return send(id, q.text, q.files, { ...(q.from ? { from: q.from } : {}), ...(q.compact ? { compact: true } : {}) });
}
function stop(id) { const j = jobs.get(id); if (!j?.proc) return { error: "Nothing is running" }; j.stopped = true; try { process.kill(-j.proc.pid, "SIGTERM"); } catch { try { j.proc.kill(); } catch {} } setTimeout(() => { try { process.kill(-j.proc.pid, "SIGKILL"); } catch {} }, 5000); return { ok: true }; }
function retry(id) { const c = chats.get(id); if (!c) return { error: "No such chat" }; if (jobs.has(id)) return { error: "Wait until the reply lands" }; const i = c.messages.map((m) => m.who).lastIndexOf("you"); if (i < 0) return { error: "Nothing to send again" }; const m = c.messages[i]; c.messages.splice(i); save(c); return send(id, m.text, (m.files || []).map((f) => f.id)); }

/* ---------- bring in a Claude app (desktop) session: its history shows here, and it continues as a branch so the original stays as it was ---------- */
const CCD = path.join(HOME, "Library/Application Support/Claude/claude-code-sessions");
function desktopSessions() {
  const out = [];
  let accts = []; try { accts = fs.readdirSync(CCD); } catch { return out; }
  for (const a of accts) { let orgs = []; try { orgs = fs.readdirSync(path.join(CCD, a)); } catch { continue; }
    for (const o of orgs) { let fl = []; try { fl = fs.readdirSync(path.join(CCD, a, o)).filter((f) => /^local_[\w-]+\.json$/.test(f)); } catch { continue; }
      for (const f of fl) { const r = rj(path.join(CCD, a, o, f), null); if (!r?.cliSessionId || r.isArchived) continue; out.push({ id: r.cliSessionId, title: r.title || "Untitled", cwd: r.cwd || "", at: r.lastActivityAt || r.createdAt || 0, model: r.model || "", turns: r.completedTurns || 0 }); } } }
  const seen = new Set(); return out.sort((x, y) => y.at - x.at).filter((x) => !seen.has(x.id) && seen.add(x.id)).slice(0, 60);
}
function transcriptOf(cli) {
  if (!/^[0-9a-f-]{36}$/.test(cli)) return null;
  for (const a of CLAUDES) { const root = path.join(a.configDir, "projects"); try { for (const d of fs.readdirSync(root)) { const f = path.join(root, d, cli + ".jsonl"); if (fs.existsSync(f)) return f; } } catch {} }
  return null;
}
function importSession(cli) {
  if (!CLAUDES.length) return { error: "No Claude account is set up in config.json" };
  const f = transcriptOf(cli); if (!f) return { error: "That session's history isn't on this Mac" };
  const meta = desktopSessions().find((x) => x.id === cli) || {}, msgs = []; let ai = null, cwd = meta.cwd || "";
  const isNoise = (t) => /^\s*<(system-reminder|command-|local-command|bash-|task-notification|cross-session-message)/.test(t) || /^Caveat: /.test(t) || /^\[Request interrupted/.test(t);
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    if (!line) continue; let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.cwd && !cwd) cwd = e.cwd;
    const c = e.message?.content, at = Date.parse(e.timestamp || "") || Date.now();
    if (e.type === "system" && e.subtype === "compact_boundary") { if (ai) ai.parts.push({ t: "note", text: "The conversation was compacted here." }); continue; }
    if (e.type === "user" && !e.isMeta && !e.isCompactSummary) {
      let text = typeof c === "string" ? c : Array.isArray(c) && !c.some((x) => x?.type === "tool_result") ? c.filter((x) => x?.type === "text").map((x) => x.text).join("\n") + (c.some((x) => x?.type === "image") ? "\n[picture]" : "") : null;
      if (text == null) continue; text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "").trim();
      if (!text || isNoise(text)) continue;
      ai = null; msgs.push({ id: uid(), who: "you", text: text.slice(0, 20000), at }); continue;
    }
    if (e.type === "assistant" && Array.isArray(c)) {
      if (!ai) { ai = { id: uid(), who: "ai", parts: [], at, label: "Claude app · " + (modelLabel("claude", meta.model) || "Claude"), done: at, t0: at }; msgs.push(ai); }
      for (const b of c) {
        if (b?.type === "text" && b.text.trim()) ai.parts.push({ t: "text", text: b.text });
        if (b?.type === "tool_use") { const st = stepOfTool(b.name, b.input || {}); ai.parts.push({ t: "step", ...st, state: "done" }); }
      }
      ai.done = at;
    }
  }
  if (!msgs.length) return { error: "Nothing to bring in from that session" };
  const kept = msgs.slice(-380), c = create({ cwd: checkFolder(cwd) || undefined });
  c.title = (meta.title || "Imported session").slice(0, 100); c.messages = kept;
  if (msgs.length > kept.length) kept.unshift({ id: uid(), who: "ai", parts: [{ t: "note", text: `${msgs.length - kept.length} earlier messages stay in the original session; the agent still remembers them.` }], at: kept[0].at });
  c.claude = { session: cli, acct: CLAUDES[0].id, fork: true }; c.last = "claude"; c.imported = { from: cli, title: meta.title || "", at: Date.now() };
  if (meta.model && CLAUDE_MODELS.some((m) => m.id === meta.model)) c.settings.claude.model = meta.model;
  c.updated = Date.now(); save(c);
  return { ok: true, id: c.id, messages: msgs.length };
}

/* ---------- what's running: Claudex's own replies ---------- */
function running() {
  const replies = [];
  for (const c of chats.values()) { const j = jobs.get(c.id); if (j) replies.push({ id: c.id, title: titleOf(c), label: j.label, step: j.step, since: j.started }); }
  return { replies };
}

/* ---------- drives: never fill one up (the system disk plus every mounted drive) ---------- */
const MIN_FREE = 5e9, WARN_FREE = 20e9;
const space = (p) => { const s = fs.statfsSync(p); return { free: s.bavail * s.bsize, total: s.blocks * s.bsize }; };
const rate = (d) => ({ ...d, low: d.free < WARN_FREE || d.free / d.total < 0.1, full: d.free < MIN_FREE });
function drives() {
  return [{ path: "/", name: "This Mac" }, ...CFG.mounts().map((p) => ({ path: p }))].map((d) => { try { return rate({ ...d, ...space(d.path) }); } catch { return null; } }).filter(Boolean);
}
const driveOf = (p) => drives().filter((d) => p === d.path || p.startsWith(d.path === "/" ? "/" : d.path + "/")).sort((a, b) => b.path.length - a.path.length)[0];
const gb = (n) => (n / 1e9).toFixed(1) + " GB";
/* jobs, uploads and dropped files are refused on a drive with under 5 GB left (measured on the folder itself, so any mount counts) */
function lowDrive(p) { let d; try { d = rate({ ...(driveOf(p) || { path: p }), ...space(p) }); } catch { return ""; } return d.full ? `${d.name || d.path} is almost full (${gb(d.free)} left). Free some space first, or pick a folder on another drive.` : ""; }
function cleanLogs() { try { const old = Date.now() - 7 * 864e5; for (const f of fs.readdirSync(LOGS)) { const p = path.join(LOGS, f); try { if (fs.statSync(p).mtimeMs < old) fs.unlinkSync(p); } catch {} } } catch {} }
setTimeout(cleanLogs, 60e3).unref(); setInterval(cleanLogs, 864e5).unref();

/* ---------- uploads ---------- */
const MIME = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "application/pdf": ".pdf", "text/plain": ".txt", "text/markdown": ".md", "application/json": ".json", "text/csv": ".csv", "video/mp4": ".mp4", "video/quicktime": ".mov", "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav" };
function addUpload(buf, mime, name) {
  const ext = MIME[mime]; if (!ext) return { error: "That file type isn't supported" };
  { const d = lowDrive(UP); if (d) return { error: d }; }
  const id = "u" + uid(), clean = String(name || "file").replace(/[^\w. ()-]/g, "").slice(0, 80) || "file";
  const f = path.join(UP, id + ext); fs.writeFileSync(f, buf); fs.writeFileSync(path.join(UP, id + ".json"), JSON.stringify({ id, name: clean, mime, ext }));
  return { id, name: clean, image: mime.startsWith("image/") };
}
function upload(id) {
  if (!/^u[a-z0-9]+$/.test(String(id))) return null; const j = rj(path.join(UP, id + ".json"), null); if (!j || !MIME[j.mime]) return null;
  const f = path.join(UP, id + j.ext); if (!fs.existsSync(f)) return null;
  return { id, name: j.name, image: j.mime.startsWith("image/"), path: f, mime: j.mime };
}

function shutdown() { for (const [id, j] of jobs) { j.stopped = true; try { process.kill(-j.proc.pid, "SIGTERM"); } catch {} } }
module.exports = {
  shutdown,
  state: () => ({ drives: drives(), accounts: accounts(), models: { claude: CLAUDE_MODELS, codex: codexModels() }, modes: MODES, folders: recentFolders(), prefs }),
  mediaFile, queueApi, running, folders: folderApi, desktopSessions, importSession, drives, lowDrive, compact: (id) => send(id, COMPACT, [], { compact: true }), ver: () => ver, list, create: (b) => view(create(b)), get: (id, last) => { const c = chats.get(id); return c ? view(c, last) : null; }, update, remove, send, stop, retry, addUpload, upload, checkFolder,
};
