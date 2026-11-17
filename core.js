/* =====================================================================
   WEEKWISE CORE — a syllabus-first study engine that runs on the phone.
   Input : course material (+ optional summary) as layout "docs",
           and the LMS week list as plain text.
   Output: a course "atlas": every week mapped to its part of the
           material, with terms, key points, lists, formulas, examples,
           summary points, questions, flashcards and model answers.
   No AI, no network.
   ===================================================================== */
const WW = (() => {
"use strict";

/* ---------- 0. language helpers ---------- */
const STOP = new Set("a an and are as at be been being but by can could did do does for from had has have having he her his how i if in into is it its may might must no nor not of on or our she should so such than that the their them then there these they this those to too under up upon us very was we were what when where which while who whom why will with would you your also each other any all both more most some only own same just per via e.g i.e etc one two three four five six first second third use used using within without between about over across after before during".split(" "));
const SUFFIX = [["ational", "ate"], ["tional", "tion"], ["iveness", "ive"], ["fulness", "ful"], ["ousness", "ous"], ["ization", "ize"], ["isation", "ize"], ["ations", "ate"], ["ation", "ate"], ["ments", ""], ["ment", ""], ["ities", ""], ["ity", ""], ["ness", ""], ["ingly", ""], ["ings", ""], ["ing", ""], ["ies", "y"], ["ied", "y"], ["ions", ""], ["ion", ""], ["ally", "al"], ["ly", ""], ["ers", ""], ["er", ""], ["es", ""], ["ed", ""], ["s", ""]];
function stem(w) { w = w.toLowerCase(); if (w.length < 4) return w; for (const [a, b] of SUFFIX) if (w.endsWith(a) && w.length - a.length >= 3) return w.slice(0, -a.length) + b; return w; }
function clean(s) { return String(s || "").normalize("NFC").replace(/[ﬀ]/g, "ff").replace(/ﬁ/g, "fi").replace(/ﬂ/g, "fl").replace(/ﬃ/g, "ffi").replace(/ﬄ/g, "ffl").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ /g, " ").replace(/[​-‍﻿­]/g, "").replace(/[\u{1D400}-\u{1D7FF}]/gu, c => c.normalize("NFKC")); }
function terms(s) {
  const out = []; const t = clean(s).toLowerCase();
  (t.match(/\b[a-zωθ]\s*\([^()]{1,10}\)/g) || []).forEach(x => out.push(x.replace(/\s+/g, "")));
  for (const w of t.split(/[^a-z0-9²³ⁿ]+/)) { if (w.length < 2 || STOP.has(w) || /^\d+$/.test(w)) continue; out.push(stem(w)); }
  return out;
}
const wc = s => String(s).trim().split(/\s+/).filter(Boolean).length;
const cap1 = s => { s = String(s).trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };
const trimTo = (s, n) => { const w = String(s).split(/\s+/); return w.length <= n ? String(s) : w.slice(0, n).join(" ").replace(/[,;:]$/, "") + "…"; };
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = t => new RegExp("(?<![A-Za-z0-9])" + esc(t) + "(?![A-Za-z0-9])", "i");
function bag(list) { const m = new Map(); for (const t of list) m.set(t, (m.get(t) || 0) + 1); return m; }
function cos(a, b) { if (!a.size || !b.size) return 0; let d = 0, x = 0, y = 0; for (const [k, v] of a) { x += v * v; const u = b.get(k); if (u) d += v * u; } for (const v of b.values()) y += v * v; return d / Math.sqrt(x * y); }
function overlap(a, b) { const A = new Set(a), B = new Set(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); }
function seeded(seed) { let s = seed >>> 0 || 7; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function mix(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hashStr(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h; }

/* ---------- 1. glyph repair (unknown ligature glyphs, dropped ff/fi/tt) ---------- */
const COMMON = new Set("different difference differentiate efficient efficiency effective effect effects affect affected offer office official sufficient coefficient difficult difficulty specific significant scientific artificial field figure first final finally file files finite fixed flow float matter pattern attention attribute attempt buffer suffix prefix identify define defined definition benefit profile classify modify satisfy flexible reflect influence conflict setting button bottom written little settle committee typically optimal shift after often software effort staff stuff fluctuate confidence configuration filter finance financial firm firms fiscal profit profits profitable afford traffic deficit officer suffer fifty fifth scaffold".split(" "));
function repairGlyphs(lines, extraVocab) {
  const vocab = new Set(COMMON); (extraVocab || []).forEach(w => vocab.add(w));
  lines.forEach(l => l.text.toLowerCase().split(/[^a-z]+/).forEach(w => { if (w.length > 4) vocab.add(w); }));
  const votes = {};
  lines.forEach(l => (l.text.match(/[A-Za-z]*[-][A-Za-z-]*/g) || []).forEach(w => {
    [...new Set(w.match(/[-]/g))].forEach(ch => ["ff", "fi", "ffi", "fl", "ffl", "tt", "ft", "th"].forEach(c => { const cand = w.split(ch).join(c).toLowerCase(); if (!/[-]/.test(cand) && vocab.has(cand)) { (votes[ch] = votes[ch] || {})[c] = ((votes[ch] || {})[c] || 0) + 1; } }));
  }));
  const map = {}; for (const ch in votes) map[ch] = Object.entries(votes[ch]).sort((a, b) => b[1] - a[1])[0][0];
  // dropped-glyph words: "eicient" -> "efficient" when the repaired word is known
  const drop = {}; for (const w of COMMON) for (const g of ["ffi", "ff", "fi", "fl", "tt", "ft"]) { let i = w.indexOf(g); while (i >= 0) { const b = w.slice(0, i) + w.slice(i + g.length); if (b.length > 3 && !vocab.has(b) && !STOP.has(b)) drop[b] = w; const b2 = w.slice(0, i) + w.slice(i + g.length - 1); if (g.length > 2 && b2.length > 3 && !vocab.has(b2)) drop[b2] = w; i = w.indexOf(g, i + 1); } }
  lines.forEach(l => {
    l.text = l.text.replace(/[-]/g, ch => map[ch] || "").replace(/[A-Za-z]{4,}/g, w => { const f = drop[w.toLowerCase()]; if (!f) return w; return w[0] === w[0].toUpperCase() ? f[0].toUpperCase() + f.slice(1) : f; });
  });
}

/* ---------- 2. layout: pdf.js text content → lines ---------- */
const SUPS = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "n": "ⁿ", "+": "⁺", "-": "⁻", "x": "ˣ", "k": "ᵏ", "i": "ⁱ" };
function linesFromPdfPage(tc, pageNo, styles) {
  const runs = [];
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const m = it.transform; const size = Math.hypot(m[2], m[3]) || it.height || 10;
    const fam = styles && styles[it.fontName] ? styles[it.fontName].fontFamily || "" : "";
    runs.push({ s: it.str, x: m[4], y: m[5], w: it.width || 0, size, bold: /bold|black|heavy|semibold|-bd|,bold/i.test((it.fontName || "") + " " + fam), ocr: it.fontName === "ocr" });
  }
  runs.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  for (const r of runs) {
    const row = rows.find(L => { const big = Math.max(L.size, r.size), small = Math.min(L.size, r.size); const tol = small < big * 0.85 ? big * 0.6 : small * 0.5; return Math.abs(L.y - r.y) < tol && small > big * 0.4 && r.x - L.x1 < big * 3.5 && L.x0 - (r.x + r.w) < big * 3.5; });
    if (row) { row.runs.push(r); row.x0 = Math.min(row.x0, r.x); row.x1 = Math.max(row.x1, r.x + r.w); if (r.size > row.size) { row.size = r.size; row.y = r.y; } }
    else rows.push({ y: r.y, x0: r.x, x1: r.x + r.w, size: r.size, runs: [r] });
  }
  return rows.map(row => {
    row.runs.sort((a, b) => a.x - b.x); const base = row.size; let t = "", end = null;
    for (const r of row.runs) {
      let s = r.s; const sup = r.size < base * 0.82 && r.y > row.y + base * 0.15 && s.trim().length <= 4;
      if (sup) { const k = s.trim(); s = [...k].every(c => SUPS[c]) ? [...k].map(c => SUPS[c]).join("") : "^" + k; t = t.replace(/\s+$/, ""); }
      else if (end !== null && r.x - end > r.size * 0.2 && !t.endsWith(" ") && !s.startsWith(" ")) t += " ";
      t += s; end = r.x + r.w;
    }
    const boldShare = row.runs.filter(r => r.bold).reduce((a, r) => a + r.s.length, 0) / Math.max(1, row.runs.reduce((a, r) => a + r.s.length, 0));
    return { text: clean(t).replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim(), size: row.size, bold: boldShare > 0.6, x: row.x0, y: row.y, page: pageNo, ocr: row.runs.some(r => r.ocr) };
  }).filter(l => l.text);
}
/* DOCX (word/document.xml) → lines with synthetic sizes */
function linesFromDocxXml(xml) {
  const out = []; const paras = xml.split(/<w:p[ >]/).slice(1);
  for (const p of paras) {
    const style = (p.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || "";
    const texts = []; p.replace(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g, (m, t) => { texts.push(t !== undefined ? t : " "); return m; });
    let text = texts.join("").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
    if (!text) continue;
    const lvl = /title/i.test(style) ? 0 : (style.match(/heading\s*(\d)/i) || [])[1];
    const bold = /<w:b\/>|<w:b w:val="(1|true)"/.test(p) && !/<w:b w:val="(0|false)"/.test(p);
    const list = /<w:numPr>/.test(p) || /list|bullet|number/i.test(style);
    let size = 11; if (lvl === 0) size = 24; else if (lvl) size = Math.max(12.5, 20 - (+lvl - 1) * 2.5); else if (bold && wc(text) <= 12 && !/[.,;]$/.test(text)) size = 13;
    out.push({ text: (list && !BUL.test(text) ? "• " : "") + clean(text), size, bold, x: list ? 20 : 0, y: 0, page: 1, para: true });
  }
  return out;
}
/* plain text / markdown → lines */
function linesFromText(txt) {
  return clean(txt).split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.trim()).map(l => {
    const h = l.match(/^(#{1,4})\s+(.*)$/); if (h) return { text: h[2], size: 22 - h[1].length * 3, bold: true, x: 0, y: 0, page: 1 };
    const caps = l === l.toUpperCase() && /[A-Z]{3}/.test(l) && wc(l) <= 10;
    return { text: l.trim(), size: caps ? 14 : 11, bold: caps, x: /^\s/.test(l) ? 20 : 0, y: 0, page: 1, para: true };
  });
}

/* ---------- 3. structure: lines → outline of sections with paragraphs ---------- */
const BUL = /^\s*(?:[•●▪◦‣∙·*\-–—►➢✓]|\(?\d{1,2}[.)]|\(?[a-hivx]{1,4}[.)])\s+/i;
const NUMHEAD = /^(?:(?:unit|module|chapter|week|lecture|topic|session|section|part|lesson|study session)\s*[\dIVX]+[a-z]?\b|\d+(?:\.\d+){0,3}\s+[A-Z])/i;
const NOISE_HEAD = /^(table of contents|contents|course guide|copyright|all rights reserved|acknowledg|preface|foreword|about this course|introduction to the course)$/i;
function kindOf(h) {
  const t = h.trim();
  if (/self[- ]?assessment (solutions?|answers?)|^(answers?|solutions?)( to .*)?$|model answers?/i.test(t)) return "answers";
  if (/^in-?text questions?/i.test(t)) return "exercise";
  if (/\b(learning|unit|intended|module|lesson)?\s*(objectives?|outcomes?|aims?)\b/i.test(t) && wc(t) <= 6) return "objectives";
  if (/self[- ]?assessment|tutor[- ]?marked|exercises?$|review questions|practice questions|mid[- ]?lesson questions|quiz|activity$|check your progress|test yourself|assignment/i.test(t)) return "exercise";
  if (/^(summary|conclusion|in summary|key (points|takeaways)|recap|wrap[- ]?up)\b/i.test(t)) return "summary";
  if (/references?|further reading|bibliography|suggested reading|reading list|sources$/i.test(t)) return "refs";
  if (/^(thank you|the end|questions\??)$/i.test(t)) return "end";
  if (/^glossary\b/i.test(t)) return "refs";
  return "content";
}
function structure(lines, meta) {
  meta = meta || {};
  const pages = [...new Set(lines.map(l => l.page))]; const nP = pages.length;
  repairGlyphs(lines);
  // things nobody needs to read: figure/table captions, fill-in blanks, program listings, margin labels
  const codey = t => (/[{}]/.test(t) && !/[a-z]{4,} [a-z]{3,} [a-z]{3,}/.test(t)) || (/;\s*$/.test(t) && /[=()\[\]]|->|\+\+/.test(t) && wc(t) <= 16) || /\b(printf|scanf|malloc|sizeof|getch|clrscr|strcpy|strlen)\s*\(/.test(t) && !/[a-z]{4,} [a-z]{3,} [a-z]{3,} [a-z]{3,}/.test(t) || /^#\s*(include|define)\b/.test(t) || /^\/\*.*\*\/$/.test(t);
  lines.forEach(l => { l.text = l.text.replace(/^(did (u|you) know\s*\??|caution|notes?)\s*[:!.-]?\s+(?=[A-Z])/i, "").trim(); });
  lines = lines.filter(l => l.text && !/^(figure|fig\.?|table)\s*\d+(\.\d+)*\s*[:.]/i.test(l.text) && !/_{3,}|\.{6,}|…{3,}/.test(l.text) && !/^(fill in the blanks?|state whether the following statements are true or false)\s*:?$/i.test(l.text) && !codey(l.text));
  // repeated headers/footers, page numbers, TOC lines
  const key = t => t.toLowerCase().replace(/\d+/g, "#").replace(/[^a-z#]/g, "").slice(0, 40);
  const seen = new Map(); lines.forEach(l => { if (l.text.length > 80) return; const k = key(l.text); if (k.length < 4) return; const s = seen.get(k) || new Set(); s.add(l.page); seen.set(k, s); });
  const rep = new Set([...seen].filter(([k, s]) => nP >= 4 && s.size >= Math.max(3, nP * 0.3)).map(([k]) => k));
  const tocPages = new Set(); lines.forEach(l => { if (/^(table of )?contents$/i.test(l.text.trim())) tocPages.add(l.page); });
  const tocLike = l => /(\.{4,}|…{2,}|\s{2,}\d{1,3}$|\.\s?\.\s?\.\s?\d{1,3}$)/.test(l.text) && /\d{1,3}\s*$/.test(l.text);
  const pageTocShare = {}; lines.forEach(l => { const p = pageTocShare[l.page] = pageTocShare[l.page] || [0, 0]; p[1]++; if (tocLike(l)) p[0]++; });
  Object.entries(pageTocShare).forEach(([p, [a, b]]) => { if (a >= 4 && a / b > 0.4) tocPages.add(+p); });
  const keep = lines.filter(l => !(l.text.length <= 80 && rep.has(key(l.text))) && !/^(page\s*)?\d{1,4}(\s*(of|\/)\s*\d+)?$/i.test(l.text) && !tocPages.has(l.page) && !tocLike(l));
  // body size and heading levels
  const sz = []; keep.forEach(l => { for (let i = 0; i < Math.min(l.text.length, 160); i += 8) sz.push(Math.round(l.size * 2) / 2); });
  const hist = new Map(); sz.forEach(s => hist.set(s, (hist.get(s) || 0) + 1));
  const body = [...hist].sort((a, b) => b[1] - a[1])[0] ? [...hist].sort((a, b) => b[1] - a[1])[0][0] : 11;
  const headSizes = [...new Set(keep.filter(l => l.size >= body * 1.12 && wc(l.text) <= 16).map(l => Math.round(l.size * 2) / 2))].sort((a, b) => b - a);
  const isHead = l => {
    if (BUL.test(l.text) && !NUMHEAD.test(l.text)) return 0;
    if (/[.;,]$/.test(l.text) || wc(l.text) > 16 || l.text.length < 2) return 0;
    if (l.size >= body * 1.12) { const i = headSizes.indexOf(Math.round(l.size * 2) / 2); return i < 0 ? 3 : Math.min(3, i + 1); }
    if (NUMHEAD.test(l.text) && wc(l.text) <= 12 && (l.bold || l.size >= body * 0.98) && !/[:.]$/.test(l.text)) return /^(unit|module|chapter|week|lecture|topic|session|study session)/i.test(l.text) ? 1 : 2;
    if (l.bold && wc(l.text) <= 10 && !/[:]$/.test(l.text) && l.size >= body * 0.98) return 3;
    if (l.text === l.text.toUpperCase() && /[A-Z]{4}/.test(l.text) && wc(l.text) <= 9 && l.size >= body * (l.ocr ? 0.7 : 0.98)) return 2;
    return 0;
  };
  // walk
  const secs = []; let cur = null;
  const open = (title, level, page) => { cur = { title, level, page, pages: new Set([page]), kind: kindOf(title), lines: [] }; secs.push(cur); };
  for (let i = 0; i < keep.length; i++) {
    const l = keep[i]; let lv = isHead(l);
    if (lv) {
      let title = l.text; let j = i + 1;
      while (j < keep.length && isHead(keep[j]) && Math.abs(keep[j].size - l.size) < l.size * 0.1 && keep[j].page === l.page && wc(title + " " + keep[j].text) <= 16 && !NUMHEAD.test(keep[j].text) && (l.y === 0 || l.y - keep[j].y < l.size * 2.2)) { title += " " + keep[j].text; j++; }
      if (/^(unit|module|chapter|week|lecture|topic|session|study session)\s*[\dIVX]+[a-z]?\s*[:.\-–]?\s*$/i.test(title) && j < keep.length && wc(keep[j].text) <= 14 && !BUL.test(keep[j].text)) { title += ": " + keep[j].text; j++; }
      if (/^\d+(\.\d+)*$/.test(title) && j < keep.length) { title += " " + keep[j].text; j++; }
      const norm = t => t.toLowerCase().replace(/\s*\(?(cont'?d?|continued)\)?\.?$/i, "").trim();
      if (cur && norm(cur.title) === norm(title)) { cur.pages.add(l.page); i = j - 1; continue; }
      if (NOISE_HEAD.test(title.trim())) { open(title, lv, l.page); cur.kind = "front"; i = j - 1; continue; }
      open(title, lv, l.page); i = j - 1; continue;
    }
    if (!cur) open(meta.name || "Introduction", 1, l.page);
    cur.pages.add(l.page); cur.lines.push(l);
  }
  // paragraphs
  secs.forEach(s => {
    const paras = []; let last = null;
    s.lines.forEach((l, k) => {
      const prev = s.lines[k - 1]; const gap = prev && prev.page === l.page && prev.y && (prev.y - l.y) > Math.max(prev.size, l.size) * 1.9; const brk = prev && prev.page !== l.page;
      const ends = prev && /[.!?:]["')\]]?$/.test(prev.text);
      if (BUL.test(l.text)) { last = { t: l.text.replace(BUL, "").trim(), li: true, x: l.x + 4 }; paras.push(last); return; }
      if (last && !l.para && !last.li && (gap || brk) && !ends && /^[a-z(]/.test(l.text)) { last.t += " " + l.text; return; }
      if (last && !l.para && !gap && !brk && (!ends || /^[a-z(]/.test(l.text)) && !(last.li && l.x && l.x < last.x - 4)) { last.t += (last.t.endsWith("-") && /^[a-z]/.test(l.text) ? "" : " ") + l.text; return; }
      last = { t: l.text, li: false }; paras.push(last);
    });
    s.paras = paras.map(p => ({ t: p.t.replace(/\s+/g, " ").replace(/-\s+(?=[a-z])/g, "").trim(), li: p.li })).filter(p => p.t.length > 1 && (p.li || wc(p.t) >= 3 || /:$/.test(p.t)));
    s.pages = [...s.pages]; delete s.lines;
  });
  // title of the document
  const big = lines.filter(l => l.page === pages[0]).sort((a, b) => b.size - a.size)[0];
  return { sections: secs.filter(s => s.paras.length || s.kind !== "content"), body, title: meta.title || (big && wc(big.text) <= 12 ? big.text : (meta.name || "").replace(/\.[a-z0-9]+$/i, "")) };
}

/* ---------- 4. the LMS week list ---------- */
function parseWeeks(text) {
  const raw = clean(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const weeks = []; let cur = null;
  const head = /^(?:week|wk|module|unit|lecture|topic|session|day|class)\s*\.?\s*(\d{1,2})\b\s*[:.\-–—)|]*\s*(.*)$/i;
  const num = /^(\d{1,2})\s*[:.\-–—)]\s+(.*)$/;
  for (const l of raw) {
    let m = l.match(head) || l.match(num);
    if (m) { cur = { n: +m[1], title: m[2].trim(), extra: [] }; weeks.push(cur); continue; }
    if (cur && (BUL.test(l) || !cur.title || l.length < 120)) { const t = l.replace(BUL, "").trim(); if (!cur.title) cur.title = t; else cur.extra.push(t); continue; }
    cur = { n: weeks.length + 1, title: l, extra: [] }; weeks.push(cur);
  }
  // merge duplicates (e.g. "Week 3" listed twice), keep order, renumber gaps sensibly
  const byN = new Map(); weeks.forEach(w => { if (byN.has(w.n)) { const o = byN.get(w.n); o.extra.push(w.title, ...w.extra); } else byN.set(w.n, w); });
  return [...byN.values()].sort((a, b) => a.n - b.n).map(w => {
    const all = [w.title, ...w.extra].join("; ");
    const subs = all.split(/\s*(?:;|,|\band\b|&|\/|\s[-–—]\s|:)\s*/i).map(x => x.trim()).filter(x => x && wc(x) <= 10 && x.length > 2);
    return { n: w.n, title: cap1(w.title || "Week " + w.n), extra: w.extra, subs: [...new Set(subs)] };
  });
}

/* ---------- 5. alignment: material sections → weeks ---------- */
function bm25Index(docs) {
  const N = docs.length, df = new Map(), lens = docs.map(d => d.length), avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, N);
  docs.forEach(d => new Set(d).forEach(t => df.set(t, (df.get(t) || 0) + 1)));
  const tfs = docs.map(bag);
  return (q, i) => { let s = 0; const tf = tfs[i]; for (const t of new Set(q)) { const f = tf.get(t); if (!f) continue; const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5)); s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * lens[i] / avg)); } return s; };
}
function units(sections, nWeeks) {
  // choose the granularity: merge child sections under the top level that best matches a "unit" structure
  const content = sections.filter(s => s.kind === "content" || s.kind === "summary" || s.kind === "objectives" || s.kind === "exercise");
  const levels = [1, 2, 3].map(L => content.filter(s => s.level === L).length);
  const need = Math.max(3, nWeeks || 0);
  const upTo = L => content.filter(s => s.level <= L && s.kind === "content").length;
  let top = upTo(1) >= need ? 1 : upTo(2) >= need ? 2 : 3;
  if (!nWeeks) top = levels[0] >= 3 ? 1 : levels[1] >= 3 ? 2 : 3;
  const blocks = []; let cur = null;
  for (const s of sections) {
    if (s.kind === "answers") continue;
    if (s.kind === "front" || s.kind === "refs" || s.kind === "end") { cur = null; continue; }
    if (s.level <= top && s.kind === "content" || !cur) { cur = { title: s.title, page: s.page, pages: new Set(s.pages), parts: [s] }; blocks.push(cur); continue; }
    cur.parts.push(s); s.pages.forEach(p => cur.pages.add(p));
  }
  return blocks.map((b, i) => ({ id: "u" + (i + 1), title: b.title, pages: [...b.pages].sort((a, c) => a - c), parts: b.parts, text: b.parts.map(p => p.title + ". " + p.paras.map(x => x.t).join(" ")).join(" ") })).filter(b => wc(b.text) >= 12);
}
function align(weeks, blocks) {
  const W = weeks.length, S = blocks.length; if (!W || !S) return { map: weeks.map(() => []), score: [], conf: weeks.map(() => 0) };
  const docs = blocks.map(b => terms(b.title + " " + b.title + " " + b.text));
  const score = bm25Index(docs); const DB = docs.map(bag);
  const numOf = t => { const m = String(t).match(/^\s*(?:study\s+session|session|week|unit|module|lecture|chapter|topic|lesson)\s*(\d{1,2})\b/i); return m ? +m[1] : null; };
  const nNum = blocks.filter(b => numOf(b.title) !== null).length; const numbered = nNum >= 3 && nNum >= blocks.length / 2;
  const GENERIC = new Set(["theory", "introduct", "introduc", "intro", "concept", "basic", "principl", "principle", "meaning", "overview", "nature", "scope", "analys", "analysi", "type", "part", "ii", "iii", "iv", "week", "unit", "module", "lecture", "topic", "general", "element", "fundamental", "continu", "revi", "review", "cont"]);
  const q = weeks.map(w => { const all = terms([w.title, ...w.extra, ...w.subs].join(" ")); const f = all.filter(t => !GENERIC.has(t)); return f.length ? f : all; });
  const M = weeks.map((w, i) => blocks.map((b, j) => score(q[i], j) + 6 * cos(bag(q[i]), bag(terms(b.title))) + 10 * cos(bag(q[i]), DB[j]) + (numOf(b.title) === w.n ? 6 : 0)).map((v, j) => numbered && numOf(blocks[j].title) === null ? 0 : v));
  // normalise per week
  const colMax = blocks.map((b, j) => Math.max(1e-6, ...M.map(r => r[j])));
  const Mx = M.map(r => { const m = Math.max(...r, 1e-6); return r.map((v, j) => 0.5 * v / m + 0.5 * v / colMax[j]); });
  // monotonic DP: sections in order, week index non-decreasing; a section may be skipped (cost 0)
  const NEG = -1e9; const dp = Array.from({ length: S + 1 }, () => new Array(W).fill(NEG)); const from = Array.from({ length: S + 1 }, () => new Array(W).fill(null));
  for (let w = 0; w < W; w++) dp[0][w] = 0;
  for (let s = 1; s <= S; s++) for (let w = 0; w < W; w++) {
    let best = NEG, arg = null;
    for (let pw = 0; pw <= w; pw++) { const v = dp[s - 1][pw]; if (v === NEG) continue;
      const take = v + Mx[w][s - 1] - (w - pw > 1 ? 0.15 * (w - pw - 1) : 0) + (w > pw ? 0.15 : 0); if (take > best) { best = take; arg = [pw, true]; } }
    const skip = dp[s - 1][w] - 0.05; if (skip > best) { best = skip; arg = [w, false]; }
    dp[s][w] = best; from[s][w] = arg;
  }
  let w = dp[S].indexOf(Math.max(...dp[S])); const assign = new Array(S).fill(-1);
  for (let s = S; s >= 1; s--) { const [pw, took] = from[s][w]; if (took) assign[s - 1] = w; w = pw; }
  // greedy alternative for materials not in week order
  const greedy = blocks.map((b, j) => { let bi = -1, bv = 0.35; for (let i = 0; i < W; i++) if (Mx[i][j] > bv) { bv = Mx[i][j]; bi = i; } return bi; });
  const sumOf = a => a.reduce((t, wi, j) => t + (wi >= 0 ? Mx[wi][j] : 0), 0);
  const use = sumOf(greedy) > sumOf(assign) * 1.35 ? greedy : assign;
  // drop weak links
  const fin = use.map((wi, j) => wi >= 0 && Mx[wi][j] >= 0.22 ? wi : -1);
  if (use === assign) { // ordered material: sections between two anchors belong to a neighbouring week
    const anchors = fin.map((wi, j) => wi >= 0 ? j : -1).filter(j => j >= 0);
    for (let j = 0; j < S; j++) { if (fin[j] >= 0) continue;
      const prev = anchors.filter(a => a < j).pop(), next = anchors.find(a => a > j);
      if (prev === undefined && next === undefined) continue;
      if (prev === undefined) { if (Mx[fin[next]][j] > 0.05) fin[j] = fin[next]; continue; }
      if (next === undefined) { fin[j] = fin[prev]; continue; }
      fin[j] = Mx[fin[next]][j] > Mx[fin[prev]][j] ? fin[next] : fin[prev]; }
  }
  const map = weeks.map(() => []);
  fin.forEach((wi, j) => { if (wi >= 0) map[wi].push(j); });
  const conf = weeks.map((wk, i) => map[i].length ? Math.min(1, Math.max(...map[i].map(j => M[i][j])) / 6) : 0);
  if (typeof process !== "undefined" && process.env && process.env.WWDBG) blocks.forEach((b, j) => console.log("DBG", b.title.slice(0, 30), weeks.map((w, i) => i + ":" + M[i][j].toFixed(1) + "/" + Mx[i][j].toFixed(2)).join(" "), "->", fin[j]));
  return { map, conf, raw: M };
}

/* ---------- 6. content mining ---------- */
const DEFV = /^(.{2,70}?)\s+(is defined as|are defined as|is known as|are known as|is called|are called|is referred to as|refers to|refer to|means|denotes|represents|describes|measures|is the|are the|is an?|is concerned with|deals with|is used to|states that|holds that|shows that)[\s,]+(.{8,})$/i;
const LABEL = /^([^:]{2,55}?)\s*:\s+(.{6,})$/;
const PRON = /^(it|this|that|these|those|they|he|she|which|there|here|such|some|many|most|all|each)\b/i;
const NOTTERM = /^(example|examples|e\.g|for example|note|explanation|where|so|thus|therefore|hence|however|because|in other words|for instance|answer|solution|question)\b/i;
function okTerm(t) { return wc(t) >= 1 && wc(t) <= 7 && !PRON.test(t) && !NOTTERM.test(t) && !/[.!?]$/.test(t) && t.length <= 60 && /[A-Za-z]/.test(t); }
function defOf(s, hint) {
  let m = s.match(LABEL);
  if (m && okTerm(m[1].trim())) return { term: cap1(m[1].replace(/^(the|a|an)\s+/i, "").trim()), def: cap1(m[2].replace(/^(this|it)\s+(refers to|is|means)\s+/i, "")), how: "label" };
  m = s.match(DEFV); if (!m) return null;
  let term = m[1].replace(/^(the|a|an)\s+/i, "").replace(/["“”]/g, "").trim(); const v = m[2].toLowerCase(); let rest = m[3];
  if (PRON.test(term) && hint) term = hint;
  if (!okTerm(term) || wc(term) > 6) return null;
  if (/^is (an?|the)$/.test(v) || v === "are the") { if (wc(rest) < 5) return null; if (/^(important|necessary|essential|key|main|first|best|most|same|only)\b/i.test(rest)) return null; }
  if (/states that|holds that|shows that/.test(v) && !/^(law|principle|theory|rule|theorem|hypothesis|model|concept)\b|\b(law|principle|theory|rule|theorem|effect|hypothesis)\b/i.test(term)) return null;
  const def = /^(is|are) (an?|the)$/.test(v) || v === "is the" || v === "are the" ? v.replace(/^(is|are)\s+/, "") + " " + rest : /defined as|known as|called|referred to as/.test(v) ? rest : v + " " + rest;
  if (/states that|holds that|shows that/.test(v)) return { term: cap1(term), def: cap1(rest.trim()), how: "def", st: v.split(" ")[0] };
  return { term: cap1(term), def: cap1(def.trim()), how: "def", pl: /^are\b/.test(v) };
}
const CUE = /\b(important|crucial|essential|key|must|always|never|note that|therefore|thus|hence|main|major|primary|principle|law|rule|states that|theorem|types? of|kinds? of|consists? of|divided into|classified|factors?|causes?|effects?|advantages?|disadvantages?|features?|characteristics?|functions?|roles?|stages?|steps?)\b/gi;
const MATHY = /[=≤≥≈∑∫√±×÷→↔^²³ⁿ%]|\b[A-Za-z]{1,4}\s*=\s*|\b[A-Z]{2,5}\s*[<>]=?\s*\d|\/\s*[a-z]/;
const EXAMPLE = /^(e\.g\.|for example|for instance|example|examples|such as|consider|suppose|imagine)\b|\bfor example\b|\be\.g\.\b/i;
function sentencesOf(t) {
  const p = t.replace(/\b(e\.g|i\.e|etc|vs|Fig|No|Dr|Mr|Mrs|Prof|al|approx|Eq|St)\./g, m => m.replace(/\./g, "¤")).replace(/(\d)\.(\d)/g, "$1¤$2");
  return p.split(/(?<=[.!?])\s+(?=["'(]?[A-Z0-9])/).map(x => x.replace(/¤/g, ".").trim()).filter(x => x.length > 3);
}
/* graph centrality over sentences (TextRank-like) */
function centrality(units) {
  const B = units.map(u => bag(u.T)); const n = units.length; if (!n) return [];
  const W = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const s = cos(B[i], B[j]); W[i][j] = W[j][i] = s; }
  let r = new Array(n).fill(1 / n);
  for (let it = 0; it < 25; it++) { const nr = new Array(n).fill(0.15 / n); for (let i = 0; i < n; i++) { const tot = W[i].reduce((a, b) => a + b, 0) || 1; for (let j = 0; j < n; j++) if (W[i][j]) nr[j] += 0.85 * r[i] * W[i][j] / tot; } r = nr; }
  const mx = Math.max(...r); return r.map(v => v / mx);
}
function mine(block, ctx) {
  // turn a week's material into typed "units"
  const U = []; const exercises = []; const objectives = [];
  block.parts.forEach(part => {
    if (part.kind === "exercise") { part.paras.forEach(p => { const t = p.t.replace(/^\d+[.)]\s*/, ""); if (wc(t) >= 4) exercises.push(t); }); return; }
    if (part.kind === "objectives") { part.paras.forEach(p => { if (!/^(at the end|by the end|after studying|you should be able)/i.test(p.t) && wc(p.t) >= 3) objectives.push(p.t.replace(/[.;]$/, "")); }); return; }
    const hint = part.title.replace(/^(unit|module|chapter|week|lecture|topic|session)\s*[\dIVX]+[a-z]?\s*[:.\-–]?\s*/i, "").replace(/^\d+(\.\d+)*\s+/, "");
    let intro = null;
    part.paras.forEach(p => {
      if (p.li) { const u = { t: p.t, li: true, sec: hint, isSummary: part.kind === "summary" }; if (intro) { intro.items.push(p.t); u.child = true; } U.push(u); return; }
      intro = null;
      sentencesOf(p.t).forEach((s, k, arr) => { const u = { t: s, sec: hint, isSummary: part.kind === "summary" }; if (k === arr.length - 1 && /:\s*$/.test(s)) { u.items = []; intro = u; } U.push(u); });
    });
  });
  U.forEach(u => { u.T = terms(u.t + (u.items ? " " + u.items.join(" ") : "")); });
  const main = U.filter(u => !u.child);
  const cen = centrality(main);
  const wq = bag(ctx.weekTerms); const sumB = ctx.summaryBag;
  main.forEach((u, i) => {
    const d = u.li && !u.items ? defOf(u.t) : defOf(u.t, u.sec); if (d) u.def = d;
    let sc = 1.2 * cen[i] + 1.6 * cos(bag(u.T), wq) + (sumB && sumB.size ? 2.2 * cos(bag(u.T), sumB) : 0);
    let type = "point";
    if (u.def) { sc += u.def.how === "def" ? 1.6 : 1.2; type = "term"; }
    if (u.items && u.items.length >= 2) { sc += 1.4; type = "list"; }
    if (MATHY.test(u.t) && type === "point") { sc += 0.8; type = "formula"; }
    if (EXAMPLE.test(u.t) && type === "point") { type = "example"; sc -= 0.3; }
    sc += Math.min(1.2, (u.t.match(CUE) || []).length * 0.4);
    if (u.isSummary) sc += 1;
    if (/\b(law|principle|theorem|rule)\b[^.]{0,40}\b(states?|holds?|says?)\b/i.test(u.t)) sc += 1.4;
    const n = wc(u.t); if (n < 5 && !u.items) sc -= 0.8; if (n > 55) sc -= 0.8; if (/\?\s*$/.test(u.t)) sc -= 2;
    u.sc = sc; u.type = type;
  });
  return { units: main, all: U, exercises, objectives };
}

/* ---------- 7. build the atlas ---------- */
function build(input) {
  // input: { material: [{lines,name}], summary: [{lines,name}], weeksText, course:{code,title,format}, seed }
  const course = input.course || {};
  const matSecs = []; let pageOffset = 0; const fileOfPage = [];
  (input.material || []).forEach((doc, di) => { const st = structure(doc.lines.map(l => ({ ...l, page: l.page + pageOffset })), { name: doc.name }); st.sections.forEach(s => { s.file = di; matSecs.push(s); }); const mx = Math.max(0, ...doc.lines.map(l => l.page)); for (let p = 1; p <= mx; p++) fileOfPage[pageOffset + p] = { file: di, page: p }; pageOffset += mx; });
  const sumSecs = []; (input.summary || []).forEach(doc => structure(doc.lines, { name: doc.name }).sections.forEach(s => sumSecs.push(s)));
  let weeks = parseWeeks(input.weeksText || "");
  const blocks = units(matSecs, weeks.length);
  if (!weeks.length) weeks = blocks.map((b, i) => ({ n: i + 1, title: b.title.replace(/^(unit|module|chapter|lecture|topic|session)\s*[\dIVX]+[a-z]?\s*[:.\-–]?\s*/i, ""), extra: [], subs: [] }));
  const A = align(weeks, blocks);
  const sBlocks = units(sumSecs, weeks.length); const SA = sBlocks.length ? align(weeks, sBlocks) : { map: weeks.map(() => []) };
  const allTerms = []; const r = seeded(input.seed || hashStr((course.code || "") + weeks.map(w => w.title).join("|")));
  const W = weeks.map((wk, i) => {
    const bl = A.map[i].map(j => blocks[j]);
    const sumUnits = SA.map[i].flatMap(j => sBlocks[j].parts.flatMap(p => p.paras.flatMap(x => x.li ? [x.t] : sentencesOf(x.t))));
    const block = { parts: bl.flatMap(b => b.parts), title: wk.title };
    const ctx = { weekTerms: terms([wk.title, ...wk.extra, ...wk.subs].join(" ")), summaryBag: bag(terms(sumUnits.join(" "))) };
    const M = mine(block, ctx);
    // topic rescue: a week with no matched block → search every paragraph for its topic
    let rescued = false;
    if (!bl.length) {
      const hits = []; matSecs.forEach(s => s.paras.forEach(p => { const sim = cos(bag(terms(p.t)), bag(ctx.weekTerms)); if (sim > 0.28) hits.push({ s, p, sim }); }));
      hits.sort((a, b) => b.sim - a.sim).slice(0, 12).forEach(h => { const u = { t: h.p.t, sec: h.s.title, li: h.p.li, T: terms(h.p.t), sc: 1 + h.sim * 3, type: "point" }; const d = defOf(h.p.t, wk.title); if (d) { u.def = d; u.type = "term"; u.sc += 1.5; } M.units.push(u); });
      rescued = M.units.length > 0;
    }
    // summary points (high value)
    const summary = sumUnits.filter(t => wc(t) >= 4).slice(0, 10);
    // ranked, de-duplicated points
    const ranked = M.units.slice().sort((a, b) => b.sc - a.sc); const pts = [];
    ranked.forEach(u => { if (pts.length >= 14) return; if (pts.some(p => overlap(p.T, u.T) > 0.6)) return; pts.push(u); });
    const nPts = pts.filter(p => p.type !== "example");
    nPts.forEach((p, k) => { p.tier = k < Math.ceil(nPts.length * 0.35) ? "core" : k < Math.ceil(nPts.length * 0.75) ? "key" : "extra"; });
    pts.filter(p => p.type === "example").forEach(p => p.tier = "extra");
    const termsW = []; M.units.forEach(u => { if (u.def && !termsW.some(t => t.term.toLowerCase() === u.def.term.toLowerCase())) termsW.push({ term: u.def.term, def: u.def.def, week: i, how: u.def.how, pl: !!u.def.pl, st: u.def.st || "" }); });
    termsW.forEach(t => allTerms.push(t));
    const lists = pts.filter(p => p.items && p.items.length >= 2).map(p => ({ title: p.t.replace(/:\s*$/, ""), items: p.items, memo: memoFor(p.items) }));
    const formulas = M.units.filter(u => u.type === "formula" || MATHY.test(u.t) && /=|\//.test(u.t) && u.type !== "example").map(u => u.t).filter((v, k, a) => a.indexOf(v) === k).slice(0, 6);
    const examples = M.units.filter(u => u.type === "example").map(u => u.t).slice(0, 4);
    const goodSum = summary.filter(s => !/:\s*$/.test(s) && wc(s) >= 6 && /[.!?]$/.test(s));
    const overview = (goodSum.length ? goodSum.slice(0, 2) : pts.filter(p => p.type !== "example" && !p.items).slice(0, 2).map(p => p.t));
    const pages = [...new Set(bl.flatMap(b => b.pages))].sort((a, b) => a - b).map(p => fileOfPage[p] || { file: 0, page: p });
    return {
      n: wk.n, title: wk.title, subs: wk.subs, conf: rescued ? 0.25 : A.conf[i], status: bl.length ? (A.conf[i] > 0.35 ? "matched" : "weak") : rescued ? "partial" : "missing",
      sections: bl.map(b => ({ title: b.title, pages: b.pages.map(p => fileOfPage[p] || { file: 0, page: p }) })), pages,
      overview, points: pts.map(p => ({ text: p.t, type: p.type, tier: p.tier, term: p.def ? p.def.term : null, def: p.def ? p.def.def : null, st: p.def && p.def.st || "", items: p.items && p.items.length ? p.items : null, memo: p.items && p.items.length >= 3 ? memoFor(p.items) : null, sum: !!p.isSummary })),
      terms: termsW, lists, formulas, examples, summary, exercises: M.exercises.slice(0, 8), objectives: M.objectives.slice(0, 8)
    };
  });
  W.forEach((w, i) => { w.mcq = makeMCQ(w, W, allTerms, r); w.theory = makeTheory(w, W); w.cards = makeCards(w); });
  const coverage = { weeks: W.length, matched: W.filter(w => w.status === "matched").length, weak: W.filter(w => w.status === "weak" || w.status === "partial").map(w => w.n), missing: W.filter(w => w.status === "missing").map(w => w.n), unusedSections: blocks.filter((b, j) => !A.map.some(m => m.includes(j))).map(b => b.title) };
  return { v: 1, built: Date.now(), course: { code: course.code || "", title: course.title || "" }, weeks: W, coverage, docTitles: (input.material || []).map(d => d.name) };
}

/* ---------- 8. memory hooks ---------- */
const HOOK0 = { a: ["Aisha", "always", "apples"], b: ["Bayo", "buys", "bread"], c: ["Chioma", "cooks", "corn"], d: ["Dayo", "drives", "danfo"], e: ["Efe", "eats", "eba"], f: ["Femi", "finds", "fish"], g: ["Gbenga", "grabs", "garri"], h: ["Halima", "hides", "honey"], i: ["Ike", "irons", "ink"], j: ["Joy", "jogs", "jollof"], k: ["Kunle", "kicks", "kola"], l: ["Lami", "loves", "lemons"], m: ["Mike", "makes", "moi-moi"], n: ["Nkem", "needs", "noodles"], o: ["Ola", "opens", "oranges"], p: ["Pius", "packs", "plantain"], q: ["Queen", "quietly", "quizzes"], r: ["Rotimi", "roasts", "rice"], s: ["Sade", "sells", "suya"], t: ["Tolu", "takes", "tea"], u: ["Uju", "uses", "umbrellas"], v: ["Vera", "visits", "villages"], w: ["Wale", "wants", "wara"], x: ["Xavier", "x-rays", "xylophones"], y: ["Yinka", "yells", "yam"], z: ["Zara", "zooms", "zobo"] };
const HOOKX = { a: ["ate", "akara", "ants"], b: ["beans", "bananas", "boli"], c: ["chin-chin", "carrots", "cola"], d: ["dodo", "drums", "dates"], e: ["eggs", "egusi", "elephants"], f: ["fufu", "fans", "flowers"], g: ["groundnuts", "guavas", "goats"], h: ["hats", "hens", "hot pap"], i: ["ice", "igbo", "iru"], j: ["jars", "juice", "jeans"], k: ["kuli-kuli", "keys", "kites"], l: ["laptops", "locust beans", "lamps"], m: ["mangoes", "milk", "mats"], n: ["nuts", "nets", "necklaces"], o: ["okra", "ofada", "onions"], p: ["puff-puff", "pepper", "pens"], q: ["quails", "quilts", "quarters"], r: ["radios", "rings", "rams"], s: ["shoes", "soup", "salt"], t: ["tomatoes", "tigernuts", "tins"], u: ["ugu", "uniforms", "utensils"], v: ["vans", "vests", "violins"], w: ["water", "watches", "wigs"], x: ["xylophones", "x-rays", "xmas lights"], y: ["yoghurt", "yams", "yarn"], z: ["zobo", "zebras", "zips"] };
const HOOK = new Proxy({}, { get: (o, k) => HOOK0[k] ? [...HOOK0[k], ...(HOOKX[k] || [])] : undefined });
function lab(t) { const m = String(t).match(/^([^:]{2,45}):/); return cap1((m ? m[1] : String(t).split(/\s+/).slice(0, 5).join(" ")).replace(/^(the|a|an)\s+/i, "").replace(/\s+(such as|e\.g\.?|like|for example)\b.*$/i, "").replace(/[,;.]+$/, "").trim()); }
function memoFor(items) {
  if (!items || items.length < 3 || items.length > 8) return null;
  const labels = items.map(lab); const L = labels.map(x => (x.match(/[A-Za-z]/) || ["?"])[0].toUpperCase());
  if (new Set(L).size < Math.ceil(L.length * 0.6)) return null;
  const used = new Set();
  const line = L.map((c, i) => { const h = HOOK[c.toLowerCase()]; if (!h) return c; const order = i === 0 ? [0] : i === 1 ? [1, 2, 3, 4, 5] : [2, 3, 4, 5]; for (const k of order) if (h[k] && !used.has(h[k])) { used.add(h[k]); return h[k]; } return h[2]; }).join(" ");
  return { code: L.join(""), line: line[0].toUpperCase() + line.slice(1), labels };
}

/* ---------- 9. questions ---------- */
function listName(t) { return lc(t.replace(/:\s*$/, "").replace(/^(the|there are|these are)\s+/i, "").replace(/\s+(include|includes|are|is|consist of|consists of|as follows|is as follows|are as follows|can be|such as)\s*$/i, "").replace(/^(two|three|four|five|six|seven|eight)\s+/i, "")); }
function makeMCQ(w, W, allTerms, r) {
  const out = []; const pool = allTerms.filter(t => wc(t.term) <= 6);
  const near = t => mix(pool.filter(x => x.term.toLowerCase() !== t.term.toLowerCase() && !x.term.toLowerCase().includes(t.term.toLowerCase()) && !t.term.toLowerCase().includes(x.term.toLowerCase())).sort((a, b) => Math.abs(a.week - w.n + 1) - Math.abs(b.week - w.n + 1)).slice(0, 8), r);
  const push = (q, ans, wrong, why, kind) => { const ws = [...new Set(wrong.filter(x => x && x.toLowerCase() !== ans.toLowerCase()))].slice(0, 3); if (ws.length < 3) return; const o = mix([ans, ...ws], r); out.push({ q, o, a: o.indexOf(ans), why, kind }); };
  w.terms.forEach(t => {
    const blank = t.def.replace(new RegExp(esc(t.term), "ig"), "____");
    if (wc(blank) >= 4) push(`Which term is described here: "${trimTo(blank, 28)}"?`, t.term, near(t).map(x => x.term), `${t.term}: ${t.def}`, "term");
    push(`What is ${t.term}?`, trimTo(t.def, 22), near(t).map(x => trimTo(x.def, 22)), `${t.term}: ${t.def}`, "meaning");
  });
  w.lists.forEach(L => {
    const labels = L.items.map(lab).filter(x => wc(x) <= 6); if (labels.length < 3) return;
    const others = W.flatMap(x => x.lists).filter(x => x !== L).flatMap(x => x.items.map(lab)).filter(x => !labels.some(y => y.toLowerCase() === x.toLowerCase()) && wc(x) <= 6);
    if (others.length) { const odd = others[Math.floor(r() * others.length)]; push(`Which of these is NOT one of the ${trimTo(listName(L.title), 12)}?`, odd, mix(labels, r).slice(0, 3), `${L.title}: ${labels.join(", ")}.`, "odd"); }
  });
  w.points.filter(p => !p.term && p.type !== "example" && p.type !== "formula" && !/[=\/]/.test(p.text) && wc(p.text) >= 7 && wc(p.text) <= 40).forEach(p => {
    const t = pool.filter(x => wordRe(x.term).test(p.text) && x.term.length > 2).sort((a, b) => b.term.length - a.term.length)[0];
    if (t) push(`Complete the statement: "${trimTo(p.text.replace(wordRe(t.term), "____"), 34)}"`, t.term, near(t).map(x => x.term), p.text, "blank");
  });
  // true statement: one real point vs. three made false by swapping a term
  const real = w.points.filter(p => p.term && p.def && wc(p.def) <= 26);
  if (real.length >= 1 && pool.length >= 4) { const p = real[0]; const fakes = near({ term: p.term }).slice(0, 3).map(x => `${x.term}: ${trimTo(p.def, 20)}`); push(`Which statement is correct?`, `${p.term}: ${trimTo(p.def, 20)}`, fakes, `${p.term}: ${p.def}`, "true"); }
  const seen = new Set(); return out.filter(q => { const k = q.q.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 10);
}
function lc(s) { s = String(s).trim(); return s.replace(/^(\S+)/, w => /[A-Z]{2}|\d/.test(w) ? w : w.toLowerCase()); }
function listQ(title, wkTitle) {
  const t = title.replace(/:\s*$/, "").trim();
  const m = t.match(/\b(two|three|four|five|six|seven|several|main|major|key|following|basic)?\s*(factors|types|parts|kinds|steps|stages|components|categories|features|characteristics|reasons|methods|functions|principles|determinants|advantages|disadvantages|branches|sources|causes|effects|methods|levels|forms|objectives|roles|elements|uses|measures)\b/i);
  const topic = lc(wkTitle.split(/\s[-–—]\s|:/)[0].replace(/^(the\s+)?(theory|introduction|meaning|overview) (of|to)\s+/i, ""));
  if (m) { const after = t.slice(m.index + m[0].length).match(/^\s+(of|in|for|affecting|influencing)\s+(.{3,50}?)(\s+(include|includes|are|is|as follows))?\s*$/i); return `List and explain the ${m[1] && /two|three|four|five|six|seven/i.test(m[1]) ? m[1].toLowerCase() + " " : ""}${m[2].toLowerCase()} ${after ? after[1].toLowerCase() + " " + lc(after[2]) : "of " + topic}.`; }
  if (/divided into|split into|classified into|grouped into/i.test(t)) return `Discuss the classification of ${wkTitle.toLowerCase()}.`;
  return `Discuss ${wkTitle.toLowerCase()}, listing its main points.`;
}
function makeTheory(w, W) {
  const out = []; const key = w.points.filter(p => p.type !== "example");
  const flat = p => (p.term ? `${p.term}: ${p.def}` : p.text) + (p.items ? " " + p.items.join("; ") : "");
  w.exercises.filter(e => /^(explain|discuss|define|describe|list|state|what|why|how|outline|differentiate|distinguish|compare|contrast|mention|identify|give|write|enumerate|evaluate|examine|analy[sz]e|briefly|critically|justify|illustrate|show|calculate|derive|prove|with the aid|using)\b/i.test(e) && !/which of the following/i.test(e) && wc(e) >= 4 && wc(e) <= 60).forEach(e => out.push({ q: /[?.]$/.test(e) ? e : e + ".", marks: 10, from: "material" }));
  if (wc(w.title.replace(/\b(introduction|intro|overview|week|unit|module|\d+|to|the|of|and|course)\b/gi, "")) >= 1) out.push({ q: /^(introduction|overview|meaning)\b/i.test(w.title) ? `Discuss the ${lc(w.title.split(/\s[-–—:]\s|:/)[0])}.` : `Explain ${lc(w.title.split(/\s[-–—]\s/)[0])}.`, marks: 10, from: "week" });
  w.subs.filter(s => wc(s) >= 2 && !/^(their|its|his|her|the|other)\b/i.test(s) && overlap(terms(s), terms(w.title)) < 0.6).slice(0, 3).forEach(s => out.push({ q: `Briefly discuss ${lc(s)}.`, marks: 5, from: "week" }));
  w.terms.filter(t => t.how === "def" || wc(t.def) >= 8).slice(0, 4).forEach(t => out.push({ q: t.st ? `State the ${lc(t.term)}.` : `Define ${t.term}.`, marks: 4, from: "term", guide: [t.def] }));
  w.lists.forEach(L => out.push({ q: listQ(L.title, w.title), marks: 10, from: "list", guide: L.items }));
  let pairs = 0; for (let i = 0; i < w.terms.length && pairs < 2; i++) for (let j = i + 1; j < w.terms.length && pairs < 2; j++) { const a = w.terms[i], b = w.terms[j]; const shared = terms(a.term).some(x => terms(b.term).includes(x)); if (shared && !/^(law|principle|theory|rule)\b/i.test(a.term + " ") && !/^(law|principle|theory|rule)\b/i.test(b.term) && !a.term.toLowerCase().includes(b.term.toLowerCase()) && !b.term.toLowerCase().includes(a.term.toLowerCase())) { pairs++; out.push({ q: `Differentiate between ${a.term} and ${b.term}.`, marks: 6, from: "pair", guide: [`${a.term}: ${a.def}`, `${b.term}: ${b.def}`], pair: [a, b] }); } }
  w.objectives.forEach(o => out.push({ q: cap1(o) + ".", marks: 10, from: "objective" }));
  const seen = new Set(); const qs = out.filter(q => { const k = q.q.toLowerCase().slice(0, 70); if (seen.has(k)) return false; seen.add(k); return true; });
  qs.forEach(q => { if (!q.guide) { const QB = bag(terms(q.q)); q.guide = key.map(p => ({ p, s: cos(QB, bag(terms(flat(p)))) + (p.tier === "core" ? 0.1 : 0) })).sort((a, b) => b.s - a.s).slice(0, 4).map(x => flat(x.p)); } q.answer = answerFor(q, w); });
  return qs.slice(0, 12);
}
function sayDef(term, def, pl, st) { const d = String(def).trim().replace(/[.;:]+$/, ""); const lc = d[0].toLowerCase() + d.slice(1); term = cap1(term); if (st) return `${term} ${st} that ${lc}`; const be = pl ? "are" : "is"; if (/^(refers|measures|describes|represents|denotes|means|shows|deals|is|are|involves|states|holds)\b/i.test(d)) return `${term} ${pl ? lc.replace(/^(refer|measure|describe|represent|denote|mean|show|deal|involve|state|hold)s\b/, "$1") : lc}`; return `${term} ${be} ${lc}`; }
function firstBit(s) { return trimTo(String(s).split(/(?<=[.;])\s/)[0], 24).replace(/[.;…]+$/, ""); }
function answerFor(q, w) {
  const QT = terms(q.q); const named = w.terms.filter(t => wordRe(t.term).test(q.q)).sort((a, b) => b.term.length - a.term.length);
  const best = named[0] || w.terms.map(t => ({ t, s: overlap(terms(t.term), QT) })).sort((a, b) => b.s - a.s).filter(x => x.s > 0.2).map(x => x.t)[0];
  const intro = q.pair ? q.pair.map(t => sayDef(t.term, t.def, t.pl, t.st) + ".") : best ? [sayDef(best.term, best.def, best.pl, best.st) + "."] : (w.overview[0] ? [w.overview[0]] : []);
  let body = (q.guide || []).filter(g => !intro.some(i => overlap(terms(i), terms(g)) > 0.5)).slice(0, 6);
  const ex = w.examples.find(e => overlap(terms(e), QT) > 0.05) || w.examples[0] || "";
  const subj = q.pair ? `${q.pair[0].term} and ${q.pair[1].term}` : best ? best.term : w.title.toLowerCase();
  const end = q.from === "list" && q.guide && q.guide.length >= 2 ? `In conclusion, the main points are ${q.guide.map(lab).slice(0, 7).map((x, k) => k ? lc(x) : x).join(", ")}.` : q.pair ? `In summary, ${lc(firstBit(sayDef(q.pair[0].term, q.pair[0].def, q.pair[0].pl, q.pair[0].st)))}, whereas ${firstBit(sayDef(q.pair[1].term, q.pair[1].def, q.pair[1].pl, q.pair[1].st))}.` : best ? `In conclusion, ${lc(firstBit(sayDef(best.term, best.def, best.pl, best.st)))}.` : `In conclusion, these points explain ${subj}.`;
  const total = q.marks || 10, m1 = intro.length ? Math.min(intro.length * 2, Math.round(total * 0.3)) : 0, m4 = total >= 8 ? 1 : 0, m3 = ex && total >= 8 ? 1 : 0, per = body.length ? Math.max(1, Math.floor((total - m1 - m3 - m4) / body.length)) : 0;
  return { intro, body, example: ex ? trimTo(ex.replace(/^(examples?|for example)[:,]?\s*/i, ""), 32) : "", end, marks: [m1, per, m3, m4] };
}
function makeCards(w) {
  const c = [];
  w.terms.forEach(t => c.push({ f: t.term, b: t.def, kind: "term" }));
  w.lists.forEach(L => c.push({ f: L.title.replace(/:\s*$/, "") + "?", b: L.items.map(x => "• " + x).join("\n") + (L.memo ? `\n\nMemory hook: ${L.memo.code} — ${L.memo.line}` : ""), kind: "list" }));
  w.formulas.slice(0, 3).forEach(f => c.push({ f: "Formula / rule: " + trimTo(f.replace(/=.*/, "= ?"), 14), b: f, kind: "formula" }));
  w.points.filter(p => p.tier === "core" && !p.term && !p.items && p.type !== "example").slice(0, 3).forEach(p => c.push({ f: `Week ${w.n}: key fact about ${trimTo(w.title, 8).toLowerCase()}`, b: p.text, kind: "fact" }));
  return c.map((x, k) => ({ id: `w${w.n}c${k}`, ...x }));
}

/* ---------- 10. marking a written answer ---------- */
const SAME = [["largest", "biggest", "maximum", "highest", "upper", "most"], ["smallest", "minimum", "lowest", "least", "lower"], ["rise", "increase", "grow", "go up", "higher"], ["fall", "decrease", "drop", "reduce", "decline", "lower"], ["buy", "purchase", "acquire"], ["price", "cost", "amount paid"], ["quantity", "amount", "number"], ["important", "essential", "crucial", "vital", "key"], ["show", "describe", "express", "represent", "indicate"], ["use", "utilise", "utilize", "apply", "employ"], ["firm", "company", "business", "producer"], ["consumer", "buyer", "customer", "household"], ["good", "commodity", "product", "item"], ["money", "naira", "cash", "income"]];
const SAMEMAP = (() => { const m = {}; SAME.forEach((g, i) => g.forEach(w => m[w] = "sm" + i)); return m; })();
const canon = s => String(s).replace(/[A-Za-z]+/g, w => SAMEMAP[w.toLowerCase()] || w);
function mark(answer, guide) {
  const A = new Set(terms(canon(answer)));
  const per = guide.map(g => { let G = [...new Set(terms(canon(g)))]; if (G.length > 9) G = G.sort((a, b) => b.length - a.length).slice(0, 9); if (!G.length) return { g, c: 1 }; const hit = G.filter(t => A.has(t) || [...A].some(a => a.length > 4 && t.length > 4 && a.slice(0, 5) === t.slice(0, 5))); return { g, c: hit.length / G.length }; });
  const score = Math.round(10 * per.reduce((a, x) => a + Math.min(1, x.c / 0.5), 0) / Math.max(1, per.length));
  return { score, hit: per.filter(x => x.c >= 0.35).map(x => x.g), miss: per.filter(x => x.c < 0.35).map(x => x.g) };
}

/* ---------- 11. exam pack over chosen weeks ---------- */
function examPack(atlas, weekNs, pastQs) {
  const ws = atlas.weeks.filter(w => !weekNs || !weekNs.length || weekNs.includes(w.n));
  const PQ = (pastQs || []).map(q => bag(terms(q)));
  const pqHits = t => { const B = bag(terms(t)); return PQ.filter(q => cos(B, q) > 0.3).length; };
  const notes = ws.map(w => ({ n: w.n, title: w.title, pq: pqHits(w.title + " " + w.subs.join(" ") + " " + w.terms.map(t => t.term).join(" ")), points: w.points.map(p => ({ ...p, pq: pqHits((p.term || "") + " " + p.text) })) }));
  const all = notes.flatMap(n => n.points.filter(p => p.type !== "example").map(p => ({ ...p, week: n.n, s: (p.tier === "core" ? 3 : p.tier === "key" ? 2 : 1) + p.pq * 1.5 + (p.sum ? 0.8 : 0) })));
  all.sort((a, b) => b.s - a.s);
  const cram = all.slice(0, 15).map(p => ({ week: p.week, text: p.term ? (p.st ? `${p.term}: ${trimTo(p.def, 26)}` : `${p.term} — ${trimTo(p.def, 24)}`) : p.items ? `${p.text.replace(/:\s*$/, "")}: ${p.items.map(lab).join(", ")}` : trimTo(p.text, 28) }));
  const likely = ws.flatMap(w => w.theory.map(q => ({ ...q, week: w.n, rank: (q.from === "material" ? 4 : q.from === "objective" ? 3.5 : q.from === "list" || q.from === "pair" ? 2.5 : q.from === "week" ? 2 : 1) + pqHits(q.q) * 2 }))).sort((a, b) => b.rank - a.rank);
  const seen = new Set(); const likelyOut = likely.filter(q => { const k = q.q.toLowerCase().slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 20);
  const glossary = ws.flatMap(w => w.terms.map(t => ({ ...t, week: w.n }))).sort((a, b) => a.term.localeCompare(b.term));
  const hooks = ws.flatMap(w => w.lists.filter(L => L.memo).map(L => ({ week: w.n, title: L.title, ...L.memo })));
  const formulas = ws.flatMap(w => w.formulas.map(f => ({ week: w.n, f })));
  return { weeks: notes, cram, likely: likelyOut, glossary, hooks, formulas };
}

return { linesFromPdfPage, linesFromDocxXml, linesFromText, structure, parseWeeks, build, mark, examPack, terms, cos, bag, version: 1 };
})();
if (typeof module !== "undefined") module.exports = WW;
