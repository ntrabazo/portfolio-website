# nicolastrabazo.com

Source for my personal portfolio at **[nicolastrabazo.com](https://nicolastrabazo.com)** — a
single hand-built page with live, interactive demos of the projects it describes. No framework,
no build step: vanilla HTML, CSS, and JavaScript.

## What's interesting here

Most portfolios describe projects. This one lets you run them, right in the browser:

- **[Gatekeep](https://nicolastrabazo.com/gatekeep/)** — a prompt-firewall proxy for the Anthropic
  API. The full detection engine (secret + PII detectors, policy engine, audit log) is ported to
  JavaScript and runs client-side, so you can type a prompt and watch it get blocked, redacted, or
  allowed. Parity-tested against the real Python engine.
- **Murmur** — the self-correcting learning loop from my local dictation app, ported from the real
  modules. Correct a mishearing once and watch the dictionary and model prompts update.
- **Enterprise Risk Management** and **Cybersecurity Risk Assessment** — interactive risk visuals
  driven by real data from my graduate and undergraduate coursework: inherent vs. residual risk,
  toggle the mitigations, watch the scores move.
- **AI OS** — a clickable map of the personal AI operating system I run on top of Claude Code, with
  live counts of its skills, agents, and memory.

Each demo is a small, dependency-free module in [`demos/`](demos/) and [`gatekeep/`](gatekeep/).

## Design

Dark, editorial, gold-on-near-black. Cormorant for display type, JetBrains Mono for data, Outfit
for body. Custom cursor, film-grain overlay, scroll-reveal, and a full `prefers-reduced-motion`
fallback. Everything is theme-consistent across the page and the standalone demo.

## Run it locally

```bash
node serve.mjs      # zero-dependency static server → http://localhost:3000
```

Or open `index.html` directly in a browser.

## Deployment

Deployed to Cloudflare Pages. This repository is the source of record; it does not auto-deploy.

## License

Code is MIT. Résumé and personal content are not licensed for reuse.
