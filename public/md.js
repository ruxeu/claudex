/* Claudex chat formatting: headings, lists, tables, quotes, code blocks, links, and charts (a ```chart block with JSON becomes an inline SVG graph). No dependencies. */
(function () {
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var PAL = ["#2ec4b6", "#d6dade", "#e3b448", "#4c8dff", "#35b66a", "#ff6b4a"];
  function inline(s) {
    s = esc(s);
    return s.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*(?!\s)([^*]+?)\*/g, "$1<i>$2</i>").replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  function chart(src) {
    var c; try { c = JSON.parse(src); } catch (e) { return '<pre class="mdcode"><code>' + esc(src) + "</code></pre>"; }
    var L = c.labels || [], S = c.series || [{ name: c.title || "", values: c.values || [] }], type = c.type || "bar", W = 420, H = 220, pad = { l: 38, r: 12, t: 26, b: 34 };
    var all = [].concat.apply([], S.map(function (s) { return s.values; })).map(Number), max = Math.max.apply(null, all.concat([0])) || 1, min = Math.min.apply(null, all.concat([0]));
    var title = c.title ? '<text x="' + W / 2 + '" y="15" text-anchor="middle" class="ct">' + esc(c.title) + "</text>" : "", g = "", legend = "";
    var summary = (c.title ? c.title + ": " : "") + L.map(function (l, i) { return l + " " + S.map(function (s) { return s.values[i]; }).join("/"); }).join(", ");
    if (type === "pie" || type === "donut") {
      var v = S[0].values.map(Number), tot = v.reduce(function (a, b) { return a + Math.max(b, 0); }, 0) || 1, a0 = -Math.PI / 2, cx = 110, cy = 125, r = 80;
      v.forEach(function (x, i) { var a1 = a0 + (Math.max(x, 0) / tot) * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0, p = "M" + cx + " " + cy + " L" + (cx + r * Math.cos(a0)) + " " + (cy + r * Math.sin(a0)) + " A" + r + " " + r + " 0 " + big + " 1 " + (cx + r * Math.cos(a1)) + " " + (cy + r * Math.sin(a1)) + " Z"; if (x > 0) g += '<path d="' + p + '" fill="' + PAL[i % PAL.length] + '" stroke="#3a0f2c" stroke-width="2"/>'; legend += '<rect x="230" y="' + (50 + i * 22) + '" width="12" height="12" rx="3" fill="' + PAL[i % PAL.length] + '" stroke="#3a0f2c"/><text x="248" y="' + (60 + i * 22) + '" class="cl">' + esc(L[i] || "") + " " + Math.round((x / tot) * 100) + "%</text>"; a0 = a1; });
      if (type === "donut") g += '<circle cx="' + cx + '" cy="' + cy + '" r="40" fill="#1b1c1f" stroke="#4a4e55" stroke-width="2"/>';
    } else {
      var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, y = function (n) { return pad.t + ih - ((n - Math.min(min, 0)) / (max - Math.min(min, 0))) * ih; }, n = L.length || (S[0].values || []).length, step = iw / Math.max(n, 1);
      for (var t = 0; t <= 4; t++) { var val = Math.min(min, 0) + ((max - Math.min(min, 0)) * t) / 4; g += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + y(val) + '" y2="' + y(val) + '" class="cg"/><text x="' + (pad.l - 5) + '" y="' + (y(val) + 3) + '" text-anchor="end" class="cl">' + (Math.abs(val) >= 100 ? Math.round(val) : Math.round(val * 10) / 10) + "</text>"; }
      L.forEach(function (l, i) { g += '<text x="' + (pad.l + step * (i + 0.5)) + '" y="' + (H - 14) + '" text-anchor="middle" class="cl">' + esc(String(l).slice(0, 10)) + "</text>"; });
      S.forEach(function (s, si) {
        var col = PAL[si % PAL.length];
        if (type === "line") { var pts = s.values.map(function (x, i) { return [pad.l + step * (i + 0.5), y(+x)]; }); g += '<polyline fill="none" stroke="' + col + '" stroke-width="3" stroke-linejoin="round" points="' + pts.map(function (p) { return p.join(","); }).join(" ") + '"/>' + pts.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="' + col + '" stroke="#3a0f2c" stroke-width="1.5"/>'; }).join(""); }
        else { var bw = (step * 0.7) / S.length; s.values.forEach(function (x, i) { var x0 = pad.l + step * i + step * 0.15 + bw * si, y0 = y(Math.max(+x, 0)), h = Math.abs(y(+x) - y(0)); g += '<rect x="' + x0 + '" y="' + y0 + '" width="' + bw + '" height="' + h + '" rx="4" fill="' + col + '" stroke="#3a0f2c" stroke-width="1.5"/><text x="' + (x0 + bw / 2) + '" y="' + (y0 - 4) + '" text-anchor="middle" class="cl">' + x + "</text>"; }); }
        if (S.length > 1) legend += '<rect x="' + (pad.l + si * 90) + '" y="' + (H - 6) + '" width="10" height="4" fill="' + col + '"/><text x="' + (pad.l + si * 90 + 14) + '" y="' + (H - 1) + '" class="cl">' + esc(s.name || "") + "</text>";
      });
    }
    return '<figure class="mdchart"><svg viewBox="0 0 ' + W + " " + (H + (S.length > 1 && type !== "pie" ? 8 : 0)) + '" role="img" aria-label="' + esc(summary) + '">' + title + g + legend + "</svg></figure>";
  }
  function table(rows) {
    var cells = function (r) { return r.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); }); }, head = cells(rows[0]), al = cells(rows[1]).map(function (c) { return /^:-+:$/.test(c) ? "center" : /-+:$/.test(c) ? "right" : "left"; });
    return '<div class="mdtable"><table><thead><tr>' + head.map(function (h, i) { return '<th style="text-align:' + al[i] + '">' + inline(h) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.slice(2).map(function (r) { return "<tr>" + cells(r).map(function (c, i) { return '<td style="text-align:' + (al[i] || "left") + '">' + inline(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
  }
  window.md = function (text) {
    var lines = String(text || "").replace(/\r/g, "").split("\n"), out = [], i = 0;
    while (i < lines.length) {
      var l = lines[i], m;
      if ((m = /^```(\w*)\s*$/.exec(l))) { var buf = []; i++; while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]); i++; out.push(m[1] === "chart" ? chart(buf.join("\n")) : '<pre class="mdcode"><code>' + esc(buf.join("\n")) + "</code></pre>"); continue; }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1])) { var rows = []; while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++]); out.push(table(rows)); continue; }
      if ((m = /^(#{1,3})\s+(.*)$/.exec(l))) { out.push("<h" + (m[1].length + 2) + ' class="mdh">' + inline(m[2]) + "</h" + (m[1].length + 2) + ">"); i++; continue; }
      if (/^\s*([-*_])\1\1+\s*$/.test(l)) { out.push("<hr>"); i++; continue; }
      if (/^>\s?/.test(l)) { var q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, "")); out.push("<blockquote>" + q.map(inline).join("<br>") + "</blockquote>"); continue; }
      if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) { var ord = /^\s*\d+[.)]/.test(l), it = []; while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) it.push("<li>" + inline(lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, "")) + "</li>"); out.push((ord ? "<ol>" : "<ul>") + it.join("") + (ord ? "</ol>" : "</ul>")); continue; }
      if (!l.trim()) { i++; continue; }
      var p = []; while (i < lines.length && lines[i].trim() && !/^(```|#{1,3}\s|>|\s*\||\s*([-*•]|\d+[.)])\s+)/.test(lines[i])) p.push(lines[i++]); if (!p.length) { p.push(lines[i++]); } out.push("<p>" + p.map(inline).join("<br>") + "</p>");
    }
    return out.join("");
  };
})();
