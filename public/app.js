/* Claudex page: the Claude desktop Code tab in a browser. Chats on the left, the conversation in the middle, the composer with
   folder, account, model + effort and permission chips under it. Voice: the browser's own speech recognition writes live into the box.
   Wallpapers: themes.js. Everything the server does goes through api() with the x-claudex header (the server refuses anything else). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var LS = { get: function (k, d) { try { var v = localStorage.getItem("cx." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem("cx." + k, JSON.stringify(v)); } catch (e) {} } };
  var P = {
    plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1.1.2-2.2 1.4-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10.5" cy="7" r="1.1"/><circle cx="15" cy="7.5" r="1.1"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', down: '<path d="m6 9 6 6 6-6"/>', right: '<path d="m9 6 6 6-6 6"/>', check: '<path d="m5 12 5 5L20 7"/>',
    monitor: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>', mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    enter: '<path d="M20 5v7a3 3 0 0 1-3 3H5"/><path d="m9 11-4 4 4 4"/>', stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>', retry: '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5"/>',
    pin: '<path d="M12 17v5M9 3h6l-1 6 4 4H6l4-4z"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>', dots: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    read: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    run: '<path d="m5 8 4 4-4 4M12 17h7"/>', web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', search2: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    agent: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>', plan: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    tool: '<path d="M14 7a4 4 0 1 1 3 3l-8 8-3-3 8-8"/>', bolt: '<path d="M13 3 4 14h7l-1 7 9-11h-7z"/>', out: '<path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/>',
    fail: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>', panel: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/>',
    tab: '<path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    speak: '<path d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>', quote: '<path d="M6 17h3l2-4V7H5v6h3zM14 17h3l2-4V7h-6v6h3z"/>', image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    down2: '<path d="M12 4v12M6 11l6 6 6-6M5 20h14"/>', folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', clip: '<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
  };
  var ic = function (n, cls) { return '<svg class="i' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || "") + "</svg>"; };
  var MARK = '<svg class="mark" viewBox="0 0 36 26" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4l10 9-10 9" stroke="#e8e6e3"/><path d="M19 22h13" stroke="#2ec4b6"/></svg>';

  /* ---------- server ---------- */
  function api(url, opt) {
    opt = opt || {}; var h = { "x-claudex": "1" }, body = opt.body;
    if (body && !(body instanceof Blob)) { h["content-type"] = "application/json"; body = JSON.stringify(body); }
    if (opt.type) h["content-type"] = opt.type;
    return fetch(url, { method: opt.method || "GET", headers: h, body: body, credentials: "same-origin" }).then(function (r) {
      if (r.status === 401) { location.reload(); throw new Error("Signed out"); }
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.error) { var e = new Error(j.error || "Something went wrong"); e.status = r.status; throw e; } return j; });
    });
  }

  /* ---------- state ---------- */
  var ST = null, chats = [], cur = null, draft = { cwd: null, settings: null }, pending = [], sending = false, nodes = new Map(), openSteps = new Set();
  var input = $("#input"), thread = $("#thread"), toastT = 0, coarse = matchMedia("(pointer: coarse)").matches;
  var S = function () { return cur ? cur.settings : draft.settings; };
  var CWD = function () { return cur ? cur.cwd : draft.cwd; };
  var acctOf = function (id) { return (ST.accounts || []).find(function (a) { return a.id === id; }) || ST.accounts[0]; };
  var engineIn = function () { var a = acctOf(S().account); return a.engine === "codex" ? "codex" : "claude"; };
  var modelOf = function (e, id) { return (ST.models[e] || []).find(function (m) { return m.id === id; }) || { label: id, efforts: [] }; };
  var modeOf = function (id) { return ST.modes.find(function (m) { return m.id === id; }) || ST.modes[0]; };
  var cap = function (s) { return s === "xhigh" ? "XHigh" : String(s).charAt(0).toUpperCase() + String(s).slice(1); };
  var useCls = function (u) { return u == null ? "none" : u >= 90 ? "full" : u >= 70 ? "warn" : ""; };
  var folderName = function (p) { return String(p || "").split("/").filter(Boolean).pop() || p || "Pick a folder"; };
  function toast(t) { var e = $("#toast"); e.textContent = t; e.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { e.classList.remove("show"); }, 3200); }

  /* ---------- menus ---------- */
  var pop = null;
  function closeMenu() { if (!pop) return; pop.el.remove(); document.removeEventListener("pointerdown", pop.off, true); var a = pop.anchor; pop = null; if (a && a.isConnected && !coarse) a.focus(); }
  function menu(anchor, build) {
    var was = pop && pop.anchor === anchor; closeMenu(); if (was) return;
    var el = document.createElement("div"); el.className = "pop"; el.setAttribute("role", "menu"); document.body.appendChild(el);
    var off = function (e) { if (!el.contains(e.target) && !anchor.contains(e.target)) closeMenu(); };
    pop = { el: el, anchor: anchor, off: off }; build(el); place(el, anchor);
    document.addEventListener("pointerdown", off, true);
    var first = el.querySelector("button:not([aria-disabled=true]),input"); if (first && !coarse) first.focus();
  }
  function place(el, anchor) {
    var r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, vw = innerWidth, vh = innerHeight;
    if (anchor.point) { el.style.left = Math.max(8, r.left + w > vw - 8 ? r.left - w : r.left) + "px"; el.style.top = Math.max(8, r.top + h > vh - 8 ? r.top - h : r.top) + "px"; return; }
    var x = r.left + w > vw - 12 ? r.right - w : r.left; x = Math.max(12, Math.min(x, vw - w - 12));
    var y = r.top > vh / 2 && r.top - h - 8 > 8 ? r.top - h - 8 : r.bottom + 8; y = Math.max(8, Math.min(y, vh - h - 8));
    el.style.left = x + "px"; el.style.top = y + "px";
  }
  function opt(o) {
    var b = document.createElement("button"); b.className = "opt"; b.setAttribute("role", o.radio === false ? "menuitem" : "menuitemradio");
    if (o.radio !== false) b.setAttribute("aria-checked", o.checked ? "true" : "false");
    if (o.disabled) b.setAttribute("aria-disabled", "true");
    if (o.danger) b.classList.add("danger");
    b.innerHTML = (o.icon ? ic(o.icon) : "") + '<span class="t"><span>' + esc(o.label) + "</span>" + (o.sub ? '<span class="sub">' + esc(o.sub) + "</span>" : "") + "</span>" + (o.right || "") + (o.kb ? '<span class="kb">' + esc(o.kb) + "</span>" : "") + (o.radio !== false ? ic("check", "ck") : "");
    b.addEventListener("click", function (e) { if (o.disabled) { if (o.why) toast(o.why); return; } o.onClick(e, b); });
    return b;
  }
  function h4(t) { var h = document.createElement("h4"); h.textContent = t; return h; }
  function sep() { var d = document.createElement("div"); d.className = "sep"; return d; }
  function seg(values, now, onPick, labels) {
    var d = document.createElement("div"); d.className = "seg"; d.setAttribute("role", "radiogroup");
    values.forEach(function (v, i) { var b = document.createElement("button"); b.setAttribute("role", "radio"); b.setAttribute("aria-checked", v === now ? "true" : "false"); b.textContent = labels ? labels[i] : cap(v); b.addEventListener("click", function () { onPick(v); }); d.appendChild(b); });
    return d;
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (pop) closeMenu(); else if ($(".modal")) closeSheet(); else if (listening) stopMic(); } });

  /* ---------- settings changes ---------- */
  function setSettings(patch) {
    var s = JSON.parse(JSON.stringify(S()));
    if (patch.account) s.account = patch.account; if (patch.mode) s.mode = patch.mode;
    ["claude", "codex"].forEach(function (e) { if (patch[e]) s[e] = Object.assign({}, s[e], patch[e]); });
    if (!cur) { draft.settings = s; renderChips(); renderEmpty(); return Promise.resolve(); }
    cur.settings = s; renderChips();
    return api("/api/chats/" + cur.id, { method: "PATCH", body: { settings: s } }).then(function (r) { if (cur && r.chat.id === cur.id) cur.settings = r.chat.settings; ST.prefs = r.chat.settings; renderChips(); }).catch(function (e) { toast(e.message); });
  }
  function setFolder(p) {
    if (!cur) { draft.cwd = p; renderChips(); renderEmpty(); return; }
    api("/api/chats/" + cur.id, { method: "PATCH", body: { cwd: p } }).then(function (r) { cur = r.chat; renderChips(); loadList(); toast("Folder: " + folderName(p)); }).catch(function (e) { toast(e.message); });
  }

  /* ---------- chips + their menus ---------- */
  function renderChips() {
    if (!ST) return; var s = S(), a = acctOf(s.account), e = engineIn(), m = modelOf(e, s[e].model);
    var fc = $("#folderChip"); fc.innerHTML = ic("monitor") + "<span>" + esc(folderName(CWD())) + "</span>" + ic("down", "caret"); fc.title = CWD() || ""; fc.setAttribute("aria-label", "Folder: " + folderName(CWD()));
    var ac = $("#acctChip"); ac.innerHTML = '<span class="dot ' + useCls(a.use) + '"></span><span>' + esc(a.name) + "</span>" + (a.use != null ? '<span class="dim">' + Math.round(a.use) + "%</span>" : ""); ac.setAttribute("aria-label", "Account: " + a.name);
    var mc = $("#modelChip"); mc.innerHTML = "<span>" + esc(m.label) + '</span><span class="dim">' + esc(cap(s[e].effort)) + "</span>"; mc.setAttribute("aria-label", "Model: " + m.label + ", effort " + s[e].effort);
    var oc = $("#modeChip"); oc.innerHTML = "<span>" + esc(modeOf(s.mode).label) + "</span>"; oc.setAttribute("aria-label", "Permissions: " + modeOf(s.mode).label);
    renderQuick(); renderRing(); renderDisk();
  }
  /* how full this chat's conversation is (like the Claude app's ring); tap for Compact now */
  function renderRing() {
    var r = $("#ctxRing"), x = cur && cur.ctx; if (!x || !x.max) { r.hidden = true; return; }
    var pct = Math.min(100, Math.round((x.used / x.max) * 100)), C = 2 * Math.PI * 7;
    r.hidden = false; r.setAttribute("aria-label", "Conversation " + pct + "% full");
    r.title = "Conversation " + pct + "% full";
    r.innerHTML = '<svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7" class="rb"/><circle cx="9" cy="9" r="7" class="rf ' + (pct >= 85 ? "full" : pct >= 60 ? "warn" : "") + '" stroke-dasharray="' + (C * pct / 100).toFixed(1) + " " + C.toFixed(1) + '"/></svg>' + (pct >= 50 ? '<span class="dim">' + pct + "%</span>" : "");
  }
  $("#ctxRing").addEventListener("click", function () {
    var x = cur && cur.ctx; if (!x) return; var pct = Math.min(100, Math.round((x.used / x.max) * 100));
    menu(this, function (el) {
      el.appendChild(h4("Conversation " + pct + "% full · " + Math.round(x.used / 1000) + "k of " + Math.round(x.max / 1000) + "k"));
      el.appendChild(opt({ radio: false, icon: "plan", label: "Compact now", sub: "Summarise and continue fresh", onClick: function () { closeMenu(); compactNow(); } }));
    });
  });
  function compactNow() {
    if (!cur) return; if (cur.busy) return toast("Wait for the reply first.");
    api("/api/chats/" + cur.id + "/compact", { method: "POST" }).then(function () { return refresh(); }).then(function () { toBottom(); schedule(); }).catch(function (e) { toast(e.message); });
  }
  /* a drive running low shows above the account switch; tap for the storage view */
  function renderDisk() {
    var w = $("#diskWarn"), low = (ST.drives || []).filter(function (d) { return d.low; });
    if (!low.length) { w.hidden = true; return; }
    w.hidden = false; var d = low.sort(function (a, b) { return a.free - b.free; })[0];
    w.innerHTML = ic("fail") + "<span>" + esc(d.name || d.path) + " is " + (d.full ? "full" : "low") + ": " + gb(d.free) + " left</span>";
    w.classList.toggle("full", !!d.full);
  }
  var gb = function (n) { return n >= 1e12 ? (n / 1e12).toFixed(1) + " TB" : (n / 1e9).toFixed(n < 10e9 ? 1 : 0) + " GB"; };
  /* bring a Claude app session over with its history; it continues here as a branch */
  function importSheet() {
    closeSide();
    api("/api/desktop-sessions").then(function (r) {
      sheet("Import from Claude app", function (b) {
        if (!r.sessions.length) { b.innerHTML = '<p class="sheet-note">No Claude app sessions found on this Mac.</p>'; return; }
        r.sessions.forEach(function (x) {
          var d = document.createElement("div"); d.className = "acct-row";
          d.innerHTML = '<div><div class="nm">' + esc(x.title) + "</div><small>" + esc(folderName(x.cwd)) + " · " + esc(when2(x.at)) + (x.turns ? " · " + x.turns + " turns" : "") + '</small></div><button class="btn">Import</button>';
          d.querySelector("button").addEventListener("click", function () {
            var bt = this; bt.disabled = true; bt.textContent = "Bringing it in…";
            api("/api/import", { method: "POST", body: { id: x.id } }).then(function (res) { closeSheet(); return loadList().then(function () { return openChat(res.id); }).then(function () { toast("Imported " + res.messages + " messages. Your next message continues it here."); }); })
              .catch(function (e) { bt.disabled = false; bt.textContent = "Import"; toast(e.message); });
          });
          b.appendChild(d);
        });
      });
    }).catch(function (e) { toast(e.message); });
  }
  function when2(ms) { var d = Date.now() - ms, m = Math.round(d / 60e3); return m < 60 ? m + "m ago" : d < 864e5 ? Math.round(m / 60) + "h ago" : new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" }); }
  /* Claudex's replies running right now; refreshes while open */
  var ago = function (ms) { var m = Math.max(0, Math.round((Date.now() - ms) / 60e3)); return m < 1 ? "just now" : m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60) + " min"; };
  function runSheet() {
    closeSide(); var timer = 0;
    sheet("What's running", function (b) {
      var draw = function () {
        if (!document.body.contains(b)) return clearInterval(timer);
        api("/api/running").then(function (r) {
          var sec = function (title, rows, empty) { return '<div class="acct-sec">' + title + "</div>" + (rows.length ? rows.join("") : '<div class="run-empty">' + empty + "</div>"); };
          var row = function (name, sub, right) { return '<div class="acct-row"><div><div class="nm">' + name + "</div><small>" + sub + '</small></div><div class="use"><span>' + right + "</span></div></div>"; };
          b.innerHTML = sec("Claudex replies", r.replies.map(function (x) { return '<button class="acct-row runrow" data-open="' + x.id + '"><div><div class="nm">' + esc(x.title) + "</div><small>" + esc(x.label) + " · " + esc(x.step || "") + '</small></div><div class="use"><span>' + ago(x.since) + "</span></div></button>"; }), "No replies running");
          b.querySelectorAll("[data-open]").forEach(function (el) { el.addEventListener("click", function () { closeSheet(); openChat(el.dataset.open); }); });
          runBadge(r.replies.length);
        }).catch(function (e) { b.textContent = e.message; });
      };
      draw(); timer = setInterval(draw, 5000);
    });
  }
  function runBadge(n) { $("#runNav").innerHTML = ic("agent") + "Running" + (n ? '<span class="kbd runcount">' + n + "</span>" : ""); }
  function pollRun() { api("/api/running").then(function (r) { runBadge(r.replies.length); }).catch(function () {}); }
  $("#runNav").addEventListener("click", runSheet);
  /* Claudex's own name card instead of the browser's plain prompt box */
  function askText(title, value, opts) {
    opts = opts || {};
    return new Promise(function (done) {
      var m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", title);
      m.innerHTML = '<form class="sheet card-ask"><h3>' + esc(title) + "</h3>" + (opts.note ? '<p class="sheet-note">' + esc(opts.note) + "</p>" : "") +
        '<input name="v" autocomplete="off" spellcheck="false" maxlength="' + (opts.max || 100) + '" placeholder="' + esc(opts.placeholder || "") + '" aria-label="' + esc(title) + '">' +
        '<div class="ask-btns">' + (opts.clear ? '<button type="button" class="btn ghost" data-clear>' + esc(opts.clear) + "</button>" : "") + '<span class="grow"></span><button type="button" class="btn" data-cancel>Cancel</button><button class="btn primary">' + esc(opts.ok || "Save") + "</button></div></form>";
      var f = m.querySelector("form"), inp = f.v, end = function (v) { m.remove(); document.removeEventListener("keydown", key, true); done(v); };
      var key = function (e) { if (e.key === "Escape") { e.stopPropagation(); end(null); } };
      inp.value = value || "";
      f.addEventListener("submit", function (e) { e.preventDefault(); var v = inp.value.trim(); if (!v && !opts.allowEmpty) { inp.focus(); return; } end(v); });
      m.addEventListener("click", function (e) { if (e.target === m || e.target.closest("[data-cancel]")) end(null); if (e.target.closest("[data-clear]")) end(""); });
      document.addEventListener("keydown", key, true); document.body.appendChild(m);
      setTimeout(function () { inp.focus(); inp.select(); }, 30);
    });
  }
  function storageSheet() {
    api("/api/state").then(function (s) { ST = s; renderChips();
      sheet("Storage", function (b) {
        (s.drives || []).forEach(function (d) {
          var used = 1 - d.free / d.total, row = document.createElement("div"); row.className = "acct-row";
          row.innerHTML = '<div><div class="nm">' + esc(d.name || d.path) + "</div><small>" + gb(d.free) + " free of " + gb(d.total) + (d.full ? " · jobs and uploads stop here" : d.low ? " · running low" : "") + '</small></div><div class="use"><span>' + Math.round(used * 100) + '% used</span><span class="bar"><i class="' + (d.full ? "full" : d.low ? "warn" : "") + '" style="width:' + Math.round(used * 100) + '%"></i></span></div>';
          b.appendChild(row);
        });
        var n = document.createElement("p"); n.className = "sheet-note"; n.textContent = "Under 5 GB free, Claudex stops starting jobs and saving files on that drive. Its own job logs are cleared after 7 days."; b.appendChild(n);
      });
    }).catch(function (e) { toast(e.message); });
  }
  $("#diskWarn").addEventListener("click", storageSheet);
  /* the bottom of the sidebar: one tap to switch account (Auto, each Claude account, Codex), the profile row opens the full list */
  function renderQuick() {
    var box = $("#quickAcct"); if (!box || !ST) return; var s = S(), a = acctOf(s.account), html = "";
    var pills = [["auto", "Auto"]].concat(ST.accounts.filter(function (x) { return x.engine === "claude"; }).map(function (x) { return [x.id, x.name]; }), ST.accounts.some(function (x) { return x.id === "cx"; }) ? [[a.engine === "codex" ? a.id : "cx", "Codex"]] : []);
    pills.forEach(function (p) {
      var x = acctOf(p[0]), on = p[0] === s.account, u = x.use;
      html += '<button role="radio" aria-checked="' + on + '" data-acct="' + p[0] + '" title="' + esc(x.name + " · " + winText(x)) + '"><span class="nm"><span>' + esc(p[1]) + "</span>" + (u != null ? (u >= 95 && bind(x) && bind(x).at ? "<em>↻ " + whenShort(bind(x).at) + "</em>" : "<em>" + Math.round(u) + "%" + (watching(x.id) ? " 🔔" : "") + "</em>") : "<em>auto</em>") + '</span><span class="bar"><i class="' + useCls(u) + '" style="width:' + (u == null ? 0 : Math.min(100, u)) + '%"></i></span></button>';
    });
    box.innerHTML = html;
    $("#who").textContent = "· " + a.name;
  }
  $("#quickAcct").addEventListener("click", function (e) {
    var b = e.target.closest("[data-acct]"); if (!b) return; var x = acctOf(b.dataset.acct);
    if (b.dataset.acct === S().account && /^cx/.test(b.dataset.acct)) return acctMenu(b);  // tapping the Codex pill again picks which Codex
    setSettings({ account: b.dataset.acct }).then(function () { toast("Now on " + x.name); });
  });
  /* reset times: "in 2h 14m" today, "Thu 2:46 PM" further out; the binding window is the fuller one */
  function when(ms) {
    var d = ms - Date.now(); if (d <= 0) return "now";
    var m = Math.round(d / 60e3); if (m < 60) return "in " + m + "m"; if (d < 864e5) return "in " + Math.floor(m / 60) + "h " + (m % 60) + "m";
    return new Date(ms).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
  }
  function whenShort(ms) { var d = ms - Date.now(), m = Math.round(d / 60e3); return d <= 0 ? "now" : m < 60 ? m + "m" : d < 864e5 ? Math.round(m / 60) + "h" : new Date(ms).toLocaleString([], { weekday: "short" }); }
  function bind(a) { var w = a.win; if (!w) return null; var k = (w.week || 0) >= (w.five || 0) ? "week" : "five"; return { pct: w[k], at: w[k + "At"], label: k === "week" ? "this week" : "in 5 h" }; }
  function winText(a) {
    var b = bind(a); if (!b || b.pct == null) return a.held || a.note;
    return (a.held ? a.held + " · " : "") + Math.round(b.pct) + "% " + b.label + (b.at ? " · resets " + when(b.at) : "");
  }
  /* phone notifications: the browser's own push (Android Chrome; iPhone once Claudex is on the home screen) */
  function b64u8(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); var raw = atob(s + "===".slice((s.length + 3) % 4)), out = new Uint8Array(raw.length); for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i); return out; }
  function ensurePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !window.Notification) return Promise.reject(new Error(/iPhone|iPad/.test(navigator.userAgent) ? "On iPhone, add Claudex to the Home Screen first (Share → Add to Home Screen), then open it from there." : "This browser can't show notifications."));
    return Notification.requestPermission().then(function (p) {
      if (p !== "granted") throw new Error("Notifications are blocked. Allow them for this site in the browser's settings.");
      return navigator.serviceWorker.register("/sw.js").then(function () { return navigator.serviceWorker.ready; });
    }).then(function (reg) { return reg.pushManager.getSubscription().then(function (sub) { return sub || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u8(ST.pushKey) }); }); })
      .then(function (sub) { return api("/api/push/subscribe", { method: "POST", body: { subscription: sub.toJSON() } }); });
  }
  function setWatch(a, on) {
    (on ? ensurePush() : Promise.resolve()).then(function () { return api("/api/watch", { method: "POST", body: { acct: a.id, on: on } }); })
      .then(function (r) { ST.watches = r.watches; renderQuick(); toast(on ? "You'll get a notification when " + a.name + " is back" + (bind(a) && bind(a).at ? " (" + when(bind(a).at) + ")" : "") : "Notification off for " + a.name); if ($(".modal")) acctSheet(); })
      .catch(function (e) { toast(e.message); });
  }
  var watching = function (id) { return !!(ST.watches || {})[id]; };
  function usageBar(a) { return a.use != null ? '<span class="bar"><i class="' + useCls(a.use) + '" style="width:' + Math.min(100, a.use) + '%"></i></span><span class="pct">' + Math.round(a.use) + "%</span>" : ""; }
  function acctMenu(anchor) {
    if (!ST) return toast("Still loading the accounts…");
    menu(anchor, function (el) {
      var s = S();
      var row = function (a) { return opt({ label: a.name, sub: winText(a), checked: s.account === a.id, right: usageBar(a), onClick: function () { closeMenu(); setSettings({ account: a.id }).then(function () { toast("Now on " + a.name); }); } }); };
      [["Account", "auto"], ["Claude", "claude"], ["Codex", "codex"]].forEach(function (g) { el.appendChild(h4(g[0])); ST.accounts.filter(function (a) { return a.engine === g[1]; }).forEach(function (a) { el.appendChild(row(a)); }); });
    });
  }
  function modelMenu(anchor) {
    menu(anchor, function (el) {
      var s = S(), a = acctOf(s.account), engines = a.engine === "auto" ? ["claude", "codex"] : [a.engine];
      engines.forEach(function (e, i) {
        if (i) el.appendChild(sep());
        el.appendChild(h4(e === "claude" ? (engines.length > 1 ? "Claude (first)" : "Claude") : engines.length > 1 ? "Codex (when Claude is used up)" : "Codex"));
        ST.models[e].forEach(function (m) { el.appendChild(opt({ label: m.label, checked: s[e].model === m.id, onClick: function () { var p = {}; p[e] = { model: m.id }; setSettings(p).then(function () { closeMenu(); modelMenu(anchor); }); } })); });
        el.appendChild(h4("Effort"));
        el.appendChild(seg(modelOf(e, s[e].model).efforts, s[e].effort, function (v) { var p = {}; p[e] = { effort: v }; setSettings(p).then(function () { closeMenu(); modelMenu(anchor); }); }));
      });
    });
  }
  function modeMenu(anchor) {
    menu(anchor, function (el) {
      el.appendChild(h4("Permissions"));
      ST.modes.forEach(function (m) { el.appendChild(opt({ label: m.label, sub: m.note, checked: S().mode === m.id, onClick: function () { closeMenu(); setSettings({ mode: m.id }); } })); });
    });
  }
  function folderMenu(anchor) {
    menu(anchor, function (el) {
      el.appendChild(h4("Folder"));
      var list = ST.folders.slice(0, 12); if (CWD() && !list.some(function (f) { return f.path === CWD(); })) list.unshift({ path: CWD(), name: folderName(CWD()) });
      list.forEach(function (f) { el.appendChild(opt({ icon: "monitor", label: folderName(f.path), sub: f.path, checked: f.path === CWD(), onClick: function () { closeMenu(); setFolder(f.path); } })); });
      el.appendChild(sep());
      var form = document.createElement("form"); form.className = "pathform";
      form.innerHTML = '<input name="p" placeholder="Paste a folder path" aria-label="Folder path" autocomplete="off" spellcheck="false"><button class="btn">Open</button>';
      form.addEventListener("submit", function (ev) { ev.preventDefault(); var v = form.p.value.trim(); if (!v) return; api("/api/folder?path=" + encodeURIComponent(v)).then(function (r) { closeMenu(); setFolder(r.path); }).catch(function (e) { toast(e.message); }); });
      el.appendChild(form);
    });
  }
  $("#folderChip").addEventListener("click", function () { folderMenu(this); });
  $("#acctChip").addEventListener("click", function () { acctMenu(this); });
  $("#modelChip").addEventListener("click", function () { modelMenu(this); });
  $("#modeChip").addEventListener("click", function () { modeMenu(this); });

  /* ---------- empty state (new chat): the Claudex mark over the folder card ---------- */
  function renderEmpty() {
    var box = $("#empty"); if (cur && cur.messages.length) { box.hidden = true; return; } box.hidden = false;
    var list = ST.folders.slice(0, 3); if (CWD() && !list.some(function (f) { return f.path === CWD(); })) list = [{ path: CWD(), name: folderName(CWD()) }].concat(list.slice(0, 2));
    var autoOn = S().mode === "auto";
    box.innerHTML = '<div class="envwrap">' + MARK + '<div class="card env" role="radiogroup" aria-label="Folder">' +
      list.map(function (f) { return '<button class="row" role="radio" aria-checked="' + (f.path === CWD()) + '" data-p="' + esc(f.path) + '" title="' + esc(f.path) + '">' + ic("monitor") + '<span class="t">' + esc(folderName(f.path)) + "</span>" + ic("check", "ck") + "</button>"; }).join("") +
      '<div class="sep"></div><button class="row choose" id="chooseF"><span class="t">Choose folder</span>' + ic("down", "caret") + "</button></div>" +
      '<button class="card autocard" id="autoCard">' + ic("bolt") + "<span>" + (autoOn ? "Auto mode is on" : "Turn on auto mode") + "</span></button></div>";
    box.querySelectorAll("[data-p]").forEach(function (b) { b.addEventListener("click", function () { setFolder(b.dataset.p); }); });
    $("#chooseF").addEventListener("click", function () { folderMenu(this); });
    $("#autoCard").addEventListener("click", function () { setSettings({ mode: autoOn ? "bypassPermissions" : "auto" }); });
  }

  /* ---------- messages ---------- */
  var KIND = { read: "read", edit: "edit", run: "run", search: "search2", web: "web", agent: "agent", plan: "plan", tool: "tool", image: "image" };
  function textOf(m) { return (m.parts || []).filter(function (p) { return p.t === "text"; }).map(function (p) { return p.text; }).join("\n\n"); }
  function youNode(m) {
    var n = document.createElement("div"); n.className = "msg you"; n.dataset.mid = m.id;
    var files = (m.files || []).map(function (f) { return f.image ? '<a class="file pic" href="/up/' + esc(f.id) + '" target="_blank" rel="noopener"><img src="/up/' + esc(f.id) + '" alt="' + esc(f.name) + '" loading="lazy"></a>' : '<a class="file" href="/up/' + esc(f.id) + '" target="_blank" rel="noopener">' + ic("clip") + "<span>" + esc(f.name) + "</span></a>"; }).join("");
    n.innerHTML = m.compact ? '<div class="bubble compactreq">' + ic("plan") + "Compact the conversation</div>" : (m.from ? '<div class="recv">📨 Message received from ' + esc(m.from) + " · " + new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + "</div>" : "") + (files ? '<div class="files">' + files + "</div>" : "") + (m.text ? '<div class="bubble' + (m.from ? " other" : "") + '">' + esc(m.text) + "</div>" : "");
    return n;
  }
  function stepsNode(m, gi, steps, running) {
    var d = document.createElement("details"); d.className = "steps"; var key = m.id + ":" + gi;
    if (openSteps.has(key) || running) d.open = true;
    var last = steps[steps.length - 1], k = steps.length;
    d.innerHTML = "<summary>" + ic("right") + "<span>" + (running ? esc(last.text) : k + (k === 1 ? " step" : " steps")) + "</span></summary>" +
      steps.map(function (s) { var icon = s.state === "fail" ? "fail" : KIND[s.kind] || "tool"; return '<div class="step ' + (s.state || "") + '">' + (s.state === "run" ? '<span class="spin" style="margin-top:3px"></span>' : ic(icon)) + '<span class="tx">' + esc(s.text) + (s.detail && s.kind === "run" ? '<span class="cmd">' + esc(s.detail) + "</span>" : "") + "</span></div>"; }).join("");
    d.addEventListener("toggle", function () { if (d.open) openSteps.add(key); else openSteps.delete(key); });
    return d;
  }
  function copy(t, done) { navigator.clipboard.writeText(t).then(function () { toast(done || "Copied"); }, function () { toast("Couldn't copy"); }); }
  function codeCopy(root) { root.querySelectorAll("pre.mdcode").forEach(function (pre) { var b = document.createElement("button"); b.className = "cc"; b.type = "button"; b.textContent = "Copy"; b.addEventListener("click", function (e) { e.stopPropagation(); copy(pre.querySelector("code").textContent, "Code copied"); }); pre.appendChild(b); }); }
  /* pictures, videos and sound a reply made or named: a grid under it, tap a picture for the viewer */
  var mediaUrl = function (m, i) { return "/media/" + cur.id + "/" + m.id + "/" + i; };
  function mediaNode(m) {
    var g = document.createElement("div"); g.className = "media" + (m.media.length === 1 ? " one" : "");
    m.media.forEach(function (f, i) {
      var u = mediaUrl(m, i), d = document.createElement("figure"); d.className = "mf " + f.kind; d.title = f.path;
      if (f.kind === "image") d.innerHTML = '<button class="thumb" aria-label="Open ' + esc(f.name) + '"><img src="' + u + '" alt="' + esc(f.name) + '" loading="lazy"></button>';
      else if (f.kind === "video") d.innerHTML = '<video src="' + u + '" controls preload="metadata" playsinline></video>';
      else d.innerHTML = '<audio src="' + u + '" controls preload="none"></audio>';
      d.insertAdjacentHTML("beforeend", '<figcaption><span>' + esc(f.name) + '</span><a class="save" href="' + u + '" download="' + esc(f.name) + '" aria-label="Save ' + esc(f.name) + '" title="Save">' + ic("down2") + "</a></figcaption>");
      var b = d.querySelector(".thumb"); if (b) b.addEventListener("click", function () { viewer(m, i); });
      g.appendChild(d);
    });
    return g;
  }
  function viewer(m, i) {
    var pics = m.media.map(function (f, k) { return { f: f, k: k }; }).filter(function (x) { return x.f.kind === "image"; }), at = pics.findIndex(function (x) { return x.k === i; });
    var v = document.createElement("div"); v.className = "viewer"; v.setAttribute("role", "dialog"); v.setAttribute("aria-modal", "true");
    var draw = function () {
      var x = pics[at], u = mediaUrl(m, x.k);
      v.innerHTML = '<div class="vbar"><span class="vname">' + esc(x.f.name) + (pics.length > 1 ? " · " + (at + 1) + "/" + pics.length : "") + '</span><a class="icon" href="' + u + '" target="_blank" rel="noopener" aria-label="Open full size">' + ic("tab") + '</a><a class="icon" href="' + u + '" download="' + esc(x.f.name) + '" aria-label="Save">' + ic("down2") + '</a><button class="icon" data-x aria-label="Close">' + ic("x") + "</button></div>" +
        '<div class="vstage">' + (pics.length > 1 ? '<button class="icon vnav" data-p aria-label="Previous">' + ic("right") + "</button>" : "") + '<img src="' + u + '" alt="' + esc(x.f.name) + '">' + (pics.length > 1 ? '<button class="icon vnav" data-n aria-label="Next">' + ic("right") + "</button>" : "") + "</div>";
      v.querySelector("[data-x]").focus();
    };
    var close = function () { v.remove(); document.removeEventListener("keydown", key, true); };
    var go = function (d) { at = (at + d + pics.length) % pics.length; draw(); };
    var key = function (e) { if (e.key === "Escape") { e.stopPropagation(); close(); } if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    v.addEventListener("click", function (e) { if (e.target.closest("[data-x]") || e.target === v || e.target.classList.contains("vstage")) close(); else if (e.target.closest("[data-n]")) go(1); else if (e.target.closest("[data-p]")) go(-1); });
    document.addEventListener("keydown", key, true); document.body.appendChild(v); draw();
  }
  var PIC_ASK = /\b(pictures?|images?|photos?|draw|drawing|logos?|icons?|illustrations?|posters?|thumbnails?|stills?|sprites?|artwork|wallpapers?)\b/i;
  function aiNode(m, live, isLast, askPic) {
    var n = document.createElement("div"); n.className = "msg ai"; n.dataset.mid = m.id;
    var parts = m.parts || [], i = 0, gi = 0;
    while (i < parts.length) {
      var p = parts[i];
      if (p.t === "step") { var g = []; while (i < parts.length && parts[i].t === "step") g.push(parts[i++]); n.appendChild(stepsNode(m, gi++, g, m.running && i === parts.length)); continue; }
      var d = document.createElement("div");
      if (p.t === "text") { d.className = "md"; d.innerHTML = window.md(p.text); codeCopy(d); }
      else if (p.t === "note") { d.className = "note"; d.textContent = p.text; }
      else if (p.t === "error") { d.className = "err"; d.innerHTML = "<span>" + esc(p.text) + "</span>" + (isLast && !m.running ? '<button class="btn" data-retry>' + ic("retry") + "Send again</button>" : ""); }
      n.appendChild(d); i++;
    }
    if (m.media && m.media.length) n.appendChild(mediaNode(m));
    var making = m.running && (m.parts || []).filter(function (p) { return p.t === "step" && p.kind === "image" && p.state === "run"; });
    /* Codex's own picture tool sends nothing while it draws: when the message asked for a picture, show the placeholder until the file lands */
    if (making && !making.length && askPic && !(m.parts || []).some(function (p) { return p.t === "step" && /generated_images/.test(p.detail || p.text || ""); })) making = [1];
    if (making && making.length) {
      var gr = document.createElement("div"); gr.className = "media";
      making.forEach(function () { gr.insertAdjacentHTML("beforeend", '<figure class="mf gen"><div class="genbox"><span class="gtx">Making a picture · <span class="el" data-start="' + (live ? live.started : Date.now()) + '"></span></span><button class="btn gstop" data-stop>' + ic("stop") + "Stop</button></div></figure>"); });
      n.appendChild(gr);
    }
    if (m.running) {
      if (live && live.text) { var lt = document.createElement("div"); lt.className = "md"; lt.innerHTML = window.md(live.text); n.appendChild(lt); }
      var l = document.createElement("div"); l.className = "live";
      l.innerHTML = '<span class="star" aria-hidden="true">✻</span><span>' + esc(live ? live.step : "Starting") + '…</span><span class="lbl"><span class="el" data-start="' + (live ? live.started : Date.now()) + '"></span>' + (live && live.label ? " · " + esc(live.label) : "") + "</span>";
      n.appendChild(l);
    } else {
      var meta = document.createElement("div"); meta.className = "meta";
      meta.innerHTML = '<button class="icon" data-copy aria-label="Copy">' + ic("copy") + "</button>" + (isLast ? '<button class="icon" data-retry aria-label="Send again">' + ic("retry") + "</button>" : "") + (m.label ? '<span class="lab">' + esc(m.label) + (m.done && m.t0 ? " · " + dur(m.done - m.t0) : "") + "</span>" : "");
      n.appendChild(meta);
    }
    n.addEventListener("click", function (e) {
      if (e.target.closest("[data-copy]")) navigator.clipboard.writeText(textOf(m)).then(function () { toast("Copied"); }, function () { toast("Couldn't copy"); });
      if (e.target.closest("[data-retry]")) retry();
      if (e.target.closest("[data-stop]")) stop();
    });
    return n;
  }
  var showAll = {};  // chats where "Show earlier messages" was tapped
  var lastParam = function () { return cur && showAll[cur.id] ? "?last=400" : ""; };
  function renderMsgs() {
    var box = $("#msgs"), ms = cur ? cur.messages : [];
    var more = $("#moreMsgs"); if (cur && cur.total > ms.length) { if (!more) { more = document.createElement("button"); more.id = "moreMsgs"; more.className = "newfold moremsgs"; more.addEventListener("click", function () { showAll[cur.id] = true; var h = thread.scrollHeight; refresh().then(function () { thread.scrollTop = thread.scrollHeight - h; }); }); } more.innerHTML = ic("down2") + "Show " + (cur.total - ms.length) + " earlier messages"; if (box.firstChild !== more) box.insertBefore(more, box.firstChild); } else if (more) more.remove();
    box.hidden = !ms.length; var keep = new Set(), prev = null;
    ms.forEach(function (m, i) {
      var isLast = i === ms.length - 1, live = isLast && m.running && cur.live ? cur.live : null;
      var sig = m.who === "you" ? "y" : JSON.stringify([(m.parts || []).map(function (p) { return p.t + (p.state || "") + (p.text || "").length; }), (m.media || []).length, m.running, m.failed, isLast, live && [live.text.length, live.step, live.label]]);
      var rec = nodes.get(m.id);
      if (!rec || rec.sig !== sig) { var prevYou = i > 0 && ms[i - 1].who === "you" ? ms[i - 1].text || "" : ""; var nn = m.who === "you" ? youNode(m) : aiNode(m, live, isLast, PIC_ASK.test(prevYou)); if (rec) rec.node.replaceWith(nn); rec = { sig: sig, node: nn }; nodes.set(m.id, rec); }
      var anchor = prev ? prev.nextSibling : ($("#moreMsgs") ? $("#moreMsgs").nextSibling : box.firstChild);
      if (rec.node.previousSibling !== (prev || $("#moreMsgs")) || rec.node.parentNode !== box) box.insertBefore(rec.node, anchor);
      prev = rec.node; keep.add(m.id);
    });
    nodes.forEach(function (r, id) { if (!keep.has(id)) { r.node.remove(); nodes.delete(id); } });
    tick();
  }
  function dur(ms) { var s = Math.max(0, Math.round(ms / 1000)); return s < 60 ? s + "s" : Math.floor(s / 60) + "m " + (s % 60) + "s"; }
  function tick() { document.querySelectorAll(".el[data-start]").forEach(function (e) { var s = Math.max(0, Math.round((Date.now() - +e.dataset.start) / 1000)); e.textContent = s < 60 ? s + "s" : Math.floor(s / 60) + "m " + (s % 60) + "s"; }); }
  setInterval(tick, 1000);
  var nearBottom = function () { return thread.scrollHeight - thread.scrollTop - thread.clientHeight < 140; };
  var toBottom = function () { thread.scrollTop = thread.scrollHeight; };
  function renderTitle() { $("#title").innerHTML = "<span>" + esc(cur ? cur.title : "New session") + "</span>" + (cur ? ic("down") : ""); document.title = cur ? cur.title + " · Claudex" : "Claudex"; }
  function renderSend() {
    var has = !!(input.value.trim() || pending.length), stopMode = cur && cur.busy && !has, b = $("#sendBtn");
    b.className = "icon" + (stopMode ? " stop" : ""); b.innerHTML = ic(stopMode ? "stop" : "enter"); b.setAttribute("aria-label", stopMode ? "Stop" : cur && cur.busy ? "Queue a follow-up" : "Send");
    b.disabled = !stopMode && !has;
  }
  /* follow-ups typed while a reply runs: they wait here and go out by themselves when it finishes */
  function renderQueue() {
    var box = $("#queued"), q = (cur && cur.queue) || [];
    box.innerHTML = q.map(function (x, i) { return '<div class="msg you queued"><div class="qhead">' + ic("plan") + (x.from ? "From " + esc(x.from) + " · queued" : "Queued") + (i === 0 ? " · goes out next" : " · " + (i + 1) + " in line") + '<button class="btn" data-qnow="' + x.id + '">Send now</button><button class="icon" data-qdel="' + x.id + '" aria-label="Remove this follow-up">' + ic("x") + '</button></div><div class="bubble">' + esc(x.text) + (x.files ? " (+" + x.files + " file" + (x.files > 1 ? "s" : "") + ")" : "") + "</div></div>"; }).join("");
  }
  $("#queued").addEventListener("click", function (e) {
    var now = e.target.closest("[data-qnow]"), del = e.target.closest("[data-qdel]"); if (!cur || !(now || del)) return;
    var qid = (now || del).dataset[now ? "qnow" : "qdel"];
    api("/api/chats/" + cur.id + "/queue/" + qid + (now ? "/now" : ""), { method: now ? "POST" : "DELETE" }).then(function () { if (now) toast("Stopping the reply and sending it…"); return refresh(); }).then(schedule).catch(function (x) { toast(x.message); });
  });
  function renderAll() { var stick = nearBottom(); renderTitle(); renderChips(); renderEmpty(); renderMsgs(); renderQueue(); renderSend(); renderList(); if (stick) toBottom(); }

  /* ---------- sidebar ---------- */
  /* sidebar, like the Claude app: Pinned, your folders, then projects (or dates); sub-sessions hang under their parent chat with a tree line */
  var sideFolders = [];
  function itemHtml(c, kids, depth) {
    var ks = kids[c.id] || [], open = LS.get("kids." + c.id, true);
    var h = '<div class="item' + (cur && cur.id === c.id ? " on" : "") + (depth ? " child" : "") + '" style="--d:' + depth + '" role="button" tabindex="0" draggable="true" data-id="' + c.id + '" title="' + esc(c.title) + '">' +
      (ks.length ? '<button class="kid" data-kids="' + c.id + '" aria-expanded="' + open + '" aria-label="' + (open ? "Hide" : "Show") + ' sub-sessions">' + ic("down") + "</button>" : depth ? '<span class="tree" aria-hidden="true"></span>' : ic("code")) +
      '<span class="t">' + esc(c.title) + "</span>" + (c.lastFrom && c.lastFrom.at > LS.get("seen." + c.id, 0) && !(cur && cur.id === c.id) ? '<span class="unread" title="New message from ' + esc(c.lastFrom.from) + '" aria-label="New message from ' + esc(c.lastFrom.from) + '"></span>' : "") + (c.busy ? '<span class="spin" aria-label="Working"></span>' : "") + '<button class="more" aria-label="Chat options" aria-haspopup="menu">' + ic("dots") + "</button></div>";
    if (ks.length && open) ks.forEach(function (k) { h += itemHtml(k, kids, depth + 1); });
    return h;
  }
  function renderList() {
    var q = ($("#search").value || "").toLowerCase(), box = $("#chatList"), html = "";
    if (q) { chats.filter(function (c) { return c.title.toLowerCase().indexOf(q) >= 0; }).forEach(function (c) { html += itemHtml(c, {}, 0); }); box.innerHTML = html || '<div class="side-empty">Nothing matches.</div>'; return; }
    var ids = {}, kids = {}; chats.forEach(function (c) { ids[c.id] = 1; });
    chats.forEach(function (c) { if (c.parent && ids[c.parent]) (kids[c.parent] = kids[c.parent] || []).push(c); });
    var top = chats.filter(function (c) { return !(c.parent && ids[c.parent]); });
    var group = function (key, label, items, attrs, plus) {
      var open = LS.get("grp." + key, true);
      html += '<div class="ghead"' + attrs + '><button class="grp" data-grp="' + esc(key) + '" aria-expanded="' + open + '">' + label + ic("down") + "</button>" + (plus ? '<button class="padd" data-new aria-label="New chat here" title="New chat here">' + ic("plus") + "</button>" : "") + "</div>";
      if (open) items.forEach(function (c) { html += itemHtml(c, kids, 0); });
    };
    var pinned = top.filter(function (c) { return c.pinned; }), rest = top.filter(function (c) { return !c.pinned; });
    if (pinned.length) group("pinned", "Pinned", pinned, ' data-pin="1"');
    sideFolders.forEach(function (f) { group("f:" + f.id, ic("folder") + '<span class="gname">' + esc(f.name) + "</span>", rest.filter(function (c) { return c.folder === f.id; }), ' data-folder="' + f.id + '"', true); });
    rest = rest.filter(function (c) { return !c.folder; });
    if (LS.get("groupBy", "project") === "project") {
      var by = {}, order = [];
      rest.forEach(function (c) { if (!by[c.cwd]) { by[c.cwd] = []; order.push(c.cwd); } by[c.cwd].push(c); });
      order.sort(function (a, b) { return by[b][0].updated - by[a][0].updated; });
      order.forEach(function (cwd) { group("p:" + cwd, ic("monitor") + '<span class="gname">' + esc(folderName(cwd)) + "</span>", by[cwd], ' data-cwd="' + esc(cwd) + '" title="' + esc(cwd) + '"', true); });
    } else {
      var d0 = new Date(); d0.setHours(0, 0, 0, 0); var t0 = d0.getTime(), day = 864e5, when = function (lo, hi) { return rest.filter(function (c) { return c.updated >= lo && c.updated < hi; }); };
      [["today", "Today", when(t0, Infinity)], ["yday", "Yesterday", when(t0 - day, t0)], ["week", "Previous 7 days", when(t0 - 7 * day, t0 - day)], ["older", "Older", when(0, t0 - 7 * day)]].forEach(function (g) { if (g[2].length) group(g[0], g[1], g[2], ""); });
    }
    html += '<button class="newfold" data-newfold>' + ic("plus") + 'New folder</button><button class="newfold" data-import>' + ic("down2") + "Import from Claude app</button>";
    box.innerHTML = html;
  }
  function setGroupBy(m) { LS.set("groupBy", m); renderList(); toast(m === "project" ? "Grouped by project" : "Grouped by date"); }
  function newChatIn(cwd) { newChat(); setFolder(cwd); }
  function newChatInFolder(fid) { api("/api/chats", { method: "POST", body: { folder: fid, cwd: CWD(), settings: S() } }).then(function (c) { loadList(); openChat(c.id); }).catch(function (x) { toast(x.message); }); }
  function newSub(pid) { api("/api/chats", { method: "POST", body: { parent: pid } }).then(function (c) { LS.set("kids." + pid, true); loadList(); openChat(c.id); toast("Sub-session started"); }).catch(function (x) { toast(x.message); }); }
  function patchChat(id, body, done) { return api("/api/chats/" + id, { method: "PATCH", body: body }).then(function (r) { if (cur && cur.id === id) { cur = r.chat; renderChips(); } loadList(); if (done) toast(done); }).catch(function (x) { toast(x.message); }); }
  function newFolder(thenChat) {
    askText("New folder", "", { placeholder: "Folder name", ok: "Make folder", max: 40 }).then(function (t) { if (!t) return;
    api("/api/folders", { method: "POST", body: { name: t.trim() } }).then(function (f) { return loadList().then(function () { if (thenChat) patchChat(thenChat, { folder: f.id, parent: null }, "Moved to " + f.name); else toast("Folder made: " + f.name); }); }).catch(function (x) { toast(x.message); }); });
  }
  function folderMenu2(anchor, fid) {
    var f = sideFolders.find(function (x) { return x.id === fid; }); if (!f) return;
    menu(anchor, function (el) {
      el.appendChild(opt({ radio: false, icon: "plus", label: "New chat here", onClick: function () { closeMenu(); newChatInFolder(fid); } }));
      el.appendChild(opt({ radio: false, icon: "pencil", label: "Rename", onClick: function () { closeMenu(); askText("Rename folder", f.name, { ok: "Rename", max: 40 }).then(function (t) { if (t) api("/api/folders/" + fid, { method: "PATCH", body: { name: t } }).then(function () { loadList(); toast("Folder renamed: " + t); }).catch(function (x) { toast(x.message); }); });} }));
      el.appendChild(sep());
      var armed = false;
      el.appendChild(opt({ radio: false, icon: "trash", label: "Delete folder", danger: true, onClick: function (e, b) { if (!armed) { armed = true; b.querySelector(".t span").textContent = "Tap again (chats stay)"; return; } closeMenu(); api("/api/folders/" + fid, { method: "DELETE" }).then(function () { loadList(); toast("Folder deleted; its chats went back to their projects"); }).catch(function (x) { toast(x.message); }); } }));
    });
  }
  $("#chatList").addEventListener("click", function (e) {
    if (e.target.closest("[data-newfold]")) return newFolder();
    if (e.target.closest("[data-import]")) return importSheet();
    var kb = e.target.closest("[data-kids]"); if (kb) { e.stopPropagation(); LS.set("kids." + kb.dataset.kids, kb.getAttribute("aria-expanded") !== "true"); return renderList(); }
    var nw = e.target.closest("[data-new]"); if (nw) { var gh = nw.closest(".ghead"); return gh.dataset.folder ? newChatInFolder(gh.dataset.folder) : newChatIn(gh.dataset.cwd); }
    var g = e.target.closest("[data-grp]"); if (g) { LS.set("grp." + g.dataset.grp, g.getAttribute("aria-expanded") !== "true"); return renderList(); }
    var it = e.target.closest(".item"); if (!it) return;
    if (e.target.closest(".more")) return chatMenu(e.target.closest(".more"), it.dataset.id);
    openChat(it.dataset.id);
  });
  /* drag a chat onto: a project (moves it there), a folder (files it), Pinned, or another chat (becomes its sub-session);
     drop files from the computer onto a project (copied into that folder) */
  var CHAT_T = "application/x-claudex-chat", hasT = function (e, t) { return e.dataTransfer && [].indexOf.call(e.dataTransfer.types, t) >= 0; }, dragId = "";
  var targetOf = function (e) { return e.target.closest(".ghead[data-cwd], .ghead[data-pin], .ghead[data-folder], .item"); };
  $("#chatList").addEventListener("dragstart", function (e) { var it = e.target.closest(".item"); if (!it) return; dragId = it.dataset.id; e.dataTransfer.setData(CHAT_T, it.dataset.id); e.dataTransfer.effectAllowed = "move"; it.classList.add("dragging"); });
  $("#chatList").addEventListener("dragend", function () { dragId = ""; document.querySelectorAll(".dragging,.drop").forEach(function (x) { x.classList.remove("dragging", "drop"); }); });
  $("#chatList").addEventListener("dragover", function (e) {
    var h = targetOf(e); document.querySelectorAll("#chatList .drop").forEach(function (x) { if (x !== h) x.classList.remove("drop"); });
    if (!h) return; var chat = hasT(e, CHAT_T), files = hasT(e, "Files");
    if (h.classList.contains("item") ? !chat || h.dataset.id === dragId : !(chat || (files && h.dataset.cwd))) return;
    e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = chat ? "move" : "copy"; h.classList.add("drop");
  });
  $("#chatList").addEventListener("drop", function (e) {
    var h = targetOf(e); if (!h) return; e.preventDefault(); e.stopPropagation(); h.classList.remove("drop");
    var id = e.dataTransfer.getData(CHAT_T);
    if (id && h.classList.contains("item")) { if (id !== h.dataset.id) { LS.set("kids." + h.dataset.id, true); patchChat(id, { parent: h.dataset.id }, "Now a sub-session"); } return; }
    if (id && h.dataset.pin) return patchChat(id, { pinned: true, parent: null }, "Pinned");
    if (id && h.dataset.folder) { var f = sideFolders.find(function (x) { return x.id === h.dataset.folder; }); return patchChat(id, { folder: h.dataset.folder, parent: null, pinned: false }, "Moved to " + (f ? f.name : "folder")); }
    if (id) return moveChat(id, h.dataset.cwd);
    if (e.dataTransfer.files.length && h.dataset.cwd) dropInto(h.dataset.cwd, e.dataTransfer.files);
  });
  function moveChat(id, cwd) {
    var c = chats.find(function (x) { return x.id === id; }); if (c && c.cwd === cwd && !c.pinned && !c.folder && !c.parent) return;
    patchChat(id, { cwd: cwd, pinned: false, folder: null, parent: null }, "Moved to " + folderName(cwd));
  }
  function dropInto(cwd, files) {
    var list = [].slice.call(files || []), done = 0, names = [];
    if (!list.length) return; toast("Copying " + list.length + (list.length === 1 ? " file" : " files") + " to " + folderName(cwd) + "…");
    list.forEach(function (f) {
      if (f.size > 500e6) { toast(f.name + " is over 500 MB"); return; }
      api("/api/drop?dir=" + encodeURIComponent(cwd) + "&name=" + encodeURIComponent(f.name), { method: "POST", body: f, type: "application/octet-stream" })
        .then(function (r) { names.push(r.name); }).catch(function (x) { toast(x.message); })
        .then(function () { if (++done === list.length && names.length) toast("Copied to " + folderName(cwd) + ": " + names.join(", ")); });
    });
  }
  function pickInto(cwd) { var i = document.createElement("input"); i.type = "file"; i.multiple = true; i.onchange = function () { dropInto(cwd, i.files); }; i.click(); }
  function renameFolder(cwd) {
    askText("Rename this folder", folderName(cwd), { ok: "Rename", max: 40, allowEmpty: true, clear: "Show real name", note: "The new name shows everywhere in Claudex instead of the real one." }).then(function (t) { if (t == null) return;
    api("/api/nickname", { method: "POST", body: { path: cwd, name: t.trim() } })
      .then(function () { return api("/api/state"); }).then(function (s) { ST = s; return Promise.all([loadList(), cur ? refresh() : null]); })
      .then(function () { if (!cur) { draft.cwd = ST.folders[0] ? draft.cwd : draft.cwd; } renderAll(); toast(t.trim() ? "Now shown as " + t.trim() : "Real name shown again"); })
      .catch(function (x) { toast(x.message); }); });
  }
  function projectMenu(anchor, cwd) {
    menu(anchor, function (el) {
      el.appendChild(opt({ radio: false, icon: "plus", label: "New chat here", onClick: function () { closeMenu(); newChatIn(cwd); } }));
      el.appendChild(opt({ radio: false, icon: "pencil", label: "Rename", onClick: function () { closeMenu(); renameFolder(cwd); } }));
      el.appendChild(opt({ radio: false, icon: "clip", label: "Add files to this folder", onClick: function () { closeMenu(); pickInto(cwd); } }));
      el.appendChild(sep());
      el.appendChild(opt({ radio: false, icon: "plan", label: LS.get("groupBy", "project") === "project" ? "Group chats by date" : "Group chats by project", onClick: function () { closeMenu(); setGroupBy(LS.get("groupBy", "project") === "project" ? "date" : "project"); } }));
    });
  }
  $("#chatList").addEventListener("keydown", function (e) { var it = e.target.closest(".item"); if (it && e.target === it && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openChat(it.dataset.id); } });
  function chatMenu(anchor, id) {
    var c = chats.find(function (x) { return x.id === id; }) || (cur && cur.id === id ? cur : null); if (!c) return;
    menu(anchor, function (el) {
      if (!cur || cur.id !== id) el.appendChild(opt({ radio: false, icon: "code", label: "Open", onClick: function () { closeMenu(); openChat(id); } }));
      el.appendChild(opt({ radio: false, icon: "tab", label: "Open in new tab", onClick: function () { closeMenu(); window.open(location.pathname + "#" + id, "_blank", "noopener"); } }));
      el.appendChild(opt({ radio: false, icon: "link", label: "Copy link", onClick: function () { closeMenu(); copy(location.origin + location.pathname + "#" + id, "Link copied"); } }));
      el.appendChild(sep());
      el.appendChild(opt({ radio: false, icon: "pencil", label: "Rename", onClick: function () { closeMenu(); rename(id, c.title); } }));
      el.appendChild(opt({ radio: false, icon: "agent", label: "New sub-session", onClick: function () { closeMenu(); newSub(id); } }));
      el.appendChild(opt({ radio: false, icon: "monitor", label: "Move to project", onClick: function () { closeMenu(); moveMenu(anchor, id); } }));
      el.appendChild(opt({ radio: false, icon: "folder", label: "Move to folder", onClick: function () { closeMenu(); moveFolderMenu(anchor, id); } }));
      if (c.parent) el.appendChild(opt({ radio: false, icon: "out", label: "Move out of its parent", onClick: function () { closeMenu(); patchChat(id, { parent: null }, "Moved out"); } }));
      el.appendChild(opt({ radio: false, icon: "pin", label: c.pinned ? "Unpin" : "Pin", onClick: function () { closeMenu(); api("/api/chats/" + id, { method: "PATCH", body: { pinned: !c.pinned } }).then(function () { if (cur && cur.id === id) cur.pinned = !c.pinned; loadList(); }).catch(function (e) { toast(e.message); }); } }));
      el.appendChild(sep());
      var armed = false;
      el.appendChild(opt({ radio: false, icon: "trash", label: "Delete", danger: true, onClick: function (e, b) {
        if (!armed) { armed = true; b.querySelector(".t span").textContent = "Tap again to delete"; return; }
        closeMenu(); api("/api/chats/" + id, { method: "DELETE" }).then(function () { if (cur && cur.id === id) newChat(); loadList(); toast("Chat deleted"); }).catch(function (e) { toast(e.message); });
      } }));
    });
  }
  function moveFolderMenu(anchor, id) {
    var c = chats.find(function (x) { return x.id === id; }) || cur;
    menu(anchor, function (el) {
      el.appendChild(h4("Move to folder"));
      sideFolders.forEach(function (f) { el.appendChild(opt({ icon: "folder", label: f.name, checked: c && c.folder === f.id, onClick: function () { closeMenu(); patchChat(id, { folder: f.id, parent: null, pinned: false }, "Moved to " + f.name); } })); });
      if (c && c.folder) el.appendChild(opt({ radio: false, icon: "out", label: "Take out of the folder", onClick: function () { closeMenu(); patchChat(id, { folder: null }, "Taken out"); } }));
      el.appendChild(opt({ radio: false, icon: "plus", label: "New folder", onClick: function () { closeMenu(); newFolder(id); } }));
    });
  }
  function moveMenu(anchor, id) {
    var c = chats.find(function (x) { return x.id === id; }) || cur, seen = {}, list = [];
    chats.concat(ST.folders.map(function (f) { return { cwd: f.path }; })).forEach(function (x) { if (x.cwd && !seen[x.cwd]) { seen[x.cwd] = 1; list.push(x.cwd); } });
    menu(anchor, function (el) {
      el.appendChild(h4("Move to project"));
      list.slice(0, 14).forEach(function (p) { el.appendChild(opt({ icon: "monitor", label: folderName(p), sub: p, checked: c && c.cwd === p, onClick: function () { closeMenu(); moveChat(id, p); } })); });
    });
  }
  function rename(id, old) {
    askText("Rename chat", old, { ok: "Rename", max: 100 }).then(function (t) { if (!t) return;
    api("/api/chats/" + id, { method: "PATCH", body: { title: t.trim() } }).then(function () { if (cur && cur.id === id) cur.title = t.trim(); renderTitle(); loadList(); }).catch(function (e) { toast(e.message); }); });
  }
  $("#title").addEventListener("click", function () { if (cur) chatMenu(this, cur.id); });
  $("#searchBtn").title = "Search (Ctrl/⌘ K)"; $("#newBtn").title = "New chat (Ctrl/⌘ Shift O)";
  $("#searchBtn").addEventListener("click", function () { var b = $("#searchBox"); b.hidden = !b.hidden; if (!b.hidden) $("#search").focus(); else { $("#search").value = ""; renderList(); } });
  $("#search").addEventListener("input", renderList);
  $("#search").addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); $("#searchBtn").click(); } });
  function loadList() { return api("/api/chats").then(function (r) { chats = r.chats; sideFolders = r.folders || []; renderList(); }).catch(function () {}); }

  /* ---------- open / new / send ---------- */
  var pollT = 0;
  function schedule() { clearTimeout(pollT); pollT = setTimeout(function () { refresh().then(schedule, schedule); }, cur && (cur.busy || (cur.queue && cur.queue.length)) ? 700 : 4000); }
  var seenFrom = {};
  function noteFrom(c) {
    var ms = c.messages || [], last = null; for (var i = ms.length - 1; i >= 0; i--) if (ms[i].from) { last = ms[i]; break; }
    if (last && seenFrom[c.id] !== undefined && last.at > seenFrom[c.id]) toast("📨 Message received from " + last.from);
    seenFrom[c.id] = last ? last.at : 0; LS.set("seen." + c.id, Date.now());
  }
  function refresh() {
    if (!cur) return Promise.resolve(); var id = cur.id, wasBusy = cur.busy;
    return api("/api/chats/" + id + lastParam()).then(function (r) { if (!cur || cur.id !== id) return; cur = r.chat; noteFrom(cur); var stick = nearBottom(); renderTitle(); renderEmpty(); renderMsgs(); renderQueue(); renderSend(); if (stick) toBottom(); if (wasBusy !== cur.busy) loadList(); })
      .catch(function (e) { if (e.status === 404 && cur && cur.id === id) newChat(); });
  }
  function openChat(id) {
    closeSide();
    return api("/api/chats/" + id).then(function (r) { cur = r.chat; noteFrom(cur); nodes.clear(); $("#msgs").innerHTML = ""; history.replaceState(null, "", "#" + id); applyTheme(effTheme()); renderAll(); toBottom(); schedule(); })
      .catch(function (e) { toast(e.message); newChat(); });
  }
  function newChat() {
    var base = cur ? { cwd: cur.cwd, settings: cur.settings } : null;
    cur = null; nodes.clear(); $("#msgs").innerHTML = ""; clearTimeout(pollT);
    draft = { cwd: (base && base.cwd) || draft.cwd || (ST.folders[0] && ST.folders[0].path) || "", settings: JSON.parse(JSON.stringify((base && base.settings) || draft.settings || ST.prefs)) };
    history.replaceState(null, "", location.pathname); closeSide(); applyTheme(effTheme()); renderAll();
    if (!coarse) input.focus();
  }
  function send() {
    var text = input.value.trim(); if ((!text && !pending.length) || sending) return;
    if (/^\/\w*$/.test(text)) { var c = slashMatches(text)[0]; if (c) { input.value = ""; autosize(); hideSlash(); c.run(); } return; }
    sending = true; stopMic(true);
    var files = pending.map(function (p) { return p.id; }), keepText = input.value, keepFiles = pending.slice();
    input.value = ""; pending = []; renderAttach(); autosize(); hideSlash();
    var ready = cur ? Promise.resolve(cur) : api("/api/chats", { method: "POST", body: { cwd: draft.cwd, settings: draft.settings } }).then(function (c) { cur = c; nodes.clear(); history.replaceState(null, "", "#" + c.id); return c; });
    ready.then(function (c) { return api("/api/chats/" + c.id + "/send", { method: "POST", body: { text: text, files: files } }); })
      .then(function (r) { if (r && r.queued) toast("Queued. It goes out when the reply finishes."); return refresh(); }).then(function () { toBottom(); loadList(); schedule(); })
      .catch(function (e) { toast(e.message); if (!input.value) input.value = keepText; pending = keepFiles; renderAttach(); autosize(); })
      .then(function () { sending = false; renderSend(); });
  }
  function stop() { if (!cur) return; api("/api/chats/" + cur.id + "/stop", { method: "POST" }).then(refresh).catch(function (e) { toast(e.message); }); }
  function retry() { if (!cur) return; api("/api/chats/" + cur.id + "/retry", { method: "POST" }).then(function () { nodes.clear(); $("#msgs").innerHTML = ""; return refresh(); }).then(function () { toBottom(); schedule(); }).catch(function (e) { toast(e.message); }); }
  $("#sendBtn").addEventListener("click", function () { if (cur && cur.busy && !input.value.trim() && !pending.length) stop(); else send(); });
  $("#newBtn").addEventListener("click", newChat); $("#newTop").addEventListener("click", newChat);

  /* ---------- composer ---------- */
  function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, innerHeight * 0.4) + "px"; renderSend(); }
  input.addEventListener("input", function () { autosize(); slashCheck(); });
  input.addEventListener("keydown", function (e) {
    var sl = $(".slash");
    if (sl && e.key === "ArrowDown") { e.preventDefault(); var b0 = sl.querySelector("button"); if (b0) b0.focus(); return; }
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !coarse) { e.preventDefault(); send(); }
  });
  var SLASH = [
    { c: "/new", t: "New chat", run: function () { newChat(); } }, { c: "/stop", t: "Stop the reply", run: function () { stop(); } }, { c: "/retry", t: "Send the last message again", run: function () { retry(); } },
    { c: "/account", t: "Switch account", run: function () { acctMenu($("#acctChip")); } }, { c: "/model", t: "Model and effort", run: function () { modelMenu($("#modelChip")); } },
    { c: "/mode", t: "Permissions", run: function () { modeMenu($("#modeChip")); } }, { c: "/folder", t: "Change folder", run: function () { folderMenu($("#folderChip")); } },
    { c: "/theme", t: "Themes", run: function () { themeSheet(); } }, { c: "/import", t: "Import a Claude app session", run: function () { importSheet(); } }, { c: "/ask", t: "Ask one of your Claude app sessions", run: function () { input.value = "Ask SESSION: "; autosize(); input.focus(); input.setSelectionRange(4, 11); } }, { c: "/compact", t: "Compact this chat", run: function () { compactNow(); } }, { c: "/talk", t: "Talk instead of typing", run: function () { startMic(); } },
  ];
  function slashMatches(v) { return SLASH.filter(function (s) { return s.c.indexOf(v.toLowerCase()) === 0; }); }
  function hideSlash() { var s = $(".slash"); if (s) s.remove(); }
  function slashCheck() {
    var v = input.value; hideSlash(); if (!/^\/\w*$/.test(v)) return;
    var ms = slashMatches(v); if (!ms.length) return;
    var d = document.createElement("div"); d.className = "card slash"; d.setAttribute("role", "menu");
    ms.forEach(function (s) { d.appendChild(opt({ radio: false, label: s.c, sub: s.t, onClick: function () { input.value = ""; autosize(); hideSlash(); s.run(); } })); });
    d.addEventListener("keydown", function (e) { var bs = [].slice.call(d.querySelectorAll("button")), i = bs.indexOf(document.activeElement); if (e.key === "ArrowDown" && bs[i + 1]) { e.preventDefault(); bs[i + 1].focus(); } if (e.key === "ArrowUp") { e.preventDefault(); (bs[i - 1] || input).focus(); } });
    $("#composer").appendChild(d);
  }
  function renderAttach() {
    var row = $("#attachRow"); row.innerHTML = "";
    pending.forEach(function (p, i) {
      var d = document.createElement("span"); d.className = "file" + (p.image ? " pic" : "");
      d.innerHTML = (p.image ? '<img src="' + esc(p.url) + '" alt="' + esc(p.name) + '">' : ic("clip") + "<span>" + esc(p.name) + "</span>") + '<button class="x" aria-label="Remove ' + esc(p.name) + '">' + ic("x") + "</button>";
      d.querySelector(".x").addEventListener("click", function () { pending.splice(i, 1); renderAttach(); });
      row.appendChild(d);
    });
    renderSend();
  }
  function addFiles(list) {
    [].slice.call(list || []).forEach(function (f) {
      if (f.size > 60e6) return toast(f.name + " is over 60 MB");
      var tmp = { id: null, name: f.name || "pasted", image: /^image\//.test(f.type), url: /^image\//.test(f.type) ? URL.createObjectURL(f) : "" };
      api("/api/upload?name=" + encodeURIComponent(tmp.name), { method: "POST", body: f, type: f.type || "application/octet-stream" }).then(function (r) { tmp.id = r.id; pending.push(tmp); renderAttach(); }).catch(function (e) { toast(e.message); });
    });
  }
  $("#addBtn").addEventListener("click", function () { $("#fileIn").click(); });
  $("#fileIn").addEventListener("change", function () { addFiles(this.files); this.value = ""; });
  input.addEventListener("paste", function (e) { var fs = e.clipboardData && e.clipboardData.files; if (fs && fs.length) { e.preventDefault(); addFiles(fs); } });
  var mainEl = $("#main"), dragN = 0;  // drop files anywhere on the conversation to attach them
  mainEl.addEventListener("dragenter", function (e) { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types, "Files") >= 0) { dragN++; mainEl.classList.add("dropping"); } });
  mainEl.addEventListener("dragover", function (e) { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types, "Files") >= 0) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } });
  mainEl.addEventListener("dragleave", function () { if (--dragN <= 0) { dragN = 0; mainEl.classList.remove("dropping"); } });
  mainEl.addEventListener("drop", function (e) { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); dragN = 0; mainEl.classList.remove("dropping"); addFiles(e.dataTransfer.files); });

  /* ---------- voice: live words straight into the box ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, listening = false, baseText = "", finals = "", silenceT = 0;
  function micUI() { var b = $("#micBtn"); b.classList.toggle("on", listening); b.setAttribute("aria-pressed", listening ? "true" : "false"); b.setAttribute("aria-label", listening ? "Stop listening" : "Talk"); $("#listening").hidden = !listening; $("#listenTx").textContent = LS.get("handsfree", false) ? "Listening… it sends when you stop talking" : "Listening… talk, I'm writing it down"; }
  function startMic() {
    if (!SR) return toast("This browser can't turn speech into words. Use Chrome, Edge or Safari.");
    if (listening) return stopMic();
    baseText = input.value ? input.value.replace(/\s*$/, " ") : ""; finals = "";
    rec = new SR(); rec.lang = LS.get("lang", "en-US"); rec.continuous = !/Android/i.test(navigator.userAgent);  // Android Chrome repeats phrases in continuous mode; it restarts itself on end instead rec.interimResults = true;
    rec.onresult = function (e) {
      var interim = ""; for (var i = e.resultIndex; i < e.results.length; i++) { var r = e.results[i]; if (r.isFinal) finals += r[0].transcript; else interim += r[0].transcript; }
      input.value = baseText + finals + interim; autosize(); input.scrollTop = input.scrollHeight;
      if (LS.get("handsfree", false)) { clearTimeout(silenceT); silenceT = setTimeout(function () { if (listening && input.value.trim()) { stopMic(true); send(); } }, 1800); }
    };
    rec.onerror = function (e) { if (e.error === "not-allowed" || e.error === "service-not-allowed") { listening = false; micUI(); toast("The microphone is blocked. Allow it for this site in the browser's settings."); } else if (e.error === "network") toast("Speech needs the internet. Check the connection."); };
    rec.onend = function () { baseText = input.value ? input.value.replace(/\s*$/, " ") : ""; finals = ""; if (listening) { try { rec.start(); } catch (x) { listening = false; micUI(); } } };
    try { rec.start(); listening = true; micUI(); } catch (x) { toast("Couldn't start the microphone."); }
  }
  function stopMic(quiet) { clearTimeout(silenceT); if (!listening) return; listening = false; try { rec.stop(); } catch (x) {} micUI(); if (!quiet && !coarse) input.focus(); }
  $("#micBtn").addEventListener("click", function () { if (listening) stopMic(); else startMic(); });

  /* ---------- sheets: themes, accounts ---------- */
  var previews = [];
  function closeSheet() { var m = $(".modal"); if (m) m.remove(); previews.forEach(function (p) { p.stop(); }); previews = []; }
  function sheet(title, build) {
    closeSheet(); var m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", title);
    m.innerHTML = '<div class="sheet"><header><h3>' + esc(title) + '</h3><button class="icon" aria-label="Close">' + ic("x") + '</button></header><div class="body"></div></div>';
    m.addEventListener("click", function (e) { if (e.target === m || e.target.closest("header .icon")) closeSheet(); });
    document.body.appendChild(m); build($(".body", m)); $("header .icon", m).focus();
  }
  /* wallpapers: each chat keeps its own; "Default" is for new chats and chats that never picked one */
  var shownTheme = null;
  var effTheme = function () { return (cur && cur.theme) || LS.get("theme", "plain"); };
  function applyTheme(id) {
    if (id === shownTheme) return; shownTheme = id;
    var on = id !== "plain" && window.Themes.mount($("#wall"), id);
    if (on) document.documentElement.setAttribute("data-wall", id); else { window.Themes.mount($("#wall"), "plain"); document.documentElement.removeAttribute("data-wall"); }
  }
  function setTheme(id, scope) {
    if (scope === "chat" && cur) { cur.theme = id; applyTheme(id); return api("/api/chats/" + cur.id, { method: "PATCH", body: { theme: id } }).catch(function (e) { toast(e.message); }); }
    LS.set("theme", id); applyTheme(effTheme());
  }
  function themeSheet() {
    var scope = cur ? "chat" : "default";
    sheet("Themes", function (b) {
      if (cur) b.appendChild(seg(["chat", "default"], scope, function (v) { scope = v; b.querySelector(".seg").querySelectorAll("button").forEach(function (x, i) { x.setAttribute("aria-checked", (i === 0) === (v === "chat") ? "true" : "false"); }); mark(); }, ["This chat", "Default"]));
      var g = document.createElement("div"); g.className = "tgrid"; g.setAttribute("role", "radiogroup"); b.appendChild(g);
      var mark = function () { var now = scope === "chat" ? effTheme() : LS.get("theme", "plain"); g.querySelectorAll(".tcard").forEach(function (x) { x.setAttribute("aria-checked", x.dataset.t === now ? "true" : "false"); }); };
      window.Themes.list.forEach(function (t) {
        var c = document.createElement("button"); c.className = "tcard"; c.dataset.t = t.id; c.setAttribute("role", "radio");
        c.innerHTML = "<canvas></canvas><span>" + esc(t.name) + "</span>"; g.appendChild(c);
        previews.push(window.Themes.preview($("canvas", c), t.id));
        c.addEventListener("click", function () { setTheme(t.id, scope); mark(); toast(scope === "chat" ? t.name + " for this chat" : t.name + " for new chats"); });
      });
      mark();
    });
  }
  function acctSheet() {
    api("/api/state").then(function (s) {
      ST = s; renderChips();
      sheet("Accounts", function (b) {
        var now = S().account;
        var row = function (a) {
          var d = document.createElement("div"); d.className = "acct-row";
          var w = a.win, line = function (lab, pct, at) { return pct == null ? "" : "<small class=\"win\">" + lab + " " + Math.round(pct) + "%" + (at ? " · resets " + esc(when(at)) : pct > 0 ? "" : "") + "</small>"; };
          d.innerHTML = '<div><div class="nm">' + esc(a.name) + (now === a.id ? " <small>· in use</small>" : "") + "</div><small>" + esc(a.held || a.note || "") + "</small>" + (w ? line("5 hours", w.five, w.fiveAt) + line("Week", w.week, w.weekAt) : "") + "</div>" +
            '<div class="use">' + (a.use != null ? "<span>" + Math.round(a.use) + '% used</span><span class="bar"><i class="' + useCls(a.use) + '" style="width:' + Math.min(100, a.use) + '%"></i></span>' : "") + "</div>" +
            (now === a.id ? "" : '<button class="btn">Use ' + esc(a.name) + "</button>");
          var btn = d.querySelector("button"); if (btn) btn.addEventListener("click", function () { setSettings({ account: a.id }).then(function () { closeSheet(); toast("Now on " + a.name); }); });
          if (a.engine !== "auto" && a.id !== "cx") { var bell = document.createElement("button"); bell.className = "btn bell" + (watching(a.id) ? " on" : ""); bell.innerHTML = ic("bell") + (watching(a.id) ? "Notifying when back" : "Notify me when back"); bell.addEventListener("click", function () { setWatch(a, !watching(a.id)); }); (btn ? btn.parentNode : d).appendChild(bell); if (btn) { var wrap = document.createElement("div"); wrap.className = "acct-btns"; btn.replaceWith(wrap); wrap.appendChild(btn); wrap.appendChild(bell); } }
          return d;
        };
        [["Auto", "auto"], ["Claude", "claude"], ["Codex", "codex"]].forEach(function (g) { var h = document.createElement("div"); h.className = "acct-sec"; h.textContent = g[0]; b.appendChild(h); s.accounts.filter(function (a) { return a.engine === g[1]; }).forEach(function (a) { b.appendChild(row(a)); }); });
      });
    }).catch(function (e) { toast(e.message); });
  }
  $("#themeNav").addEventListener("click", function () { closeSide(); themeSheet(); }); $("#themeTop").addEventListener("click", themeSheet);
  $("#acctNav").addEventListener("click", function () { closeSide(); acctSheet(); });

  /* ---------- settings menu ---------- */
  var LANGS = [["en-US", "English (US)"], ["en-PH", "English (Philippines)"], ["fil-PH", "Filipino"]];
  function settingsMenu(anchor) {
    menu(anchor, function (el) {
      el.appendChild(h4("Text size")); el.appendChild(seg(["s", "m", "l", "xl"], LS.get("size", "m"), function (v) { LS.set("size", v); document.documentElement.setAttribute("data-size", v); closeMenu(); settingsMenu(anchor); }, ["Small", "Medium", "Large", "Huge"]));
      el.appendChild(h4("Sidebar")); el.appendChild(seg(["project", "date"], LS.get("groupBy", "project"), function (v) { setGroupBy(v); closeMenu(); settingsMenu(anchor); }, ["By project", "By date"]));
      el.appendChild(h4("Voice"));
      LANGS.forEach(function (l) { el.appendChild(opt({ label: l[1], checked: LS.get("lang", "en-US") === l[0], onClick: function () { LS.set("lang", l[0]); closeMenu(); settingsMenu(anchor); } })); });
      el.appendChild(opt({ label: "Send when I stop talking", checked: LS.get("handsfree", false), onClick: function () { LS.set("handsfree", !LS.get("handsfree", false)); micUI(); closeMenu(); settingsMenu(anchor); } }));
      el.appendChild(sep());
      el.appendChild(opt({ radio: false, icon: "bell", label: "Phone notifications", sub: window.Notification && Notification.permission === "granted" ? "On · tap to send a test" : "Turn on", onClick: function () { closeMenu(); ensurePush().then(function () { return api("/api/push/test", { method: "POST" }); }).then(function (r) { toast(r.sent ? "Test sent. It should pop up in a moment." : "Turned on, but nothing was delivered."); }).catch(function (e) { toast(e.message); }); } }));
      el.appendChild(opt({ radio: false, icon: "monitor", label: "Storage", onClick: function () { closeMenu(); storageSheet(); } }));
      if (!ST.onMac) { el.appendChild(sep()); el.appendChild(opt({ radio: false, icon: "out", label: "Sign out", onClick: function () { location.href = "/logout"; } })); }
    });
  }
  $("#setBtn").addEventListener("click", function () { settingsMenu(this); }); $("#me").addEventListener("click", function () { acctMenu(this); });

  /* ---------- phone sidebar ---------- */
  function closeSide() { $("#app").classList.remove("open"); }
  $("#menuBtn").addEventListener("click", function () { if ($("#app").classList.contains("collapsed") && !matchMedia("(max-width: 760px)").matches) setCollapsed(false); else $("#app").classList.add("open"); });
  $("#sideClose").addEventListener("click", closeSide); $("#scrim").addEventListener("click", closeSide);

  /* ---------- right-click (and long-press on phones): one menu at the pointer, built for what is under it ---------- */
  var msgOf = function (el) { var n = el.closest(".msg"); if (!n || !cur) return null; var id = n.dataset.mid; return cur.messages.find(function (m) { return m.id === id; }) || null; };
  var isLastMsg = function (m) { return cur && cur.messages.length && cur.messages[cur.messages.length - 1].id === m.id; };
  function quote(t) { var q = t.trim().split("\n").map(function (l) { return "> " + l; }).join("\n") + "\n\n"; input.value = q + input.value; autosize(); input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  var speaking = false;
  function readAloud(t) {
    if (!window.speechSynthesis) return toast("This browser can't read aloud.");
    speechSynthesis.cancel(); if (speaking) { speaking = false; return; }
    var plain = t.replace(/```[\s\S]*?```/g, " (code) ").replace(/[`*_#>|]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    var u = new SpeechSynthesisUtterance(plain); u.lang = LS.get("lang", "en-US"); u.onend = u.onerror = function () { speaking = false; }; speaking = true; speechSynthesis.speak(u);
  }
  function ctxItems(t, sel) {
    var L = [], add = function (o) { L.push(o); }, line = function () { if (L.length && L[L.length - 1] !== "sep") L.push("sep"); };
    var item = t.closest(".item"), link = t.closest("a[href]"), img = t.closest("img"), pre = t.closest("pre.mdcode"), m = t.closest(".msg") && msgOf(t), chip = t.closest(".chip, .qa button, #me");
    var gh = t.closest(".ghead[data-cwd]"); if (gh) { projectMenu(pointAnchor, gh.dataset.cwd); return null; }
    var fh = t.closest(".ghead[data-folder]"); if (fh) { folderMenu2(pointAnchor, fh.dataset.folder); return null; }
    if (chip && chip.id === "folderChip") { add({ icon: "monitor", label: "Change folder", run: function () { folderMenu(chip); } }); add({ icon: "pencil", label: "Rename this folder", run: function () { renameFolder(CWD()); } }); add({ icon: "clip", label: "Add files to this folder", run: function () { pickInto(CWD()); } }); return L; }
    var pill = t.closest(".qa button[data-acct]");
    if (pill && pill.dataset.acct !== "auto" && pill.dataset.acct !== "cx") { var pa = acctOf(pill.dataset.acct); add({ icon: "users", label: "Use " + pa.name, run: function () { setSettings({ account: pa.id }).then(function () { toast("Now on " + pa.name); }); } }); add({ icon: "bell", label: watching(pa.id) ? "Stop the notification" : "Notify me when " + pa.name + " is back", run: function () { setWatch(pa, !watching(pa.id)); } }); return L; }
    if (chip) { chip.click(); return null; }
    if (item) { chatMenu(pointAnchor, item.dataset.id); return null; }
    if (sel) { add({ icon: "copy", label: "Copy", kb: "⌘C", run: function () { copy(sel); } }); add({ icon: "quote", label: "Quote in reply", run: function () { quote(sel); } }); add({ icon: "search", label: "Search chats for it", run: function () { $("#searchBox").hidden = false; $("#search").value = sel.slice(0, 60); renderList(); openSide(); } }); line(); }
    if (link) { add({ icon: "tab", label: "Open link", run: function () { window.open(link.href, "_blank", "noopener"); } }); add({ icon: "link", label: "Copy link address", run: function () { copy(link.href, "Link copied"); } }); line(); }
    if (img) { add({ icon: "image", label: "Open picture", run: function () { window.open(img.src, "_blank", "noopener"); } }); add({ icon: "down2", label: "Save picture", run: function () { var a = document.createElement("a"); a.href = img.src; a.download = img.alt || "picture"; document.body.appendChild(a); a.click(); a.remove(); } }); line(); }
    if (pre) { add({ icon: "copy", label: "Copy code", run: function () { copy(pre.querySelector("code").textContent, "Code copied"); } }); line(); }
    if (m && m.who === "ai" && !m.running) {
      add({ icon: "copy", label: "Copy reply", run: function () { copy(textOf(m)); } });
      add({ icon: "quote", label: "Quote in reply", run: function () { quote(textOf(m)); } });
      add({ icon: "speak", label: speaking ? "Stop reading" : "Read aloud", run: function () { readAloud(textOf(m)); } });
      if (isLastMsg(m)) add({ icon: "retry", label: "Send again", run: retry });
      line();
    }
    if (m && m.who === "you") {
      add({ icon: "copy", label: "Copy message", run: function () { copy(m.text); } });
      add({ icon: "pencil", label: "Edit and send again", run: function () { input.value = m.text; autosize(); input.focus(); } });
      line();
    }
    if (m && m.running) { add({ icon: "stop", label: "Stop the reply", run: stop }); line(); }
    if (t.closest("#side")) { add({ icon: "plus", label: "New chat", kb: "⌘⇧O", run: newChat }); add({ icon: "folder", label: "New folder", run: function () { newFolder(); } }); add({ icon: "down2", label: "Import from Claude app", run: importSheet }); add({ icon: "plan", label: LS.get("groupBy", "project") === "project" ? "Group chats by date" : "Group chats by project", run: function () { setGroupBy(LS.get("groupBy", "project") === "project" ? "date" : "project"); } }); add({ icon: "search", label: "Search chats", kb: "⌘K", run: openSearch }); add({ icon: "panel", label: "Hide sidebar", kb: "⌘B", run: function () { setCollapsed(true); } }); }
    else if (t.closest("#main") && !L.length) {
      add({ icon: "plus", label: "New chat", kb: "⌘⇧O", run: newChat });
      if (cur) add({ icon: "pencil", label: "Rename this chat", run: function () { rename(cur.id, cur.title); } });
      add({ icon: "users", label: "Switch account", run: function () { acctMenu($("#acctChip")); } });
      add({ icon: "monitor", label: "Change folder", run: function () { folderMenu($("#folderChip")); } });
      add({ icon: "palette", label: "Themes", run: themeSheet });
      if ($("#app").classList.contains("collapsed")) add({ icon: "panel", label: "Show sidebar", kb: "⌘B", run: function () { setCollapsed(false); } });
    }
    if (L[L.length - 1] === "sep") L.pop();
    return L;
  }
  var pointAnchor = null, lastCtx = 0;
  function ctxAt(x, y, target) {
    if (Date.now() - lastCtx < 500) return false; lastCtx = Date.now();
    pointAnchor = { point: true, getBoundingClientRect: function () { return { left: x, right: x, top: y, bottom: y }; }, contains: function () { return false }, isConnected: false, focus: function () {} };
    var sel = String(window.getSelection() || "").trim();
    var L = ctxItems(target, sel); if (!L) return true; if (!L.length) return false;
    closeMenu(); menu(pointAnchor, function (el) { L.forEach(function (o) { el.appendChild(o === "sep" ? sep() : opt({ radio: false, icon: o.icon, label: o.label, kb: o.kb, onClick: function () { closeMenu(); o.run(); } })); }); });
    return true;
  }
  document.addEventListener("contextmenu", function (e) {
    if (e.target.closest("textarea, input, .pop, .modal")) return;  // text boxes keep the browser's own menu (paste)
    var x = e.clientX, y = e.clientY; if (!x && !y) { var r = e.target.getBoundingClientRect(); x = r.left + 12; y = r.bottom; }  // the keyboard's menu key
    lastCtx = 0; if (ctxAt(x, y, e.target)) e.preventDefault();
  });
  /* phones without a native long-press menu (iPhone): hold half a second */
  var lp = 0, lpXY = null;
  document.addEventListener("touchstart", function (e) { if (e.touches.length !== 1 || e.target.closest("textarea, input, .pop, .modal")) return; var t = e.touches[0], tg = e.target; lpXY = [t.clientX, t.clientY]; clearTimeout(lp); lp = setTimeout(function () { if (ctxAt(lpXY[0], lpXY[1], tg) && navigator.vibrate) navigator.vibrate(8); }, 520); }, { passive: true });
  document.addEventListener("touchmove", function (e) { if (lpXY && Math.hypot(e.touches[0].clientX - lpXY[0], e.touches[0].clientY - lpXY[1]) > 10) clearTimeout(lp); }, { passive: true });
  document.addEventListener("touchend", function () { clearTimeout(lp); }, { passive: true });

  /* ---------- sidebar: drag the edge to resize, hide it, shortcuts ---------- */
  var W_MIN = 220, W_MAX = 480, W_DEF = 300;
  function setSideW(w, save) { w = Math.round(Math.max(W_MIN, Math.min(W_MAX, w))); document.documentElement.style.setProperty("--side-w", w + "px"); $("#sideGrip").setAttribute("aria-valuenow", w); if (save) LS.set("sideW", w); }
  function setCollapsed(on) { $("#app").classList.toggle("collapsed", on); LS.set("collapsed", on); $("#collapseBtn").setAttribute("aria-label", on ? "Show sidebar" : "Hide sidebar"); }
  function openSide() { if (matchMedia("(max-width: 760px)").matches) $("#app").classList.add("open"); else setCollapsed(false); }
  function openSearch() { openSide(); $("#searchBox").hidden = false; $("#search").focus(); $("#search").select(); }
  (function () {
    var g = $("#sideGrip"); g.setAttribute("aria-valuemin", W_MIN); g.setAttribute("aria-valuemax", W_MAX);
    g.addEventListener("pointerdown", function (e) {
      e.preventDefault(); g.setPointerCapture(e.pointerId); g.classList.add("drag"); document.body.classList.add("resizing");
      var left = $("#side").getBoundingClientRect().left;
      var move = function (ev) { setSideW(ev.clientX - left, false); }, up = function () { g.classList.remove("drag"); document.body.classList.remove("resizing"); g.removeEventListener("pointermove", move); g.removeEventListener("pointerup", up); setSideW($("#side").getBoundingClientRect().width, true); };
      g.addEventListener("pointermove", move); g.addEventListener("pointerup", up);
    });
    g.addEventListener("dblclick", function () { setSideW(W_DEF, true); });
    g.addEventListener("keydown", function (e) { var w = $("#side").getBoundingClientRect().width; if (e.key === "ArrowLeft") { e.preventDefault(); setSideW(w - 16, true); } if (e.key === "ArrowRight") { e.preventDefault(); setSideW(w + 16, true); } if (e.key === "Home") setSideW(W_MIN, true); if (e.key === "End") setSideW(W_MAX, true); });
  })();
  $("#collapseBtn").addEventListener("click", function () { setCollapsed(true); });
  document.addEventListener("keydown", function (e) {
    var mod = e.metaKey || e.ctrlKey; if (!mod) return; var k = e.key.toLowerCase();
    if (k === "b" && !e.shiftKey) { e.preventDefault(); if (matchMedia("(max-width: 760px)").matches) $("#app").classList.toggle("open"); else setCollapsed(!$("#app").classList.contains("collapsed")); }
    if (k === "k" && !e.shiftKey) { e.preventDefault(); openSearch(); }
    if (k === "o" && e.shiftKey) { e.preventDefault(); newChat(); }
  });

  /* ---------- start ---------- */
  $("#newBtn").innerHTML = ic("plus") + "New"; $("#searchBtn").innerHTML = ic("search") + "Search"; $("#acctNav").innerHTML = ic("users") + "Accounts"; $("#themeNav").innerHTML = ic("palette") + "Themes";
  $("#setBtn").innerHTML = ic("gear"); $("#menuBtn").innerHTML = ic("menu"); $("#collapseBtn").innerHTML = ic("panel");
  setSideW(LS.get("sideW", W_DEF), false); if (LS.get("collapsed", false)) setCollapsed(true); $("#sideClose").innerHTML = ic("x"); $("#themeTop").innerHTML = ic("palette"); $("#newTop").innerHTML = ic("plus");
  $("#addBtn").innerHTML = ic("plus"); $("#micBtn").innerHTML = ic("mic");
  document.documentElement.setAttribute("data-size", LS.get("size", "m"));
  applyTheme(effTheme());
  if (!SR) $("#micBtn").title = "Voice needs Chrome, Edge or Safari";
  setInterval(loadList, 6000); runBadge(0); pollRun(); setInterval(pollRun, 20000);
  setInterval(function () { api("/api/state").then(function (s) { ST = s; renderChips(); }).catch(function () {}); }, 60000);
  loadList();  // the chat list doesn't wait for the account numbers
  api("/api/state").then(function (s) {
    ST = s;
    draft = { cwd: (s.folders[0] && s.folders[0].path) || "", settings: JSON.parse(JSON.stringify(s.prefs)) };
    return loadList().then(function () { var id = location.hash.slice(1); if (/^c[a-z0-9]+$/.test(id)) return openChat(id); newChat(); });
  }).catch(function (e) { toast(e.message); });
})();
