/* Claudex wallpapers: live ASCII scenes painted in characters and always moving, behind the conversation (from the "Chat themes" sample).
   Themes.mount(canvas, id) runs one full size; Themes.preview(canvas, id) runs a small one for the picker. Pauses when the tab is hidden; one still frame under reduced motion. */
(function () {
  var FONT = '"GeistMono", ui-monospace, Menlo, Consolas, monospace';
  var hash = function (a, b, c) { var x = Math.sin(a * 127.1 + b * 311.7 + (c || 0) * 74.7) * 43758.5453; return x - Math.floor(x); };
  var pick = function (s, f) { return s[Math.floor(f * s.length) % s.length]; };
  function grad(ctx, h, stops) { var g = ctx.createLinearGradient(0, 0, 0, h); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
  function cell(ctx, cs, x, y, ch, color, bg) { if (bg) { ctx.fillStyle = bg; ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2); } ctx.fillStyle = color; ctx.fillText(ch, x * cs + cs / 2, y * cs + cs / 2 + 1); }
  function critter(ctx, cs, x, y, color) {  // the little orange creature from the sample, in pixels
    var P = ["..#########..", ".###########.", "##.##...##.##", "#############", "#############", ".#.#.....#.#."], s = cs * 0.42;
    ctx.fillStyle = color; P.forEach(function (row, r) { for (var c = 0; c < row.length; c++) if (row[c] === "#") ctx.fillRect(x + c * s, y + r * s, s - 1, s - 1); });
  }

  var THEMES = [
    { id: "plain", name: "Plain" },
    { id: "night", name: "Night sky", cs: 16,
      init: function (C, R, rnd) {
        var stars = [], clouds = [];
        for (var i = 0; i < C * R * 0.025; i++) stars.push({ x: Math.floor(rnd() * C), y: Math.floor(rnd() * R), ph: 0.5 + rnd() * 2, big: rnd() > 0.85 });
        for (var k = 0; k < Math.max(3, Math.round(C / 30)); k++) clouds.push({ x0: rnd() * C, y: 2 + Math.floor(rnd() * (R * 0.62)), w: 16 + Math.floor(rnd() * 16), sp: 0.25 + rnd() * 0.5, seed: rnd() * 99 });
        return { stars: stars, clouds: clouds };
      },
      draw: function (ctx, s, t, W, H, cs, C, R) {
        ctx.fillStyle = grad(ctx, H, [[0, "#070c22"], [0.55, "#0f2152"], [1, "#2a4fa6"]]); ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(150,175,255,.045)"; ctx.lineWidth = 1; ctx.beginPath();
        for (var gx = 0; gx <= C; gx++) { ctx.moveTo(gx * cs + 0.5, 0); ctx.lineTo(gx * cs + 0.5, H); } for (var gy = 0; gy <= R; gy++) { ctx.moveTo(0, gy * cs + 0.5); ctx.lineTo(W, gy * cs + 0.5); } ctx.stroke();
        s.stars.forEach(function (st) { ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(t * st.ph + st.x)); cell(ctx, cs, st.x, st.y, st.big ? "+" : ".", "#c9d6ff"); }); ctx.globalAlpha = 1;
        var mx = C - 15, my = 2;  // crescent moon
        for (var r = 0; r < 11; r++) for (var c = 0; c < 11; c++) { var a = Math.hypot(c - 5, r - 5), b = Math.hypot(c - 7.3, r - 3.6); if (a < 5.2 && b > 4.4) cell(ctx, cs, mx + c, my + r, pick(":t%;:", hash(c, r, Math.floor(t / 2))), "#3d3622", "rgba(232,218,168,.62)"); }
        s.clouds.forEach(function (cl) {
          var span = C + cl.w * 2, x = ((cl.x0 + cl.sp * t) % span) - cl.w, shape = [0.45, 0.8, 1, 0.92];
          shape.forEach(function (f, i) { var w = Math.round(cl.w * f), st = Math.round(x + (cl.w - w) / 2 + (i === 0 ? 3 : 0)); for (var c = 0; c < w; c++) { var cx = st + c; if (cx < 0 || cx >= C) continue; cell(ctx, cs, cx, cl.y + i, pick("SStSX%tS", hash(c + cl.seed, i, Math.floor(t * 1.4))), "#b4c2ff", "rgba(84,108,206,.42)"); } });
        });
        critter(ctx, cs, W - cs * 9, H - (W < 761 ? 210 : 158) + Math.sin(t * 2.2) * 3, "#e8826a");
      } },
    { id: "rain", name: "Rain", cs: 15,
      init: function (C, R, rnd) { var d = []; for (var i = 0; i < C * 1.1; i++) d.push({ x: Math.floor(rnd() * C), y0: rnd() * R * 2, sp: 14 + rnd() * 14, len: 1 + Math.floor(rnd() * 3) }); return { d: d }; },
      draw: function (ctx, s, t, W, H, cs, C, R) {
        ctx.fillStyle = grad(ctx, H, [[0, "#081015"], [1, "#132a31"]]); ctx.fillRect(0, 0, W, H);
        s.d.forEach(function (d) {
          var y = (d.y0 + d.sp * t) % (R + 6) - 3;
          for (var k = 0; k < d.len; k++) { ctx.globalAlpha = 0.25 + 0.5 * (1 - k / d.len); cell(ctx, cs, d.x, Math.floor(y) - k, k === 0 ? "|" : "'", "#86bed3"); }
          if (y > R - 2) { ctx.globalAlpha = 0.5; cell(ctx, cs, d.x - 1, R - 1, ".", "#86bed3"); cell(ctx, cs, d.x + 1, R - 1, ".", "#86bed3"); }
        });
        ctx.globalAlpha = 0.35; for (var c = 0; c < C; c++) cell(ctx, cs, c, R - 1, pick("_~_-", hash(c, Math.floor(t * 3))), "#4f8a9c"); ctx.globalAlpha = 1;
      } },
    { id: "snow", name: "Snowfall", cs: 16,
      init: function (C, R, rnd) { var f = []; for (var i = 0; i < C * R * 0.05; i++) f.push({ x: rnd() * C, y0: rnd() * R, sp: 1 + rnd() * 2.6, sw: 0.5 + rnd() * 2, ph: rnd() * 6, ch: pick("*·+.*", rnd()) }); return { f: f }; },
      draw: function (ctx, s, t, W, H, cs, C, R) {
        ctx.fillStyle = grad(ctx, H, [[0, "#0e1320"], [1, "#27324a"]]); ctx.fillRect(0, 0, W, H);
        s.f.forEach(function (f) { var y = (f.y0 + f.sp * t) % (R + 2) - 1, x = f.x + Math.sin(t * 0.7 + f.ph) * f.sw; ctx.globalAlpha = 0.45 + 0.4 * (f.sp / 3.6); cell(ctx, cs, Math.round(x), Math.floor(y), f.ch, "#e8eefc"); });
        ctx.globalAlpha = 0.7; for (var c = 0; c < C; c++) { var h = 1 + Math.floor(hash(c, 3) * 2); for (var r = 0; r < h; r++) cell(ctx, cs, c, R - 1 - r, r === h - 1 ? "^" : "#", "#cfd9ee", "rgba(200,212,236,.22)"); } ctx.globalAlpha = 1;
      } },
    { id: "ocean", name: "Night ocean", cs: 17,
      init: function (C, R, rnd) { var st = [], fish = []; for (var i = 0; i < C * R * 0.012; i++) st.push({ x: Math.floor(rnd() * C), y: Math.floor(rnd() * R * 0.4), ph: 0.5 + rnd() * 2 }); for (var k = 0; k < 3; k++) fish.push({ y: 0.62 + rnd() * 0.3, sp: 1 + rnd() * 2, x0: rnd() * C, dir: rnd() > 0.5 ? 1 : -1 }); return { st: st, fish: fish }; },
      draw: function (ctx, s, t, W, H, cs, C, R) {
        ctx.fillStyle = grad(ctx, H, [[0, "#050b18"], [0.45, "#0b1d36"], [1, "#0b3350"]]); ctx.fillRect(0, 0, W, H);
        s.st.forEach(function (st) { ctx.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(t * st.ph + st.x)); cell(ctx, cs, st.x, st.y, ".", "#cfe0ff"); }); ctx.globalAlpha = 1;
        var hz = Math.floor(R * 0.45), mx = Math.floor(C * 0.72);
        ctx.fillStyle = "rgba(238,232,200,.9)"; ctx.beginPath(); ctx.arc(mx * cs, (hz - 6) * cs, cs * 2.2, 0, 7); ctx.fill();
        for (var r = hz; r < R; r++) for (var c = 0; c < C; c++) {
          var v = Math.sin(c * 0.33 + t * 1.1 + r * 0.9) + Math.sin(c * 0.11 - t * 0.6 + r * 1.7) * 0.8, depth = (r - hz) / (R - hz), glint = Math.abs(c - mx) < 3 + depth * 6 && v > 0.2;
          var ch = v > 1.1 ? "≈" : v > 0.35 ? "~" : v > -0.5 ? "-" : ""; if (!ch) continue;
          ctx.globalAlpha = 0.35 + 0.5 * (1 - depth); cell(ctx, cs, c, r, glint ? "=" : ch, glint ? "#f3edcc" : depth < 0.5 ? "#7cc4ec" : "#3f88b6");
        }
        ctx.globalAlpha = 0.85; s.fish.forEach(function (f) { var x = ((f.x0 + f.dir * f.sp * t) % (C + 6) + C + 6) % (C + 6) - 3, y = Math.floor(R * f.y), str = f.dir > 0 ? "><>" : "<><"; for (var i = 0; i < 3; i++) cell(ctx, cs, Math.floor(x) + i, y, str[i], "#ffb27a"); }); ctx.globalAlpha = 1;
      } },
    { id: "aurora", name: "Aurora", cs: 15,
      init: function (C, R, rnd) { var st = []; for (var i = 0; i < C * R * 0.02; i++) st.push({ x: Math.floor(rnd() * C), y: Math.floor(rnd() * R), ph: 0.5 + rnd() * 2 }); return { st: st }; },
      draw: function (ctx, s, t, W, H, cs, C, R) {
        ctx.fillStyle = grad(ctx, H, [[0, "#04070e"], [1, "#0b1a22"]]); ctx.fillRect(0, 0, W, H);
        s.st.forEach(function (st) { ctx.globalAlpha = 0.2 + 0.5 * Math.abs(Math.sin(t * st.ph + st.x)); cell(ctx, cs, st.x, st.y, ".", "#d6e4ff"); });
        [["#5cffb0", 0.22, 0], ["#4fd6e8", 0.3, 2], ["#b484ff", 0.16, 4]].forEach(function (b) { for (var c = 0; c < C; c++) {
          var cy = R * b[1] + Math.sin(c * 0.07 + t * 0.35 + b[2]) * R * 0.08 + Math.sin(c * 0.19 - t * 0.6) * 1.6, h = 3 + Math.sin(c * 0.05 + t * 0.4 + b[2]) * 2;
          for (var r = Math.floor(cy - h); r < cy + h * 2.6; r++) { var d = r < cy ? (cy - r) / h : (r - cy) / (h * 2.6); if (d > 1 || r < 0) continue; ctx.globalAlpha = (1 - d) * 0.55 * (0.6 + 0.4 * Math.sin(t * 1.3 + c * 0.3)); cell(ctx, cs, c, r, pick("|!:;'|", hash(c, r, Math.floor(t * 2))), b[0]); }
        } });
        ctx.globalAlpha = 1; for (var c2 = 0; c2 < C; c2++) { var m = Math.floor(2 + hash(Math.floor(c2 / 3), 9) * 4); for (var r2 = 0; r2 < m; r2++) cell(ctx, cs, c2, R - 1 - r2, "#", "#0c141a", "#0a1116"); }
      } },
    { id: "fireflies", name: "Fireflies", cs: 15,
      init: function (C, R, rnd) { var f = []; for (var i = 0; i < Math.max(14, C / 3); i++) f.push({ x: rnd() * C, y: R * (0.3 + rnd() * 0.6), a: rnd() * 6, b: rnd() * 6, s: 0.3 + rnd() * 0.6, ph: rnd() * 6 }); return { f: f }; },
      draw: function (ctx, s, t, W, H, cs, C, R) {
        ctx.fillStyle = grad(ctx, H, [[0, "#060d09"], [1, "#11281a"]]); ctx.fillRect(0, 0, W, H);
        s.f.forEach(function (f) {
          var x = (f.x + Math.sin(t * f.s + f.a) * 6 + Math.sin(t * f.s * 0.4 + f.b) * 9) * cs, y = (f.y + Math.cos(t * f.s * 0.8 + f.b) * 4) * cs, on = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.7 + f.ph));
          var g = ctx.createRadialGradient(x, y, 0, x, y, cs * 2.4); g.addColorStop(0, "rgba(255,226,122," + 0.45 * on + ")"); g.addColorStop(1, "rgba(255,226,122,0)");
          ctx.fillStyle = g; ctx.fillRect(x - cs * 2.4, y - cs * 2.4, cs * 4.8, cs * 4.8); ctx.globalAlpha = on; ctx.fillStyle = "#fff1b0"; ctx.fillText("•", x, y); ctx.globalAlpha = 1;
        });
        for (var c = 0; c < C; c++) { var h = 2 + Math.floor(hash(c, 1) * 4), sway = Math.sin(t * 1.4 + c * 0.35); for (var r = 0; r < h; r++) cell(ctx, cs, c, R - 1 - r, r === h - 1 ? (sway > 0.3 ? "/" : sway < -0.3 ? "\\" : "|") : "|", r === h - 1 ? "#4f9a5e" : "#2c6b3a"); }
      } },
    { id: "sakura", name: "Sakura", cs: 16,
      init: function (C, R, rnd) { var p = []; for (var i = 0; i < C * R * 0.03; i++) p.push({ x: rnd() * C, y0: rnd() * R, sp: 0.8 + rnd() * 1.8, sw: 1 + rnd() * 3, ph: rnd() * 6, ch: pick("*o.✿*", rnd()) }); return { p: p }; },
      draw: function (ctx, s, t, W, H, cs, C, R) {
        ctx.fillStyle = grad(ctx, H, [[0, "#2a0f22"], [0.6, "#5a1f45"], [1, "#b04a7d"]]); ctx.fillRect(0, 0, W, H);
        for (var c = 0; c < C; c++) { var h = 1 + Math.floor(hash(c, 5) * 3); for (var r = 0; r < h; r++) cell(ctx, cs, c, R - 1 - r, r === h - 1 ? pick("*.o", hash(c, r)) : "#", "#ffc4dd", "rgba(255,170,205,.18)"); }
        s.p.forEach(function (f) { var y = (f.y0 + f.sp * t) % (R + 2) - 1, x = f.x + Math.sin(t * 0.6 + f.ph) * f.sw; ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t + f.ph); cell(ctx, cs, Math.round(x), Math.floor(y), f.ch, "#ffd1e6"); });
        ctx.globalAlpha = 1;
      } },
    { id: "pinksky", name: "Pink sky", cs: 16,
      init: function (C, R, rnd) {
        var stars = [], clouds = [];
        for (var i = 0; i < C * R * 0.025; i++) stars.push({ x: Math.floor(rnd() * C), y: Math.floor(rnd() * R), ph: 0.5 + rnd() * 2, big: rnd() > 0.85 });
        for (var k = 0; k < Math.max(3, Math.round(C / 30)); k++) clouds.push({ x0: rnd() * C, y: 2 + Math.floor(rnd() * (R * 0.62)), w: 16 + Math.floor(rnd() * 16), sp: 0.25 + rnd() * 0.5, seed: rnd() * 99 });
        return { stars: stars, clouds: clouds };
      },
      draw: function (ctx, s, t, W, H, cs, C, R) {
        ctx.fillStyle = grad(ctx, H, [[0, "#1d0820"], [0.55, "#4a1440"], [1, "#c2477f"]]); ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(255,180,220,.05)"; ctx.lineWidth = 1; ctx.beginPath();
        for (var gx = 0; gx <= C; gx++) { ctx.moveTo(gx * cs + 0.5, 0); ctx.lineTo(gx * cs + 0.5, H); } for (var gy = 0; gy <= R; gy++) { ctx.moveTo(0, gy * cs + 0.5); ctx.lineTo(W, gy * cs + 0.5); } ctx.stroke();
        s.stars.forEach(function (st) { ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(t * st.ph + st.x)); cell(ctx, cs, st.x, st.y, st.big ? "+" : ".", "#ffd6ec"); }); ctx.globalAlpha = 1;
        var mx = C - 15, my = 2;
        for (var r = 0; r < 11; r++) for (var c = 0; c < 11; c++) { var a = Math.hypot(c - 5, r - 5), b = Math.hypot(c - 7.3, r - 3.6); if (a < 5.2 && b > 4.4) cell(ctx, cs, mx + c, my + r, pick(":t%;:", hash(c, r, Math.floor(t / 2))), "#4a2338", "rgba(255,226,236,.7)"); }
        s.clouds.forEach(function (cl) {
          var span = C + cl.w * 2, x = ((cl.x0 + cl.sp * t) % span) - cl.w;
          [0.45, 0.8, 1, 0.92].forEach(function (f, i) { var w = Math.round(cl.w * f), st = Math.round(x + (cl.w - w) / 2 + (i === 0 ? 3 : 0)); for (var c = 0; c < w; c++) { var cx = st + c; if (cx < 0 || cx >= C) continue; cell(ctx, cs, cx, cl.y + i, pick("SStSX%tS", hash(c + cl.seed, i, Math.floor(t * 1.4))), "#ffc2e0", "rgba(214,84,150,.42)"); } });
        });
        critter(ctx, cs, W - cs * 9, H - (W < 761 ? 210 : 158) + Math.sin(t * 2.2) * 3, "#ff8fc0");
      } },
    { id: "bubblegum", name: "Bubblegum", cs: 16,
      init: function (C, R, rnd) { var b = []; for (var i = 0; i < Math.max(18, C * 0.9); i++) b.push({ x: rnd() * C, y0: rnd() * R, sp: 0.6 + rnd() * 1.6, sz: rnd(), ph: rnd() * 6 }); return { b: b }; },
      draw: function (ctx, s, t, W, H, cs, C, R) {
        ctx.fillStyle = grad(ctx, H, [[0, "#3a1030"], [1, "#e0689f"]]); ctx.fillRect(0, 0, W, H);
        s.b.forEach(function (b) {
          var y = R - ((b.y0 + b.sp * t) % (R + 4)) + 2, x = b.x + Math.sin(t * 0.9 + b.ph) * 1.5;
          ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 1.3 + b.ph);
          if (b.sz > 0.75) { ctx.strokeStyle = "rgba(255,220,238,.8)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x * cs, y * cs, cs * (0.8 + b.sz), 0, 7); ctx.stroke(); cell(ctx, cs, Math.round(x - 0.4), Math.round(y - 0.6), "'", "#fff0f7"); }
          else cell(ctx, cs, Math.round(x), Math.round(y), b.sz > 0.4 ? "O" : "o", "#ffe0ef");
        });
        ctx.globalAlpha = 1;
      } },
    { id: "hearts", name: "Hearts", cs: 15,
      init: function (C, R, rnd) { var h = []; for (var i = 0; i < Math.max(14, C * 0.6); i++) h.push({ x: rnd() * C, y0: rnd() * R, sp: 0.8 + rnd() * 1.8, ph: rnd() * 6, big: rnd() > 0.8 }); return { h: h }; },
      draw: function (ctx, s, t, W, H, cs, C, R) {
        ctx.fillStyle = grad(ctx, H, [[0, "#22050f"], [1, "#7a1c3f"]]); ctx.fillRect(0, 0, W, H);
        s.h.forEach(function (h) {
          var y = R - ((h.y0 + h.sp * t) % (R + 4)) + 2, x = h.x + Math.sin(t * 0.8 + h.ph) * 2, beat = 1 + 0.12 * Math.max(0, Math.sin(t * 5 + h.ph));
          ctx.globalAlpha = 0.45 + 0.45 * Math.abs(Math.sin(t * 0.7 + h.ph));
          if (h.big) { ctx.save(); ctx.font = Math.round(cs * 1.6 * beat) + "px " + FONT; ctx.fillStyle = "#ff6fa5"; ctx.fillText("♥", x * cs, y * cs); ctx.restore(); }
          else cell(ctx, cs, Math.round(x), Math.round(y), pick("♥<3♥", hash(h.x, 1)), "#ff9ec4");
        });
        ctx.globalAlpha = 1;
      } },
    { id: "coderain", name: "Code rain", cs: 15,
      init: function (C, R, rnd) { var s = []; for (var c = 0; c < C; c++) s.push({ y0: rnd() * R * 2, sp: 4 + rnd() * 9, len: 6 + Math.floor(rnd() * 14) }); return { s: s }; },
      draw: function (ctx, s, t, W, H, cs, C, R) {
        ctx.fillStyle = "#040805"; ctx.fillRect(0, 0, W, H);
        s.s.forEach(function (st, c) { var head = (st.y0 + st.sp * t) % (R + st.len + 4); for (var k = 0; k < st.len; k++) { var r = Math.floor(head) - k; if (r < 0 || r >= R) continue; ctx.globalAlpha = k === 0 ? 1 : 0.75 * (1 - k / st.len); cell(ctx, cs, c, r, pick("claudex01<>{}/=*+", hash(c, r, Math.floor(t * 6 + k))), k === 0 ? "#d6ffdc" : "#2fbf5a"); } });
        ctx.globalAlpha = 1;
      } },
  ];

  function Runner(canvas, theme, small) {
    var ctx = canvas.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, C = 0, R = 0, cs = (theme.cs || 16) * (small ? 0.5 : 1), state = null, raf = 0, last = 0, t0 = performance.now() - 40000 * Math.random(), alive = true;
    var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function size() {
      var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return false;
      if (w !== W || h !== H) { W = w; H = h; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); C = Math.ceil(W / cs); R = Math.ceil(H / cs); var seed = 7; state = theme.init(C, R, function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }); }
      return true;
    }
    function frame(now) {
      if (!alive) return; raf = requestAnimationFrame(frame);
      if (document.hidden || now - last < (small ? 66 : 40)) return; last = now;
      if (!size()) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = Math.round(cs * 0.78) + "px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      theme.draw(ctx, state, (now - t0) / 1000, W, H, cs, C, R);
      if (still) { alive = false; cancelAnimationFrame(raf); }
    }
    raf = requestAnimationFrame(frame);
    var ro = new ResizeObserver(function () { if (still && !alive) { alive = true; raf = requestAnimationFrame(frame); } }); ro.observe(canvas);
    return { stop: function () { alive = false; cancelAnimationFrame(raf); ro.disconnect(); } };
  }
  var main = null;
  window.Themes = {
    list: THEMES.map(function (t) { return { id: t.id, name: t.name }; }),
    mount: function (canvas, id) { if (main) main.stop(); main = null; var t = THEMES.find(function (x) { return x.id === id; }); if (!t || !t.draw) return false; main = Runner(canvas, t, false); return true; },
    preview: function (canvas, id) { var t = THEMES.find(function (x) { return x.id === id; }); if (!t || !t.draw) { var c = canvas.getContext("2d"); canvas.width = 320; canvas.height = 200; c.fillStyle = "#1f1f1e"; c.fillRect(0, 0, 320, 200); c.fillStyle = "#2d2d2a"; c.fillRect(60, 150, 200, 24); return { stop: function () {} }; } return Runner(canvas, t, true); },
  };
})();
