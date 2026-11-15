#!/bin/bash
# Ask one of your Claude app (desktop) sessions a question, e.g.  ask-session.sh "Website redesign" "which pages are still left?"
# It opens a private, read-only branch of that session (claude --resume <id> --fork-session, plan mode): the branch answers with
# that session's memory up to now; the live session never sees the question and nothing is changed.
#   ask-session.sh --list        the sessions you can ask (newest first)
# Uses Claudex's config.json (next to this folder, or $CLAUDEX_CONFIG): claudeBin and the Claude account named by $ASK_ACCOUNT (default: the first).
set -u
DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec /usr/bin/env python3 -I - "$DIR" "$@" <<'PY'
import json, os, sys, glob, shutil, subprocess, urllib.request
APP, args = sys.argv[1], sys.argv[2:]
HOME = os.path.expanduser("~")
CCD = os.path.join(HOME, "Library/Application Support/Claude/claude-code-sessions")
exp = lambda p: os.path.abspath(os.path.expanduser(p)) if p else ""
try: cfg = json.load(open(os.environ.get("CLAUDEX_CONFIG") or os.path.join(APP, "config.json")))
except FileNotFoundError: cfg = {}
except Exception as e: print("config.json can't be read:", e); sys.exit(1)
bin_ = cfg.get("claudeBin") or "claude"
CLAUDE = exp(bin_) if "/" in bin_ else shutil.which(bin_) or ""
accts = [a for a in (cfg.get("accounts") or {}).get("claude") or [] if isinstance(a, dict)] or [{"name": "Claude"}]
want = os.environ.get("ASK_ACCOUNT", "").strip().lower()
acct = next((a for a in accts if str(a.get("name", "")).lower() == want), accts[0])
CONF = exp(acct.get("configDir")) or os.path.join(HOME, ".claude")

def sessions():
    out, seen = [], set()
    for f in glob.glob(os.path.join(CCD, "*", "*", "local_*.json")):
        try: r = json.load(open(f))
        except Exception: continue
        if not r.get("cliSessionId") or r.get("isArchived"): continue
        out.append({"id": r["cliSessionId"], "title": r.get("title") or "Untitled", "cwd": r.get("cwd") or HOME, "model": r.get("model") or "", "at": r.get("lastActivityAt") or 0})
    out.sort(key=lambda x: -x["at"])
    return [x for x in out if not (x["id"] in seen or seen.add(x["id"]))]

if not args or args[0] in ("-h", "--help"):
    print('usage: ask-session.sh "<session name>" "<question>"   |   ask-session.sh --list'); sys.exit(2)
if args[0] == "--list":
    for s in sessions()[:40]: print("-", s["title"])
    sys.exit(0)
if len(args) < 2: print('usage: ask-session.sh "<session name>" "<question>"'); sys.exit(2)
if not CLAUDE: print("The claude program wasn't found; set claudeBin in config.json."); sys.exit(1)
name, question = args[0].strip().lower(), " ".join(args[1:]).strip()
all_s = sessions()
match = [s for s in all_s if s["title"].lower() == name] or [s for s in all_s if name in s["title"].lower()]
if not match:
    print(f'No Claude app session called "{args[0]}". Sessions you can ask:'); [print("-", s["title"]) for s in all_s[:25]]; sys.exit(1)
s = match[0]
if not glob.glob(os.path.join(CONF, "projects", "*", s["id"] + ".jsonl")):
    print(f'"{s["title"]}" has no history in {acct.get("name", "this account")}\'s Claude folder to ask.'); sys.exit(1)

env = {k: v for k, v in os.environ.items() if k not in ("ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CONFIG_DIR")}
if CONF != os.path.join(HOME, ".claude"): env["CLAUDE_CONFIG_DIR"] = CONF
proxy = acct.get("proxy") or {}
if proxy.get("baseUrl"):
    tok = ""
    try:
        if proxy.get("tokenUrl"): tok = json.load(urllib.request.urlopen(proxy["tokenUrl"], timeout=10)).get("token", "")
        elif proxy.get("tokenFile"): tok = open(exp(proxy["tokenFile"])).read().strip()
    except Exception: pass
    if not tok: print("The account's proxy gave no token, so the question couldn't be asked."); sys.exit(1)
    env.update({"ANTHROPIC_BASE_URL": proxy["baseUrl"], "ANTHROPIC_AUTH_TOKEN": tok})
env["PATH"] = os.path.dirname(CLAUDE) + ":/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
prompt = ("(A question from the user, asked through Claudex from a separate chat. You are a private read-only copy of this session: "
          "answer from what you know, look at files if you need to, but change nothing, start nothing and send nothing. Short, plain answer.)\n\n" + question)
cmd = [CLAUDE, "-p", "--resume", s["id"], "--fork-session", "--permission-mode", "plan", "--effort", "low", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--output-format", "json"]
if s["model"]: cmd += ["--model", s["model"]]
cwd = s["cwd"] if os.path.isdir(s["cwd"]) else HOME
p = None
try:
    p = subprocess.run(cmd, input=prompt, capture_output=True, text=True, cwd=cwd, env=env, timeout=900)
    r = json.loads(p.stdout or "{}")
except subprocess.TimeoutExpired:
    print(f'"{s["title"]}" took longer than 15 minutes to answer.'); sys.exit(1)
except Exception:
    print(f'"{s["title"]}" did not answer: {((p.stderr or p.stdout) if p else "").strip()[-300:]}'); sys.exit(1)
if r.get("is_error") or not r.get("result"):
    print(f'"{s["title"]}" did not answer: {str(r.get("result") or p.stderr)[-300:]}'); sys.exit(1)
print(f'{s["title"]} says:\n{r["result"].strip()}')
PY
