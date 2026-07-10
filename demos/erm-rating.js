/*
 * Enterprise risk register — Enterprise Risk Management card.
 * Real records from the Clearwater IRM|Pro risk-rating extract (CYBR 7300):
 * five asset-threat-vulnerability findings scored likelihood x impact, then
 * treated (Mitigate) down to residual risk. Renders into #erm-rating-demo.
 */
(function () {
  "use strict";

  var THRESHOLD = 8;
  var MAX = 25;

  var RISKS = [
    { vuln: "Security staffing deficiencies", threat: "Failure to identify and manage material security risks",
      L: 4, I: 5, residual: 6, controls: ["Information systems security management"] },
    { vuln: "No periodic risk analyses", threat: "Failure to identify and manage material security risks",
      L: 4, I: 5, residual: 4, controls: ["Periodic risk analyses"] },
    { vuln: "Insufficient security budget", threat: "Insufficient risk management",
      L: 4, I: 5, residual: 6, controls: ["Security governance", "Security budget process"] },
    { vuln: "No risk response process", threat: "Insufficient risk management",
      L: 3, I: 5, residual: 6, controls: ["Security governance", "Risk management process"] },
    { vuln: "No timely cyber intelligence", threat: "Failure to identify emerging security risks",
      L: 3, I: 5, residual: 8, controls: ["Security workforce training", "Threat/vulnerability intelligence"] }
  ];

  var CSS = "" +
    ".er { border:1px solid rgba(196,163,90,0.12); background:#0d0d13; padding:18px; margin-bottom:2rem; }" +
    ".er-head { display:flex; flex-wrap:wrap; gap:8px 18px; align-items:baseline; justify-content:space-between; margin-bottom:16px; }" +
    ".er-title { font-family:'JetBrains Mono',monospace; font-size:.6rem; letter-spacing:.22em; color:#c4a35a; text-transform:uppercase; }" +
    ".er-stat { font-family:'JetBrains Mono',monospace; font-size:.72rem; color:#8e8880; }" +
    ".er-stat b { font-weight:500; }" +
    ".er-stat.bad b { color:#e05e5e; } .er-stat.good b { color:#5cb17c; }" +
    ".er-scale { position:relative; height:16px; margin:0 0 4px; font-family:'JetBrains Mono',monospace; font-size:.58rem; color:#6b655a; }" +
    ".er-scale span { position:absolute; transform:translateX(-50%); }" +
    ".er-row { margin-bottom:14px; }" +
    ".er-lbl { font-family:'Outfit',sans-serif; font-weight:400; font-size:.82rem; color:#e5e1d6; margin-bottom:2px; }" +
    ".er-threat { font-family:'JetBrains Mono',monospace; font-size:.6rem; color:#6b655a; letter-spacing:.04em; margin-left:8px; }" +
    ".er-track { position:relative; height:22px; background:#0b0b0f; border:1px solid rgba(196,163,90,0.1); }" +
    ".er-thresh { position:absolute; top:-3px; bottom:-3px; width:0; border-left:1px dashed rgba(196,163,90,0.55); }" +
    ".er-conn { position:absolute; top:50%; height:2px; transform:translateY(-50%); background:linear-gradient(90deg,#5cb17c,#e05e5e); width:0; transition:width .7s cubic-bezier(.3,.7,.2,1), left .7s cubic-bezier(.3,.7,.2,1); }" +
    ".er-dot { position:absolute; top:50%; width:12px; height:12px; border-radius:50%; transform:translate(-50%,-50%); border:2px solid #0b0b0f; transition:left .7s cubic-bezier(.3,.7,.2,1), opacity .5s; }" +
    ".er-dot.inh { background:#e05e5e; }" +
    ".er-dot.res { background:#5cb17c; opacity:0; }" +
    ".er-val { font-family:'JetBrains Mono',monospace; font-size:.66rem; color:#8e8880; margin-top:3px; }" +
    ".er-val .inh { color:#e05e5e; } .er-val .res { color:#5cb17c; } .er-val .arr { color:#6b655a; }" +
    ".er-ctrls { display:flex; flex-wrap:wrap; gap:5px; margin-top:5px; max-height:0; overflow:hidden; opacity:0; transition:max-height .5s, opacity .5s; }" +
    ".er.treated .er-ctrls { max-height:60px; opacity:1; }" +
    ".er.treated .er-dot.res { opacity:1; }" +
    ".er-ctrl { font-family:'JetBrains Mono',monospace; font-size:.6rem; color:#c4a35a; border:1px solid rgba(196,163,90,0.28); padding:2px 7px; }" +
    ".er-foot { display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-top:16px; }" +
    ".er-toggle { font-family:'JetBrains Mono',monospace; font-weight:500; font-size:.64rem; text-transform:uppercase; letter-spacing:.16em; color:#c4a35a; background:transparent; border:1px solid rgba(196,163,90,0.45); padding:10px 18px; cursor:pointer; transition:background .15s,color .15s; }" +
    ".er-toggle:hover { background:#c4a35a; color:#0b0b0f; }" +
    ".er-src { font-family:'JetBrains Mono',monospace; font-size:.6rem; color:#6b655a; letter-spacing:.05em; }" +
    ".er-legend { display:flex; gap:16px; margin-top:8px; font-family:'JetBrains Mono',monospace; font-size:.62rem; color:#8e8880; }" +
    ".er-legend i { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:6px; }" +
    "@media (prefers-reduced-motion: reduce) { .er-dot, .er-conn, .er-ctrls { transition:none; } }";

  function pct(v) { return (v / MAX) * 100; }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function init() {
    var root = document.getElementById("erm-rating-demo");
    if (!root) return;
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    root.className = "er";
    var rows = RISKS.map(function (r) {
      var inh = r.L * r.I;
      return '<div class="er-row">' +
        '<div class="er-lbl">' + esc(r.vuln) + '<span class="er-threat">' + esc(r.threat) + "</span></div>" +
        '<div class="er-track">' +
        '<div class="er-thresh" style="left:' + pct(THRESHOLD) + '%"></div>' +
        '<div class="er-conn" data-inh="' + inh + '" data-res="' + r.residual + '" style="left:' + pct(inh) + '%"></div>' +
        '<div class="er-dot inh" style="left:' + pct(inh) + '%"></div>' +
        '<div class="er-dot res" data-inh="' + inh + '" data-res="' + r.residual + '" style="left:' + pct(inh) + '%"></div>' +
        "</div>" +
        '<div class="er-val">inherent <span class="inh">L' + r.L + "×I" + r.I + " = " + inh + "</span>" +
        '<span class="treated-only"> <span class="arr">→ mitigated →</span> residual <span class="res">' + r.residual + "</span></span></div>" +
        '<div class="er-ctrls">' + r.controls.map(function (c) { return '<span class="er-ctrl">+ ' + esc(c) + "</span>"; }).join("") + "</div>" +
        "</div>";
    }).join("");

    root.innerHTML =
      '<div class="er-head"><span class="er-title">Live data · Enterprise risk register · threshold ' + THRESHOLD + '</span>' +
      '<span class="er-stat bad" id="er-stat"></span></div>' +
      '<div class="er-scale"><span style="left:0%">0</span><span style="left:' + pct(5) + '%">5</span>' +
      '<span style="left:' + pct(THRESHOLD) + '%; color:#c4a35a">8</span>' +
      '<span style="left:' + pct(15) + '%">15</span><span style="left:' + pct(20) + '%">20</span>' +
      '<span style="left:100%">25</span></div>' +
      rows +
      '<div class="er-legend"><span><i style="background:#e05e5e"></i>inherent risk</span>' +
      '<span><i style="background:#5cb17c"></i>residual after treatment</span>' +
      '<span style="color:#c4a35a">┆ risk threshold</span></div>' +
      '<div class="er-foot"><button class="er-toggle" id="er-toggle" aria-pressed="false">Apply risk treatment · mitigate</button>' +
      '<span class="er-src">asset–threat–vulnerability records from the Clearwater IRM|Pro extract</span></div>';

    // hide the residual half of the value lines until treated
    var treatedOnly = root.querySelectorAll(".treated-only");
    treatedOnly.forEach(function (el) { el.style.display = "none"; });

    var treated = false;
    function layout() {
      root.classList.toggle("treated", treated);
      root.querySelectorAll(".er-dot.res").forEach(function (d) {
        d.style.left = pct(treated ? +d.dataset.res : +d.dataset.inh) + "%";
      });
      root.querySelectorAll(".er-conn").forEach(function (c) {
        var inh = +c.dataset.inh, res = +c.dataset.res;
        c.style.left = pct(treated ? res : inh) + "%";
        c.style.width = treated ? (pct(inh) - pct(res)) + "%" : "0%";
      });
      treatedOnly.forEach(function (el) { el.style.display = treated ? "" : "none"; });
      var above = RISKS.filter(function (r) { return (treated ? r.residual : r.L * r.I) > THRESHOLD; }).length;
      var stat = document.getElementById("er-stat");
      stat.className = "er-stat " + (above ? "bad" : "good");
      stat.innerHTML = "<b>" + above + " of " + RISKS.length + "</b> risks above threshold" +
        (above ? "" : " · all residual ≤ " + THRESHOLD);
    }

    document.getElementById("er-toggle").addEventListener("click", function () {
      treated = !treated;
      this.textContent = treated ? "Reset to inherent risk" : "Apply risk treatment · mitigate";
      this.setAttribute("aria-pressed", String(treated));
      layout();
    });

    layout();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
