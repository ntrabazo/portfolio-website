/*
 * Retrace search engine — JavaScript port for the static demo page.
 *
 * Ported 1:1 from the Python engine (src/search/hybrid.py, src/capture/embed.py):
 *   - tokenize / lexicalRank mirror build_fts_query() + SQLite FTS5's bm25().
 *   - semanticRank mirrors semantic_channel() (normalized cosine, ties by id).
 *   - rrfFuse is an exact port of rrf_fuse() (score += 1/(k+rank), 1-based rank).
 *   - assess mirrors the real confidence gate in hybrid.py's _single_pass()
 *     for hybrid (chip) mode. Lexical-only (typed-query) mode has no real-app
 *     equivalent — there is only one channel, so the RRF threshold is
 *     meaningless (a lone channel's top score is always exactly 1/61) and the
 *     gate simply checks whether anything matched at all.
 *
 * Parity is enforced by demo/selftest.node.js, which replays every corpus.js
 * chip through this port and compares ranked-id order + fused scores against
 * the EXPECTED block (computed by demo/build_corpus.py from the real Python
 * engine).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Retrace = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---- src/search/hybrid.py build_fts_query() term extraction -------------
  const TOKEN_RE = /[\p{L}\p{N}_]+/gu;

  // Query-term extraction (mirrors build_fts_query): dedupe, drop len<2
  // non-digits. Used ONLY for parsing the query string into match terms.
  function tokenize(text) {
    const seen = new Set();
    const out = [];
    for (const m of String(text || "").matchAll(TOKEN_RE)) {
      const tok = m[0];
      const low = tok.toLowerCase();
      if (tok.length < 2 && !/^[0-9]$/.test(tok)) continue;
      if (seen.has(low)) continue;
      seen.add(low);
      out.push(low);
    }
    return out;
  }

  // Document tokenization for the lexical index: NO dedup, NO length-2
  // minimum. The real FTS5 unicode61 tokenizer indexes every token —
  // including single letters like "a" — it's build_fts_query()'s len<2 drop
  // that's a QUERY-side sanitization rule, not how documents get indexed.
  // Conflating the two (both dedup and the length filter) was the original
  // bug: it collapsed every term frequency to 0/1 and shortened document
  // length, throwing off BM25's length normalization for every document.
  function tokenizeDoc(text) {
    const out = [];
    for (const m of String(text || "").matchAll(TOKEN_RE)) {
      out.push(m[0].toLowerCase());
    }
    return out;
  }

  // ---- lexical index — empirically, SQLite FTS5's bm25() on a
  // ---- fts5(window_title, ocr_text) table blends both columns into ONE
  // ---- field for term-frequency AND length-normalization purposes (row-level
  // ---- dl/avgdl over the combined token stream, term freq summed across
  // ---- columns) rather than true independent per-column BM25F. Verified by
  // ---- fitting against raw bm25(cap) output from the real sqlite3 module.
  function buildIndex(moments) {
    const docs = new Map(); // id -> { tf: Map, len: number }
    const df = new Map(); // term -> row count
    let totalLen = 0;

    for (const m of moments) {
      const text = `${m.window_title || ""} ${m.ocr_text || ""}`;
      const terms = tokenizeDoc(text);
      const tf = new Map();
      for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
      docs.set(m.id, { tf, len: terms.length });
      totalLen += terms.length;
      for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    }

    const n = moments.length;
    const avgdl = n > 0 ? totalLen / n : 0;
    return { docs, df, n, avgdl };
  }

  // ---- SQLite FTS5 bm25(): k1=1.2, b=0.75, IDF = ln((N-df+0.5)/(df+0.5)), --
  // ---- no +1 smoothing, no clamping. OR semantics over deduped terms. -----
  const K1 = 1.2;
  const B = 0.75;

  function lexicalRank(index, query) {
    const terms = tokenize(query);
    if (terms.length === 0) return [];

    const scores = new Map();
    for (const [id, doc] of index.docs) {
      let score = 0;
      let matched = false;
      for (const t of terms) {
        const tf = doc.tf.get(t) || 0;
        if (tf === 0) continue;
        matched = true;
        const dfT = index.df.get(t) || 0;
        const idf = Math.log((index.n - dfT + 0.5) / (dfT + 0.5));
        const denom = tf + K1 * (1 - B + (B * doc.len) / (index.avgdl || 1));
        score += idf * ((tf * (K1 + 1)) / denom);
      }
      if (matched) scores.set(id, score);
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 50)
      .map((e) => e[0]);
  }

  // ---- semantic_channel(): normalized cosine over baked vectors -----------
  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = (Math.sqrt(na) || 1) * (Math.sqrt(nb) || 1);
    return dot / denom;
  }

  function semanticRank(moments, qvec) {
    if (!qvec) return [];
    const scored = moments.map((m) => [m.id, cosine(m.vec, qvec)]);
    scored.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    return scored.slice(0, 50).map((e) => e[0]);
  }

  // ---- rrf_fuse(): score(d) = sum(1/(k+rank)), rank 1-based ---------------
  function rrfFuse(rankedLists, k) {
    if (k === undefined) k = 60;
    const scores = new Map();
    for (const ranked of rankedLists) {
      ranked.forEach((id, i) => {
        const rank = i + 1;
        scores.set(id, (scores.get(id) || 0) + 1 / (k + rank));
      });
    }
    return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  }

  // ---- confidence gate ------------------------------------------------------
  // Hybrid mode (chips): real hybrid.py gate, verbatim — low when fused is
  // empty, top score is below CONFIDENCE_MIN_TOP_RRF, or either channel came
  // back with zero results.
  // Lexical-only mode (typed queries): no real-app equivalent exists — a
  // single-channel top RRF score is always exactly 1/(k+1), so the threshold
  // carries no information. The only meaningful gate is "did anything match".
  function assess(fused, lexLen, semLen, mode, minTopRrf) {
    if (mode === "lexical-only") {
      return lexLen === 0 ? "low" : "high-unscored";
    }
    if (!fused.length || fused[0][1] < minTopRrf || lexLen === 0 || semLen === 0) {
      return "low";
    }
    return "high";
  }

  function search(corpus, query, chipId) {
    const index = corpus.__index || (corpus.__index = buildIndex(corpus.MOMENTS));
    const k = corpus.CONSTANTS.RRF_K;
    const minTopRrf = corpus.CONSTANTS.CONFIDENCE_MIN_TOP_RRF;

    const chip = chipId ? corpus.CHIPS.find((c) => c.id === chipId) : null;
    const mode = chip ? "hybrid" : "lexical-only";

    const lex = lexicalRank(index, query);
    const sem = mode === "hybrid" ? semanticRank(corpus.MOMENTS, chip.qvec) : [];
    const fused = mode === "hybrid" ? rrfFuse([lex, sem], k) : rrfFuse([lex], k);
    const confidence = assess(fused, lex.length, sem.length, mode, minTopRrf);

    return { lex, sem, fused, confidence, mode };
  }

  return {
    tokenize: tokenize,
    tokenizeDoc: tokenizeDoc,
    buildIndex: buildIndex,
    lexicalRank: lexicalRank,
    semanticRank: semanticRank,
    cosine: cosine,
    rrfFuse: rrfFuse,
    assess: assess,
    search: search,
  };
});
