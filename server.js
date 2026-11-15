// Claudex: the Claude Code app in a browser, on your own computer. Listens on 127.0.0.1 only; the web reaches it through a Cloudflare Tunnel.
// The door: anything through the tunnel (it carries cf-connecting-ip) must come to config.publicHost and needs a verified Google sign-in
// that config.signIn allows. There is no access code: this page can run anything on the computer. On the computer itself no sign-in
// (unless localNoSignIn is false), but every API call must come from Claudex's own page (header + origin + host checks),
// so another website open in a browser here can't drive it.
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const CFG = require("./config.js");
const D = __dirname, DATA = CFG.dataDir, PUB = path.join(D, "public"), PORT = CFG.port;
fs.mkdirSync(DATA, { recursive: true });
const push = require("./push.js"), engine = require("./engine.js"), { mask, unmask, setNickname } = require("./privacy.js");
const TYPE = { ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webm": "video/webm", ".m4v": "video/mp4", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".webp": "image/webp", ".gif": "image/gif", ".html": "text/html; charset=utf-8", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".pdf": "application/pdf", ".mp4": "video/mp4", ".mov": "video/quicktime", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8", ".json": "application/json", ".csv": "text/plain; charset=utf-8" };

const SECRET = (() => { const p = path.join(DATA, "session.secret"); if (!fs.existsSync(p)) fs.writeFileSync(p, crypto.randomBytes(32).toString("hex"), { mode: 0o600 }); return fs.readFileSync(p, "utf8").trim(); })();
const HOST = CFG.publicHost, FB = CFG.firebase, DAYS = 14 * 86400;
/* Google's "hd" hint on the sign-in screen, only when the list is exactly one domain */
const HD = CFG.signIn.domains.length === 1 && !CFG.signIn.emails.length ? CFG.signIn.domains[0] : "";
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const sealed = (b) => crypto.createHmac("sha256", SECRET).update(b).digest("hex");
const makeSession = (who) => { const b = `${Buffer.from(who).toString("base64url")}.${Math.floor(Date.now() / 1000) + DAYS}`; return `${b}.${sealed(b)}`; };
function sessionUser(req) {
  const c = /(?:^|;\s*)claudex=([\w.-]+)/.exec(req.headers.cookie || "")?.[1] || "", [who, exp, mac] = c.split(".");
  if (!mac || !same(mac, sealed(`${who}.${exp}`)) || +exp <= Date.now() / 1000) return "";
  const v = Buffer.from(who, "base64url").toString(); return CFG.allowed(v) ? v : "";  // taking someone off the list locks them out at once
}
let gKeys = { until: 0, certs: {} };
async function firebaseCerts() { if (Date.now() < gKeys.until) return gKeys.certs; const r = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"); if (!r.ok) throw new Error("no keys"); gKeys = { until: Date.now() + (+/max-age=(\d+)/.exec(r.headers.get("cache-control") || "")?.[1] || 3600) * 1000, certs: await r.json() }; return gKeys.certs; }
async function checkGoogle(token) {  // Firebase says who you are; this server decides who gets in
  if (!FB.projectId) throw new Error("sign-in not set up");
  const [h, b, sig] = String(token).split("."), head = JSON.parse(Buffer.from(h, "base64url")), c = JSON.parse(Buffer.from(b, "base64url")), now = Date.now() / 1000;
  const cert = head.alg === "RS256" && (await firebaseCerts())[head.kid]; if (!cert || !crypto.createVerify("RSA-SHA256").update(`${h}.${b}`).verify(crypto.createPublicKey(cert), sig, "base64url")) throw new Error("bad signature");
  if (c.aud !== FB.projectId || c.iss !== `https://securetoken.google.com/${FB.projectId}` || !c.sub || c.exp <= now || c.iat > now + 300 || c.auth_time > now + 300) throw new Error("bad claims");
  const email = String(c.email || "").toLowerCase(); if (c.firebase?.sign_in_provider !== "google.com" || c.email_verified !== true || !CFG.allowed(email)) throw new Error("not allowed"); return email;
}
const viaWeb = (req) => !!req.headers["cf-connecting-ip"];
const LOCAL_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const hostOk = (req) => (viaWeb(req) ? !!HOST && req.headers.host === HOST : LOCAL_HOSTS.has(req.headers.host));
const originOk = (req) => { const o = req.headers.origin; if (!o) return req.method === "GET"; return viaWeb(req) ? !!HOST && o === `https://${HOST}` : LOCAL_HOSTS.has(o.replace(/^http:\/\//, "")); };
const cookie = (v) => `claudex=${makeSession(v)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS}`;
const tries = new Map();  // sign-in attempts per address, 10 a quarter hour
const tooMany = (ip) => { const now = Date.now(), t = (tries.get(ip) || []).filter((x) => now - x < 15 * 60e3); t.push(now); tries.set(ip, t); return t.length > 10; };
const js = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
const LOGIN = () => fs.readFileSync(path.join(PUB, "login.html"), "utf8").replace("{{FB}}", js({ apiKey: FB.apiKey, authDomain: FB.authDomain, projectId: FB.projectId })).replace("{{HD}}", js(HD));

const SEC = { "x-content-type-options": "nosniff", "referrer-policy": "same-origin", "x-frame-options": "DENY", "permissions-policy": "microphone=(self), camera=()" };
const send = (res, code, body, ct = "application/json") => { res.writeHead(code, { "content-type": ct, "cache-control": "no-store", ...SEC }); res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : mask(JSON.stringify(body))); };  // drive names and the home folder never leave the Mac
const readBody = (req, max, cb) => { const parts = []; let size = 0, over = false; req.on("data", (c) => { size += c.length; if (size > max) { over = true; req.destroy(); } else parts.push(c); }); req.on("end", () => !over && cb(Buffer.concat(parts))); };
const json = (buf) => { try { return JSON.parse(buf.toString() || "{}"); } catch { return {}; } };
function sendFile(req, res, f, ct) {
  const size = fs.statSync(f).size, r = /bytes=(\d*)-(\d*)/.exec(req.headers.range || ""), a = r ? +r[1] || 0 : 0, z = r && r[2] ? Math.min(+r[2], size - 1) : size - 1;
  const h = { "content-type": ct, "accept-ranges": "bytes", "cache-control": "private, max-age=3600", ...SEC };
  if (r) { res.writeHead(206, { ...h, "content-range": `bytes ${a}-${z}/${size}`, "content-length": z - a + 1 }); return fs.createReadStream(f, { start: a, end: z }).pipe(res); }
  res.writeHead(200, { ...h, "content-length": size }); fs.createReadStream(f).pipe(res);
}
const PUBLIC_FILES = /^\/(app\.css|sw\.js|logo\.svg|icon-\d+\.png|manifest\.webmanifest|fonts\/[\w-]+\.woff2)$/;

http.createServer((req, res) => {
  let u; try { u = decodeURIComponent(req.url.split("?")[0]); } catch { return send(res, 400, { error: "bad address" }); }
  if (!hostOk(req)) return send(res, 421, { error: "wrong host" });
  const q = new URL(req.url, "http://x").searchParams;
  const user = viaWeb(req) || !CFG.localNoSignIn ? sessionUser(req) : "this Mac";
  if (PUBLIC_FILES.test(u) && req.method === "GET") return send(res, 200, fs.readFileSync(path.join(PUB, u)), TYPE[path.extname(u)]);
  if (!user) {
    if (u === "/login/google" && req.method === "POST") {
      if (!originOk(req)) return send(res, 403, { error: "Sign in from Claudex itself." });
      if (tooMany(req.headers["cf-connecting-ip"] || req.socket.remoteAddress)) return send(res, 429, { error: "Too many tries. Wait a few minutes." });
      return readBody(req, 8000, async (b) => { try { const email = await checkGoogle(json(b).token); console.log(new Date().toISOString(), "sign-in ok"); res.writeHead(200, { "content-type": "application/json", "set-cookie": cookie(email), ...SEC }); res.end("{}"); } catch (e) { console.log(new Date().toISOString(), "sign-in refused:", e.message); send(res, 403, { error: e.message === "not allowed" ? "That Google account isn't on this Claudex's sign-in list." : e.message === "sign-in not set up" ? "Sign-in isn't set up on this Claudex." : "That sign-in didn't check out." }); } });
    }
    return u.startsWith("/api/") ? send(res, 401, { error: "Sign in first" }) : send(res, 200, LOGIN(), TYPE[".html"]);
  }
  if (u === "/logout") { res.writeHead(303, { "set-cookie": "claudex=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict", location: "/", ...SEC }); return res.end(); }
  if (u === "/" || u === "/index.html") return send(res, 200, fs.readFileSync(path.join(PUB, "index.html")), TYPE[".html"]);

  if (u.startsWith("/api/")) {
    if (req.headers["x-claudex"] !== "1" || !originOk(req)) return send(res, 403, { error: "Only Claudex's own page can do that" });
    const out = (r, ok = 200) => send(res, r?.error ? 409 : ok, r ?? { error: "not found" });
    if (u === "/api/state" && req.method === "GET") return send(res, 200, { ...engine.state(), watches: push.watches(), pushKey: push.publicKey(), user: user === "this Mac" ? "this Mac" : user.split("@")[0], onMac: user === "this Mac" });
    if (u === "/api/running" && req.method === "GET") return send(res, 200, engine.running());
    if (u === "/api/desktop-sessions" && req.method === "GET") return send(res, 200, { sessions: engine.desktopSessions() });
    if (u === "/api/chats" && req.method === "GET") return send(res, 200, { chats: engine.list(), folders: engine.folders.list(), ver: engine.ver() });
    const cm = /^\/api\/chats\/(c[a-z0-9]+)(?:\/(send|stop|retry|compact))?$/.exec(u);
    if (cm && req.method === "GET" && !cm[2]) { const v = engine.get(cm[1], +q.get("last") || 120); return v ? send(res, 200, { chat: v, ver: engine.ver() }) : send(res, 404, { error: "No such chat" }); }
    if (u === "/api/upload" && req.method === "POST") { const mime = (req.headers["content-type"] || "").split(";")[0]; return readBody(req, 60e6, (b) => out(engine.addUpload(b, mime, q.get("name")))); }
    /* files dropped on a project in the sidebar are copied into that folder (never over an existing file) */
    if (u === "/api/drop" && req.method === "POST") {
      const dir = engine.checkFolder(unmask(q.get("dir") || "")); if (!dir) return send(res, 404, { error: "That folder doesn't exist on the Mac" });
      { const low = engine.lowDrive(dir); if (low) return send(res, 507, { error: low }); }
      const clean = path.basename(String(q.get("name") || "file")).replace(/[\u0000-\u001f\/\\:]/g, "").replace(/^\.+/, "").slice(0, 120) || "file";
      return readBody(req, 500e6, (b) => {
        const ext = path.extname(clean), stem = clean.slice(0, clean.length - ext.length); let name = clean, n = 2;
        while (fs.existsSync(path.join(dir, name))) name = `${stem} (${n++})${ext}`;
        try { fs.writeFileSync(path.join(dir, name), b, { flag: "wx" }); send(res, 200, { ok: true, name }); } catch (e) { send(res, 500, { error: "Couldn't save " + clean }); }
      });
    }
    if (u === "/api/folder" && req.method === "GET") { const p = engine.checkFolder(unmask(q.get("path"))); return send(res, p ? 200 : 404, p ? { path: p } : { error: "That folder doesn't exist on the Mac" }); }
    if (req.method === "GET") return send(res, 404, { error: "not found" });
    return readBody(req, 1e6, (b) => {
      const j = json(b); for (const k of ["cwd", "text", "title", "name"]) if (typeof j[k] === "string") j[k] = unmask(j[k]);  // "Drive A/…" and "~/…" back to real paths
      if (u === "/api/chats" && req.method === "POST") return out(engine.create(j));
      if (u === "/api/folders" && req.method === "POST") return out(engine.folders.create(j.name));
      { const fm = /^\/api\/folders\/(f[a-z0-9]+)$/.exec(u); if (fm) return out(req.method === "DELETE" ? engine.folders.remove(fm[1]) : engine.folders.update(fm[1], j)); }
      if (u === "/api/import" && req.method === "POST") return out(engine.importSession(String(j.id || "")));
      if (u === "/api/nickname" && req.method === "POST") { const real = engine.checkFolder(unmask(String(j.path || ""))); if (!real) return send(res, 404, { error: "That folder doesn't exist on the Mac" }); return out(setNickname(real, j.name)); }
      if (cm && req.method === "PATCH" && !cm[2]) return out(engine.update(cm[1], j));
      if (cm && req.method === "DELETE" && !cm[2]) return out(engine.remove(cm[1]));
      if (cm && req.method === "POST" && cm[2] === "send") { const from = typeof j.from === "string" ? j.from.replace(/[^\w .:&-]/g, "").trim().slice(0, 40) : ""; const r = engine.send(cm[1], j.text, j.files, from ? { from } : {});
        if (from && r && !r.error) { const t = engine.get(cm[1], 1)?.title || "a chat"; push.notify({ title: `Message from ${from}`, body: mask(`${t}: ${String(j.text || "").replace(/\s+/g, " ").slice(0, 140)}`), tag: "from-" + cm[1], url: "/#" + cm[1] }).catch(() => {}); }
        return out(r); }
      if (cm && req.method === "POST" && cm[2] === "stop") return out(engine.stop(cm[1]));
      if (cm && req.method === "POST" && cm[2] === "retry") return out(engine.retry(cm[1]));
      if (cm && req.method === "POST" && cm[2] === "compact") return out(engine.compact(cm[1]));
      { const qm = /^\/api\/chats\/(c[a-z0-9]+)\/queue\/([a-z0-9]+)(?:\/(now))?$/.exec(u); if (qm) return out(engine.queueApi(qm[1], qm[2], req.method === "DELETE" ? "remove" : "now")); }
      if (u === "/api/push/subscribe" && req.method === "POST") return out(push.subscribe(j.subscription));
      if (u === "/api/watch" && req.method === "POST") { const a = engine.state().accounts.find((x) => x.id === j.acct); if (!a || a.engine === "auto") return send(res, 404, { error: "No such account" }); const w = a.win || {}, k = (w.week || 0) >= (w.five || 0) ? "weekAt" : "fiveAt"; return out(push.watch(a.id, !!j.on, { name: a.name, at: (a.use != null && a.use >= 90) || a.held ? w[k] || null : w[k] || null })); }
      if (u === "/api/push/test" && req.method === "POST") return push.notify({ title: "Claudex", body: "Notifications are on.", tag: "test", url: "/" }).then((n) => send(res, 200, { ok: true, sent: n }));
      send(res, 404, { error: "not found" });
    });
  }
  const mm = /^\/media\/(c[a-z0-9]+)\/([a-z0-9]+)\/(\d+)$/.exec(u);  // only files a reply made or named (registered by the engine)
  if (mm && req.method === "GET") { const f = engine.mediaFile(mm[1], mm[2], mm[3]); return f ? sendFile(req, res, f.path, TYPE[path.extname(f.path).toLowerCase()] || (f.kind === "video" ? "video/mp4" : f.kind === "audio" ? "audio/mpeg" : "image/png")) : send(res, 404, { error: "not found" }); }
  const um = /^\/up\/(u[a-z0-9]+)$/.exec(u);
  if (um && req.method === "GET") { const f = engine.upload(um[1]); return f ? sendFile(req, res, f.path, f.mime.startsWith("text/") ? "text/plain; charset=utf-8" : f.mime) : send(res, 404, { error: "not found" }); }
  const f = path.join(PUB, path.normalize(u));
  if (f.startsWith(PUB + path.sep) && fs.existsSync(f) && fs.statSync(f).isFile()) return send(res, 200, fs.readFileSync(f), TYPE[path.extname(f)] || "application/octet-stream");
  send(res, 404, { error: "not found" });
}).listen(PORT, "127.0.0.1", () => console.log("claudex on", PORT));
/* every minute: tell the phone when a watched account is available again */
setInterval(() => { push.check(engine.state().accounts).catch((e) => console.error("watch", e.message)); }, 60e3).unref();
process.on("SIGTERM", () => { engine.shutdown(); setTimeout(() => process.exit(0), 300); });  // running jobs stop with the server, so a restart never leaves a twin
