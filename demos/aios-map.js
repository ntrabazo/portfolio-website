/*
 * AI OS interactive system map — AI OS card.
 * Hub-and-spoke map of the real system; click a node for what it does.
 * STATS are counted from the live system (regenerate: count dirs/files in
 * .claude/skills, .claude/agents, AIOS/frameworks, AIOS/references, and the
 * memory home). Captured 2026-07-09.
 */
(function () {
  "use strict";

  var STATS = [
    ["22", "skills"],
    ["12", "agents"],
    ["9", "frameworks"],
    ["25", "domain docs"],
    ["44", "memory files"]
  ];

  var NODES = [
    { id: "core", label: "Claude Code", core: true,
      desc: "The engine: a terminal-native AI agent that does the actual work — writes code, runs commands, drives the browser, reads and writes files. Everything else in the map exists to make it reliable." },
    { id: "constitution", label: "Constitution",
      desc: "A dispatch table (CLAUDE.md) read at the start of every session. It holds almost no knowledge itself; its job is routing every kind of task to the one document that does. Add a row, never a paragraph." },
    { id: "frameworks", label: "Frameworks", count: "9",
      desc: "One playbook per action class: installing something external, deploying, saving a memory, planning, starting a project. The agent follows the written procedure, not its mood — that is what makes runs repeatable." },
    { id: "refs", label: "Domain docs", count: "25",
      desc: "Per-domain standard operating procedures with exact commands, IDs, and known gotchas: Google Workspace, Cloudflare deploys, Notion, MCP configuration. Each domain has exactly one source of truth." },
    { id: "skills", label: "Skills", count: "22",
      desc: "Phrase-triggered procedures: a morning brief, weekly reviews, security scans, multi-agent research pipelines, diagram builders. Saying the trigger phrase is the whole interface." },
    { id: "agents", label: "Agents", count: "12",
      desc: "Specialized subagents spawned for scoped jobs: a read-only security scanner that vets anything external before it is installed, research workers, a verifier that grades finished work, planner and critic roles for high-stakes builds." },
    { id: "memory", label: "Memory", count: "44",
      desc: "Persistent files, one fact each, read at session start and written the moment something is learned. Corrections are saved immediately, so the system remembers being wrong and stops repeating it." },
    { id: "router", label: "Memory router",
      desc: "A hook that inspects every prompt before the agent acts and injects the matching domain doc. Keyword map, deterministic — the right procedure shows up without being asked for." },
    { id: "integrations", label: "Integrations",
      desc: "MCP connections into Gmail, Drive, Calendar, Sheets, Notion, Perplexity, and the browser. The agent works where the data already lives instead of copy-pasting through a chat window." },
    { id: "guardrails", label: "Guardrails",
      desc: "Nothing external is installed without an automated security scan and an explicit verdict. A system lint checks for drift. Irreversible or outward-facing actions sit behind hard confirmation gates." },
    { id: "automations", label: "Automations",
      desc: "Scheduled loops that run without being asked: a daily brief assembled from calendar and task systems, weekly reviews, recurring maintenance. Built once, then they just happen." }
  ];

  var CSS = "" +
    ".am { border:1px solid rgba(196,163,90,0.12); background:#0d0d13; padding:18px; margin-bottom:2rem; }" +
    ".am-stats { display:flex; flex-wrap:wrap; gap:1px; background:rgba(196,163,90,0.12); border:1px solid rgba(196,163,90,0.12); margin-bottom:16px; }" +
    ".am-stat { flex:1 1 100px; background:#0d0d13; padding:12px 14px; text-align:center; }" +
    ".am-stat b { display:block; font-family:'JetBrains Mono',monospace; font-weight:500; font-size:1.5rem; color:#e5e1d6; }" +
    ".am-stat span { font-family:'JetBrains Mono',monospace; font-size:.6rem; letter-spacing:.14em; color:#6b655a; text-transform:uppercase; }" +
    ".am-body { display:flex; gap:18px; }" +
    ".am-chart-wrap { flex:1 1 380px; min-width:0; }" +
    ".am-chart { width:100%; height:auto; display:block; }" +
    ".am-panel { flex:1 1 250px; min-width:230px; border:1px solid rgba(196,163,90,0.12); background:#0b0b0f; padding:14px; font-family:'Outfit',sans-serif; font-weight:300; font-size:.82rem; line-height:1.7; color:#8e8880; }" +
    ".am-panel h4 { font-family:'JetBrains Mono',monospace; font-size:.68rem; letter-spacing:.12em; color:#c4a35a; font-weight:500; margin:0 0 8px; text-transform:uppercase; }" +
    ".am-node { cursor:pointer; }" +
    ".am-node rect { fill:#0b0b0f; stroke:rgba(196,163,90,0.3); transition:stroke .15s, fill .15s; }" +
    ".am-node text { font-family:'JetBrains Mono',monospace; font-size:10.5px; fill:#8e8880; transition:fill .15s; }" +
    ".am-node text.count { fill:#c4a35a; font-size:9px; }" +
    ".am-node:hover rect, .am-node.sel rect { stroke:#c4a35a; fill:#12100a; }" +
    ".am-node:hover text, .am-node.sel text { fill:#e5e1d6; }" +
    ".am-node.core rect { stroke:#c4a35a; fill:#12100a; }" +
    ".am-node.core text { fill:#c4a35a; font-weight:600; letter-spacing:1px; }" +
    ".am-link { stroke:rgba(196,163,90,0.16); stroke-width:1; }" +
    ".am-cap { font-family:'JetBrains Mono',monospace; font-size:.6rem; color:#6b655a; letter-spacing:.05em; margin-top:12px; }" +
    "@media (max-width:760px) { .am-body { flex-direction:column; } .am-panel { min-width:0; } }";

  function svgEl(tag, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var W = 560, H = 400, CX = W / 2, CY = H / 2, RX = 215, RY = 152;

  function init() {
    var root = document.getElementById("aios-map-demo");
    if (!root) return;
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    root.className = "am";
    root.innerHTML =
      '<div class="am-stats">' + STATS.map(function (s) {
        return '<div class="am-stat"><b>' + s[0] + "</b><span>" + s[1] + "</span></div>";
      }).join("") + "</div>" +
      '<div class="am-body"><div class="am-chart-wrap"></div><div class="am-panel" id="am-panel"></div></div>' +
      '<div class="am-cap">counts are real, captured from the live system · click a node</div>';

    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "am-chart", role: "img", "aria-label": "AI OS system map" });
    root.querySelector(".am-chart-wrap").appendChild(svg);

    var spokes = NODES.filter(function (n) { return !n.core; });
    var coords = { core: [CX, CY] };
    spokes.forEach(function (n, i) {
      var angle = (Math.PI * 2 * i) / spokes.length - Math.PI / 2;
      coords[n.id] = [CX + RX * Math.cos(angle), CY + RY * Math.sin(angle)];
    });

    spokes.forEach(function (n) {
      svg.appendChild(svgEl("line", { x1: CX, y1: CY, x2: coords[n.id][0], y2: coords[n.id][1], class: "am-link" }));
    });

    var selected = null;
    var els = {};
    NODES.forEach(function (n) {
      var c = coords[n.id];
      var w = n.core ? 120 : 104, h = n.core ? 40 : 32;
      var g = svgEl("g", { class: "am-node" + (n.core ? " core" : ""), tabindex: "0", role: "button", "aria-label": n.label });
      g.appendChild(svgEl("rect", { x: c[0] - w / 2, y: c[1] - h / 2, width: w, height: h, rx: 2 }));
      var t = svgEl("text", { x: c[0], y: c[1] + (n.count ? -1 : 3.5), "text-anchor": "middle" });
      t.textContent = n.label;
      g.appendChild(t);
      if (n.count) {
        var ct = svgEl("text", { x: c[0], y: c[1] + 11, "text-anchor": "middle", class: "count" });
        ct.textContent = n.count;
        g.appendChild(ct);
      }
      function pick() {
        selected = n;
        NODES.forEach(function (m) { els[m.id].classList.toggle("sel", m === n); });
        document.getElementById("am-panel").innerHTML =
          "<h4>" + esc(n.label) + (n.count ? " · " + n.count : "") + "</h4><p>" + esc(n.desc) + "</p>";
      }
      g.addEventListener("click", pick);
      g.addEventListener("mouseenter", pick);
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      svg.appendChild(g);
      els[n.id] = g;
    });

    // default: core selected
    document.getElementById("am-panel").innerHTML =
      "<h4>" + NODES[0].label + "</h4><p>" + esc(NODES[0].desc) + "</p>";
    els.core.classList.add("sel");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
