// Claudex phone notifications (Web Push), with Node's own crypto only: VAPID (RFC 8292) + aes128gcm payloads (RFC 8291).
// data/vapid.json holds the server's key pair (private, 0600); data/push.json the browsers that said yes; data/watch.json the accounts to watch.
const fs = require("fs"), path = require("path"), crypto = require("crypto"), CFG = require("./config.js");
const DATA = CFG.dataDir, VAPID = path.join(DATA, "vapid.json"), SUBS = path.join(DATA, "push.json"), WATCH = path.join(DATA, "watch.json");
const rj = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const b64u = (b) => Buffer.from(b).toString("base64url");
fs.mkdirSync(DATA, { recursive: true });

let keys = rj(VAPID, null);
if (!keys) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = privateKey.export({ format: "jwk" }), pub = publicKey.export({ format: "jwk" });
  keys = { jwk, publicKey: b64u(Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, "base64url"), Buffer.from(pub.y, "base64url")])) };
  fs.writeFileSync(VAPID, JSON.stringify(keys), { mode: 0o600 });
}
const signKey = crypto.createPrivateKey({ key: keys.jwk, format: "jwk" });

function vapidHeader(endpoint) {
  const aud = new URL(endpoint).origin, head = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const body = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: CFG.pushSubject }));
  const sig = crypto.sign("sha256", Buffer.from(`${head}.${body}`), { key: signKey, dsaEncoding: "ieee-p1363" });
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${keys.publicKey}`;
}
/* RFC 8291: ECDH with the browser's key, HKDF with its auth secret, one AES-128-GCM record */
function encrypt(sub, payload) {
  const uaPub = Buffer.from(sub.keys.p256dh, "base64url"), auth = Buffer.from(sub.keys.auth, "base64url");
  const ecdh = crypto.createECDH("prime256v1"); ecdh.generateKeys(); const asPub = ecdh.getPublicKey(), shared = ecdh.computeSecret(uaPub);
  const ikm = Buffer.from(crypto.hkdfSync("sha256", shared, auth, Buffer.concat([Buffer.from("WebPush: info\0"), uaPub, asPub]), 32));
  const salt = crypto.randomBytes(16);
  const cek = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const c = crypto.createCipheriv("aes-128-gcm", cek, nonce), body = Buffer.concat([c.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPub.length]), asPub, body]);
}
async function sendOne(sub, msg) {
  const r = await fetch(sub.endpoint, { method: "POST", headers: { "content-encoding": "aes128gcm", "content-type": "application/octet-stream", ttl: "86400", urgency: "high", authorization: vapidHeader(sub.endpoint) }, body: encrypt(sub, JSON.stringify(msg)), signal: AbortSignal.timeout(15000) });
  return r.status;
}
/* every browser that said yes gets it; ones the push service says are gone (404/410) are dropped */
async function notify(msg) {
  const subs = rj(SUBS, []), keep = []; let sent = 0;
  for (const s of subs) { try { const st = await sendOne(s, msg); if (st === 404 || st === 410) continue; if (st < 300) sent++; else console.error("push", st); } catch (e) { console.error("push", e.message); } keep.push(s); }
  if (keep.length !== subs.length) fs.writeFileSync(SUBS, JSON.stringify(keep));
  return sent;
}
function subscribe(sub) {
  if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) return { error: "That isn't a push subscription" };
  const subs = rj(SUBS, []).filter((s) => s.endpoint !== sub.endpoint); subs.push({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, at: Date.now() });
  fs.writeFileSync(SUBS, JSON.stringify(subs.slice(-10)), { mode: 0o600 }); return { ok: true };
}
/* watches: {acct: {at: reset time to wait for or null, name}} — checked every minute against the live account list */
const watches = () => rj(WATCH, {});
function watch(acct, on, info) { const w = watches(); if (on) w[acct] = { at: info.at || null, name: info.name, since: Date.now() }; else delete w[acct]; fs.writeFileSync(WATCH, JSON.stringify(w)); return { ok: true, watches: w }; }
async function check(accounts) {
  const w = watches(); let changed = false;
  for (const [id, x] of Object.entries(w)) {
    const a = accounts.find((y) => y.id === id); if (!a) { delete w[id]; changed = true; continue; }
    const free = x.at ? Date.now() >= x.at : !a.held && (a.use == null || a.use < 90);
    if (!free) continue;
    delete w[id]; changed = true;
    await notify({ title: `${a.name} is available again`, body: a.use != null ? `${Math.round(a.use)}% used. Tap to open Claudex.` : "Tap to open Claudex.", tag: "acct-" + id, url: "/" });
  }
  if (changed) fs.writeFileSync(WATCH, JSON.stringify(w));
}
module.exports = { publicKey: () => keys.publicKey, subscribe, watch, watches, check, notify, _encrypt: encrypt, _vapid: vapidHeader };
