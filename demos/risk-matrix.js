/*
 * Interactive risk matrix — Cybersecurity Risk Assessment card.
 * Real data from the CYBR 3300 coursework workbook (Risk Determination +
 * Risk Response tabs): 10 assets scored likelihood x impact against an org
 * risk threshold of 8, before and after mitigation. Renders into
 * #risk-matrix-demo. No libraries.
 */
(function () {
  "use strict";

  var THRESHOLD = 8;

  // [n, asset, beforeL, beforeI, afterL, afterI, controls added]
  var ASSETS = [
    [1, "Traverse ERP + SQL DB", 4, 5, 2, 4, "policy · IR/DR plan · training · redundant server"],
    [2, "Optimum HRIS + DB", 3, 4, 2, 4, "policy"],
    [3, "Traverse Accounting + SQL DB", 3, 4, 2, 4, "policy"],
    [4, "Exchange email server + DB", 4, 4, 2, 4, "policy · training"],
    [5, "Active Directory + SQL DB", 4, 5, 2, 4, "policy · IR/DR plan · backups"],
    [6, "Network Attached Storage #1", 3, 3, 2, 3, "policy · backups"],
    [7, "Office 365 server", 4, 4, 2, 4, "policy · IR/DR plan"],
    [8, "Primary DNS + SQL DB", 3, 3, 2, 3, "policy"],
    [9, "Network Attached Storage #2", 3, 3, 2, 3, "policy · backups"],
    [10, "Traverse Distribution + SQL DB", 3, 4, 2, 4, "policy"]
  ];

  var CSS = "" +
    ".rm { border:1px solid rgba(196,163,90,0.12); background:#0d0d13; padding:18px; margin-bottom:2rem; }" +
    ".rm-head { display:flex; flex-wrap:wrap; gap:8px 18px; align-items:baseline; justify-content:space-between; margin-bottom:14px; }" +
    ".rm-title { font-family:'JetBrains Mono',monospace; font-size:.6rem; letter-spacing:.22em; color:#c4a35a; text-transform:uppercase; }" +
    ".rm-stat { font-family:'JetBrains Mono',monospace; font-size:.72rem; color:#8e8880; }" +
    ".rm-stat b { font-weight:500; }" +
    ".rm-stat.bad b { color:#e05e5e; } .rm-stat.good b { color:#5cb17c; }" +
    ".rm-chart-wrap { max-width:480px; margin:0 auto; width:100%; }" +
    ".rm-chart { width:100%; height:auto; display:block; }" +
    ".rm-hint { font-family:'Outfit',sans-serif; font-weight:300; font-size:.82rem; line-height:1.65; color:#8e8880; margin:10px 0 4px; }" +
    ".rm-legend { display:flex; gap:16px; margin:6px 0 12px; font-family:'JetBrains Mono',monospace; font-size:.62rem; color:#8e8880; }" +
    ".rm-legend i { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:6px; }" +
    ".rm-scroll { overflow-x:auto; }" +
    ".rm-register { width:100%; border-collapse:collapse; font-family:'JetBrains Mono',monospace; font-size:.7rem; min-width:560px; }" +
    ".rm-register th { text-align:left; color:#6b655a; font-weight:400; font-size:.6rem; letter-spacing:.12em; text-transform:uppercase; padding:5px 14px 5px 0; border-bottom:1px solid rgba(196,163,90,0.3); }" +
    ".rm-register td { color:#8e8880; padding:6px 14px 6px 0; border-bottom:1px dashed rgba(196,163,90,0.12); white-space:nowrap; }" +
    ".rm-register td.name { color:#e5e1d6; }" +
    ".rm-register td.inh { color:#e05e5e; } .rm-register td.res { color:#5cb17c; }" +
    ".rm-register td.ctl { color:#c4a35a; white-space:normal; }" +
    ".rm-foot { display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-top:14px; }" +
    ".rm-toggle { font-family:'JetBrains Mono',monospace; font-weight:500; font-size:.64rem; text-transform:uppercase; letter-spacing:.16em; color:#c4a35a; background:transparent; border:1px solid rgba(196,163,90,0.45); padding:10px 18px; cursor:pointer; transition:background .15s,color .15s; }" +
    ".rm-toggle:hover { background:#c4a35a; color:#0b0b0f; }" +
    ".rm-src { font-family:'JetBrains Mono',monospace; font-size:.6rem; color:#6b655a; letter-spacing:.05em; }" +
    ".rm-dot { transition:transform .7s cubic-bezier(.3,.7,.2,1); }" +
    ".rm-dot circle { transition:fill .5s; }" +
    ".rm-dot text { font-family:'JetBrains Mono',monospace; font-size:8.5px; font-weight:600; fill:#0b0b0f; pointer-events:none; }" +
    "@media (prefers-reduced-motion: reduce) { .rm-dot, .rm-dot circle { transition:none; } }";

  // geometry
  var M = { l: 42, r: 12, t: 12, b: 40 };
  var CELL = 74;
  var W = M.l + CELL * 5 + M.r;
  var H = M.t + CELL * 5 + M.b;

  // cluster offsets for n dots sharing one cell (deterministic)
  var CLUSTERS = [
    [[0, 0]],
    [[-11, 0], [11, 0]],
    [[-12, 8], [12, 8], [0, -12]],
    [[-12, -12], [12, -12], [-12, 12], [12, 12]],
    [[0, 0], [-16, -12], [16, -12], [-16, 12], [16, 12]],
    [[-16, -14], [16, -14], [-16, 14], [16, 14], [-16, 0], [16, 0]],
    [[0, 0], [0, -18], [16, -9], [16, 9], [0, 18], [-16, 9], [-16, -9]]
  ];

  function cellOrigin(L, I) {
    return {
      x: M.l + (I - 1) * CELL + CELL / 2,
      y: M.t + (5 - L) * CELL + CELL / 2
    };
  }

  function positions(state) {
    var byCell = {};
    ASSETS.forEach(function (a) {
      var L = state === "before" ? a[2] : a[4];
      var I = state === "before" ? a[3] : a[5];
      var key = L + "," + I;
      (byCell[key] = byCell[key] || []).push(a[0]);
    });
    var out = {};
    Object.keys(byCell).forEach(function (key) {
      var parts = key.split(",");
      var c = cellOrigin(+parts[0], +parts[1]);
      var members = byCell[key];
      var offsets = CLUSTERS[members.length - 1];
      members.forEach(function (n, i) {
        out[n] = [c.x + offsets[i][0], c.y + offsets[i][1]];
      });
    });
    return out;
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function init() {
    var root = document.getElementById("risk-matrix-demo");
    if (!root) return;

    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var registerRows = ASSETS.map(function (a) {
      return "<tr><td>" + a[0] + '</td><td class="name">' + esc(a[1]) + "</td>" +
        '<td class="inh">' + a[2] + "×" + a[3] + " = " + (a[2] * a[3]) + "</td>" +
        '<td class="res">' + a[4] + "×" + a[5] + " = " + (a[4] * a[5]) + "</td>" +
        '<td class="ctl">+ ' + esc(a[6]) + "</td></tr>";
    }).join("");

    root.className = "rm";
    root.innerHTML =
      '<div class="rm-head"><span class="rm-title">Live data · Risk determination · org threshold ' + THRESHOLD + '</span>' +
      '<span class="rm-stat bad" id="rm-stat"></span></div>' +
      '<div class="rm-chart-wrap"></div>' +
      '<p class="rm-hint">Every asset is plotted by likelihood × impact; red cells sit above the ' +
      'organization’s risk threshold of ' + THRESHOLD + ', green at or below. Each numbered dot matches the ' +
      'register underneath. Apply the mitigations and watch the residual risk land inside appetite.</p>' +
      '<div class="rm-legend"><span><i style="background:#e05e5e"></i>above appetite</span>' +
      '<span><i style="background:#5cb17c"></i>within appetite</span></div>' +
      '<div class="rm-scroll"><table class="rm-register"><thead><tr>' +
      "<th>#</th><th>asset</th><th>inherent</th><th>residual</th><th>controls added</th>" +
      "</tr></thead><tbody>" + registerRows + "</tbody></table></div>" +
      '<div class="rm-foot"><button class="rm-toggle" id="rm-toggle" aria-pressed="false">Apply mitigations</button>' +
      '<span class="rm-src">likelihood × impact · 10 assets from the original coursework workbook</span></div>';

    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "rm-chart", role: "img", "aria-label": "Risk matrix: 10 assets plotted by likelihood and impact, before and after mitigation" });
    root.querySelector(".rm-chart-wrap").appendChild(svg);

    // cells tinted by whether L*I clears the threshold (mirrors the workbook's conditional formatting)
    for (var L = 1; L <= 5; L++) {
      for (var I = 1; I <= 5; I++) {
        var c = cellOrigin(L, I);
        var above = L * I > THRESHOLD;
        svg.appendChild(svgEl("rect", {
          x: c.x - CELL / 2, y: c.y - CELL / 2, width: CELL - 1, height: CELL - 1,
          fill: above ? "rgba(224,94,94,0.055)" : "rgba(92,177,124,0.05)"
        }));
        var t = svgEl("text", {
          x: c.x + CELL / 2 - 6, y: c.y - CELL / 2 + 13,
          "text-anchor": "end", fill: "#3f3b33",
          "font-family": "'JetBrains Mono',monospace", "font-size": "9"
        });
        t.textContent = L * I;
        svg.appendChild(t);
      }
    }

    // axes
    for (var i = 1; i <= 5; i++) {
      var xt = svgEl("text", { x: M.l + (i - 1) * CELL + CELL / 2, y: H - 22, "text-anchor": "middle", fill: "#8e8880", "font-family": "'JetBrains Mono',monospace", "font-size": "10" });
      xt.textContent = i;
      svg.appendChild(xt);
      var yt = svgEl("text", { x: M.l - 12, y: M.t + (5 - i) * CELL + CELL / 2 + 3, "text-anchor": "end", fill: "#8e8880", "font-family": "'JetBrains Mono',monospace", "font-size": "10" });
      yt.textContent = i;
      svg.appendChild(yt);
    }
    var xl = svgEl("text", { x: M.l + CELL * 2.5, y: H - 6, "text-anchor": "middle", fill: "#6b655a", "font-family": "'JetBrains Mono',monospace", "font-size": "9", "letter-spacing": "2" });
    xl.textContent = "IMPACT →";
    svg.appendChild(xl);
    var yl = svgEl("text", { x: 12, y: M.t + CELL * 2.5, "text-anchor": "middle", fill: "#6b655a", "font-family": "'JetBrains Mono',monospace", "font-size": "9", "letter-spacing": "2", transform: "rotate(-90 12 " + (M.t + CELL * 2.5) + ")" });
    yl.textContent = "LIKELIHOOD →";
    svg.appendChild(yl);

    // dots — numbered to match the register; no click states, the register is always visible
    var mitigated = false;
    var dots = {};
    var pos = positions("before");

    ASSETS.forEach(function (a) {
      var g = svgEl("g", { class: "rm-dot" });
      g.style.transform = "translate(" + pos[a[0]][0] + "px," + pos[a[0]][1] + "px)";
      var title = svgEl("title", {});
      title.textContent = a[0] + " · " + a[1];
      g.appendChild(title);
      var circle = svgEl("circle", { r: 9, fill: riskColor(a, false), stroke: "#0b0b0f", "stroke-width": "2" });
      var label = svgEl("text", { "text-anchor": "middle", dy: "3" });
      label.textContent = a[0];
      g.appendChild(circle);
      g.appendChild(label);
      svg.appendChild(g);
      dots[a[0]] = { g: g, circle: circle };
    });

    function riskColor(a, afterState) {
      var risk = afterState ? a[4] * a[5] : a[2] * a[3];
      return risk > THRESHOLD ? "#e05e5e" : "#5cb17c";
    }

    function layout() {
      var p = positions(mitigated ? "after" : "before");
      ASSETS.forEach(function (a) {
        dots[a[0]].g.style.transform = "translate(" + p[a[0]][0] + "px," + p[a[0]][1] + "px)";
        dots[a[0]].circle.setAttribute("fill", riskColor(a, mitigated));
      });
      var above = ASSETS.filter(function (a) {
        return (mitigated ? a[4] * a[5] : a[2] * a[3]) > THRESHOLD;
      }).length;
      var stat = document.getElementById("rm-stat");
      stat.className = "rm-stat " + (above ? "bad" : "good");
      stat.innerHTML = "<b>" + above + " of " + ASSETS.length + "</b> assets above risk appetite" +
        (above ? "" : " · all residual risk ≤ " + THRESHOLD);
    }

    document.getElementById("rm-toggle").addEventListener("click", function () {
      mitigated = !mitigated;
      this.textContent = mitigated ? "Reset to inherent risk" : "Apply mitigations";
      this.setAttribute("aria-pressed", String(mitigated));
      layout();
    });

    layout();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
