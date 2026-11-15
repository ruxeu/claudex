#!/bin/bash
# Post a message into a Claudex chat from another session or script (it shows as "From <name>"), e.g.
#   claudex-send.sh "Website" "The nightly build finished." --from "Build bot"
#   claudex-send.sh "Website" "Which pages are still left?" --from Notes --wait      (waits for the reply and prints it)
#   claudex-send.sh --list                                                             (the Claudex chats)
# If that chat is busy, the message is queued and goes out after its current reply. Talks to Claudex on this computer only
# (port from $CLAUDEX_PORT, else config.json, else 5750).
set -u
DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec /usr/bin/env python3 -I - "$DIR" "$@" <<'EOF'
import json, os, sys, time, urllib.request
APP = sys.argv.pop(1)
try: PORT = int(os.environ.get("CLAUDEX_PORT") or json.load(open(os.environ.get("CLAUDEX_CONFIG") or os.path.join(APP, "config.json"))).get("port") or 5750)
except Exception: PORT = 5750
B = f"http://127.0.0.1:{PORT}"; H = {"x-claudex": "1", "Origin": B, "content-type": "application/json"}
def call(m, u, body=None):
    r = urllib.request.Request(B + u, data=json.dumps(body).encode() if body is not None else None, headers=H, method=m)
    return json.load(urllib.request.urlopen(r, timeout=60))
args = sys.argv[1:]
wait = "--wait" in args; args = [a for a in args if a != "--wait"]
frm = "another session"
if "--from" in args:
    i = args.index("--from"); frm = args[i + 1] if i + 1 < len(args) else frm; del args[i:i + 2]
try: chats = call("GET", "/api/chats")["chats"]
except Exception as e: print("Claudex isn't reachable on this computer:", e); sys.exit(1)
if not args or args[0] == "--list":
    for c in chats: print("-", c["title"])
    sys.exit(0 if args else 2)
if len(args) < 2: print('usage: claudex-send.sh "<chat name>" "<message>" [--from NAME] [--wait]'); sys.exit(2)
name, text = args[0].strip().lower(), " ".join(args[1:]).strip()
match = [c for c in chats if c["title"].lower() == name] or [c for c in chats if name in c["title"].lower()]
if not match: print(f'No Claudex chat called "{args[0]}". Chats:'); [print("-", c["title"]) for c in chats]; sys.exit(1)
c = match[0]
r = call("POST", f"/api/chats/{c['id']}/send", {"text": text, "from": frm})
if r.get("error"): print("Claudex refused it:", r["error"]); sys.exit(1)
print(f'Posted to Claudex chat "{c["title"]}"' + (" (queued behind the current reply)" if r.get("queued") else "") + ".")
if not wait: sys.exit(0)
deadline = time.time() + 20 * 60
while time.time() < deadline:
    time.sleep(5); v = call("GET", f"/api/chats/{c['id']}")["chat"]
    mine = [i for i, m in enumerate(v["messages"]) if m["who"] == "you" and m.get("from") == frm and m.get("text", "").strip() == text]
    if mine and not v["busy"] and not any(q.get("from") == frm for q in v["queue"]):
        after = v["messages"][mine[-1] + 1:]
        reply = "\n\n".join(p.get("text", "") for m in after if m["who"] == "ai" for p in m.get("parts", []) if p["t"] in ("text", "error"))
        print("Reply:\n" + (reply.strip() or "(no text)")); sys.exit(0)
print("No reply within 20 minutes; it will show in the Claudex chat when it lands.")
EOF
