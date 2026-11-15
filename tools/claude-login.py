#!/usr/bin/env python3
# Claudex "Add account" for Claude: runs `claude setup-token` inside a pseudo-terminal (it needs one), reports the sign-in link,
# waits for the code the person copies from claude.com, and reports the long-lived token. One JSON object per line on stdout:
#   {"url": "..."}   then, after a code line arrives on stdin:   {"token": "sk-ant-oat..."}   or   {"error": "..."}
# Runs with an empty CLAUDE_CONFIG_DIR (set by the caller), so the Mac's own Claude logins are never touched.
import os, pty, sys, re, json, select, time, signal, fcntl, termios, struct
CLAUDE = os.environ.get("CLAUDEX_CLAUDE_BIN", "claude")
def say(o): sys.stdout.write(json.dumps(o) + "\n"); sys.stdout.flush()
pid, fd = pty.fork()
if pid == 0:
    os.execvp(CLAUDE, [CLAUDE, "setup-token"])
fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", 60, 1000, 0, 0))  # very wide, so the link and token never wrap
ansi = re.compile(r"\x1b\[[0-9;?]*[ -/]*[@-~]")
buf, url, sent, end = "", None, False, time.time() + 20 * 60
try:
    while time.time() < end:
        fds = [fd] + ([sys.stdin] if url and not sent else [])
        r, _, _ = select.select(fds, [], [], 1.0)
        if fd in r:
            try: chunk = os.read(fd, 65536).decode("utf8", "ignore")
            except OSError: break
            if not chunk: break
            buf += chunk
            if not url:
                m = re.search(r"\x1b\]8;[^;]*;(https://claude\.(?:com|ai)/[^\x07\x1b]+)", buf) or re.search(r"(https://claude\.(?:com|ai)/cai/oauth/authorize\?\S+)", ansi.sub("", buf))
                if m: url = m.group(1); say({"url": url})
            t = re.search(r"(sk-ant-oat01-[A-Za-z0-9_\-]{20,})", ansi.sub("", buf).replace("\r", "").replace("\n", ""))
            if t: say({"token": t.group(1)}); break
            if sent and re.search(r"(?i)(invalid|expired|error|failed)[^\n]{0,80}code", ansi.sub("", buf[-2000:])): say({"error": "Claude didn't accept that code. Start again and paste the newest code."}); break
        if sys.stdin in r:
            line = sys.stdin.readline()
            if not line: break
            code = line.strip()
            if code: os.write(fd, (code + "\r").encode()); sent = True
    else:
        say({"error": "The sign-in timed out after 20 minutes."})
finally:
    try: os.kill(pid, signal.SIGKILL)
    except Exception: pass
