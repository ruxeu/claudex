#!/usr/bin/env python3
# Claudex "Add account → Open in Terminal": runs the real sign-in in Terminal (interactive, as usual) and leaves the result where
# Claudex picks it up. usage: terminal-login.py codex|claude <result-file>
#   codex : runs `codex login` (CODEX_HOME is set by the caller to a fresh folder); result {"ok": true} when it signed in
#   claude: runs `claude setup-token` and keeps its sign-in token; result {"token": "..."}; nothing else is saved
import os, pty, sys, re, json, subprocess
engine, out = sys.argv[1], sys.argv[2]
def done(o):
    fd = os.open(out, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f: json.dump(o, f)
if engine == "codex":
    r = subprocess.call([os.environ.get("CLAUDEX_CODEX_BIN", "codex"), "login"])
    ok = r == 0 and os.path.exists(os.path.join(os.environ["CODEX_HOME"], "auth.json"))
    done({"ok": True} if ok else {"error": "Codex didn't finish signing in."})
    print("\nSigned in. You can close this window." if ok else "\nNot signed in. Close this window and try again.")
else:
    buf = []
    def read(fd):
        d = os.read(fd, 65536); buf.append(d.decode("utf8", "ignore")); return d
    pty.spawn([os.environ.get("CLAUDEX_CLAUDE_BIN", "claude"), "setup-token"], read)
    text = re.sub(r"\x1b\[[0-9;?]*[ -/]*[@-~]", "", "".join(buf)).replace("\r", "").replace("\n", "")
    m = re.search(r"(sk-ant-oat01-[A-Za-z0-9_\-]{20,})", text)
    done({"token": m.group(1)} if m else {"error": "Claude didn't give a sign-in token."})
    print("\nSigned in. Claudex has the account now; you can close this window." if m else "\nNot signed in. Close this window and try again.")
