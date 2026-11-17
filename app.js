/* =====================================================================
   WEEKWISE — app shell. Offline. Everything stays on the device.
   ===================================================================== */
(() => {
"use strict";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const H = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const BASE = () => { const b = document.baseURI; return b.slice(0, b.lastIndexOf("/") + 1); };
const NATIVE = () => !!(window.WWCap && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) || !!window.WW_FORCE_NATIVE;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const DAY = 864e5;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ---------- icons ---------- */
const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  guide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 7h6M9 11h6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M6 10l6 6 6-6M5 20h14"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6z"/><path d="M12 6v14.5"/></svg>'
};

/* ---------- storage (IndexedDB key/value) ---------- */
const DB = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open("weekwise", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction("kv", mode); const st = t.objectStore("kv"); const out = fn(st); t.oncomplete = () => res(out && "result" in out ? out.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error("Storage is full or blocked.")); }); };
  const idb = { get: k => tx("readonly", s => s.get(k)), set: (k, v) => tx("readwrite", s => s.put(v, k)), del: k => tx("readwrite", s => s.delete(k)), keys: () => tx("readonly", s => s.getAllKeys()), clear: () => tx("readwrite", s => s.clear()) };
  const mem = new Map(); let useMem = false; /* fallback when the browser blocks storage (e.g. a file preview) */
  const wrap = name => async (...a) => { if (!useMem) { try { return await idb[name](...a); } catch (e) { useMem = true; window.WW_NOSTORE = true; } } if (name === "get") return mem.get(a[0]); if (name === "set") return void mem.set(a[0], a[1]); if (name === "del") return void mem.delete(a[0]); if (name === "keys") return [...mem.keys()]; mem.clear(); };
  return { get: wrap("get"), set: wrap("set"), del: wrap("del"), keys: wrap("keys"), clear: wrap("clear") };
})();

/* ---------- state ---------- */
let S = null;
const fresh = () => ({ v: 1, name: "", dept: "", level: "", sem: "", hiddenPacks: [], lineBag: [], catChecked: 0, theme: "auto", fs: 16, courses: [], prog: {}, streak: { last: 0, n: 0 }, onboarded: false });
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(() => DB.set("state", S).catch(e => toast("Couldn't save: " + e.message)), 150); }
const atlasCache = new Map();
async function atlasOf(id) { if (atlasCache.has(id)) return atlasCache.get(id); const a = await DB.get("atlas:" + id); if (a) atlasCache.set(id, a); return a; }
const course = id => S.courses.find(c => c.id === id);
function P(cid) { const p = S.prog[cid] = S.prog[cid] || {}; p.weeks = p.weeks || {}; p.cards = p.cards || {}; p.wrong = p.wrong || []; p.mocks = p.mocks || []; return p; }
function wk(cid, n) { const p = P(cid); return p.weeks[n] = p.weeks[n] || { read: false, best: null, tries: 0, theory: 0 }; }
function touchStreak() { const t = today(); if (S.streak.last === t) return; S.streak.n = S.streak.last === t - DAY ? S.streak.n + 1 : 1; S.streak.last = t; save(); }

/* ---------- theme ---------- */
function applyTheme() {
  const dark = S.theme === "ink" || (S.theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "ink" : "paper";
  document.documentElement.style.setProperty("--fs", (S.fs || 16) + "px");
  if (NATIVE() && WWCap.StatusBar) { try { WWCap.StatusBar.setStyle({ style: dark ? "DARK" : "LIGHT" }); WWCap.StatusBar.setBackgroundColor({ color: dark ? "#14161D" : "#F4EEE2" }); } catch (e) { } }
}
matchMedia("(prefers-color-scheme: dark)").addEventListener && matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => S && applyTheme());

/* ---------- toast / sheet ---------- */
let toastT;
function toast(msg, ms = 2600) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms); }
function sheet(html, onMount) {
  const s = $("#sheet"); s.innerHTML = `<div class="pane" role="dialog" aria-modal="true"><button class="iconbtn x" data-close aria-label="Close">${I.x}</button>${html}</div>`; s.hidden = false;
  s.onclick = e => { if (e.target === s || e.target.closest("[data-close]")) closeSheet(); };
  onMount && onMount($(".pane", s)); stack.push({ sheet: true });
}
function closeSheet() { const s = $("#sheet"); if (s.hidden) return; s.hidden = true; s.innerHTML = ""; stopSpeak(); if (stack.length && stack[stack.length - 1].sheet) stack.pop(); }
function confirmBox(msg, yes = "Yes", no = "Cancel") { return new Promise(res => { sheet(`<h3>${H(msg)}</h3><div class="sp"></div><div class="row"><button class="btn" id="cy">${H(yes)}</button><button class="btn ghost" id="cn">${H(no)}</button></div>`, p => { $("#cy", p).onclick = () => { closeSheet(); res(true); }; $("#cn", p).onclick = () => { closeSheet(); res(false); }; }); }); }

/* ---------- routing ---------- */
let R = { v: "home" }; const stack = [];
function go(r, push = true) { if (push) stack.push(R); R = r; stopSpeak(); render(); window.scrollTo(0, 0); }
function back() { if (stack.length) { const top = stack[stack.length - 1]; if (top && !top.sheet) top._line = null; } if (!$("#sheet").hidden) { closeSheet(); return true; } let r = stack.pop(); while (r && r.sheet) r = stack.pop(); if (!r) { if (R.v === "home" || !S.onboarded) return false; r = { v: "home" }; } R = r; stopSpeak(); render(); return true; }
window.addEventListener("popstate", () => { if (back()) history.pushState(null, ""); });

/* ---------- words of the day ---------- */
const LINES = [
  "One week at a time. That's how semesters are won.",
  "Small reading today beats panic reading later.",
  "You don't need to know everything. You need to know what's examinable.",
  "Read it once, test it twice, and it stays.",
  "Your future self is cheering for this study session.",
  "Consistency is a quiet superpower.",
  "Every flashcard you clear is a mark you keep.",
  "Understanding first, memorising second.",
  "Ten focused minutes is still progress.",
  "The exam hall rewards people who practised writing answers.",
  "Pick one week. Finish it. Repeat.",
  "Confusion is the feeling right before it clicks.",
  "Rest is part of the plan, not a break from it.",
  "You've survived every hard week so far.",
  "Don't count the hours, make the hours count.",
  "Mistakes in practice are free. Fix them now.",
  "Show up for yourself today.",
  "The best time to start was week 1. The next best time is now."
];
function greet() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

/* ---------- dates / plan ---------- */
function daysTo(dateStr) { if (!dateStr) return null; const d = new Date(dateStr + "T00:00:00").getTime(); return Math.round((d - today()) / DAY); }
function countdown(c) { const d = daysTo(c.exam && c.exam.date); if (d === null) return ""; if (d < 0) return "Exam passed"; if (d === 0) return "Exam today"; if (d === 1) return "Exam tomorrow"; return d + " days to exam"; }
function scopeOf(c, A) { const all = A.weeks.map(w => w.n); return c.scope && c.scope.length ? all.filter(n => c.scope.includes(n)) : all; }
function weekMastery(c, w) { const p = wk(c.id, w.n); let m = 0; if (p.read) m += 0.35; if (p.best != null) m += 0.4 * p.best; const cards = w.cards || []; if (cards.length) { const pc = P(c.id).cards; const known = cards.filter(x => pc[x.id] && pc[x.id].reps >= 1).length; m += 0.25 * known / cards.length; } else if (p.read) m += 0.25; return Math.min(1, m); }
function courseMastery(c, A) { const sc = scopeOf(c, A); const ws = A.weeks.filter(w => sc.includes(w.n)); if (!ws.length) return 0; return ws.reduce((a, w) => a + weekMastery(c, w), 0) / ws.length; }
function dueCards(c, A, ns) { const pc = P(c.id).cards; const t = Date.now(); return A.weeks.filter(w => !ns || ns.includes(w.n)).flatMap(w => (w.cards || []).map(k => ({ ...k, week: w.n }))).filter(k => !pc[k.id] || pc[k.id].due <= t); }
function plan(c, A) {
  const sc = scopeOf(c, A); const ws = A.weeks.filter(w => sc.includes(w.n));
  const todo = ws.filter(w => weekMastery(c, w) < 0.7); const d = daysTo(c.exam && c.exam.date);
  const due = dueCards(c, A, sc).filter(k => P(c.id).cards[k.id]).length; const wrong = P(c.id).wrong.length;
  const items = [];
  if (d !== null && d <= 0) {
    items.push({ t: "Read the cram sheet twice", go: { v: "course", id: c.id, tab: "exam" } });
    items.push({ t: "Skim the likely questions and their answer outlines", go: { v: "course", id: c.id, tab: "exam" } });
    if (wrong) items.push({ t: `Go over your ${wrong} saved mistake${wrong > 1 ? "s" : ""}`, go: { v: "mistakes", id: c.id } });
    return { mode: "Exam day", note: "No new topics today. Refresh what you know and stay calm.", items };
  }
  let perDay = 1, mode = "Steady";
  if (d !== null) { const studyDays = Math.max(1, d - (d > 5 ? 2 : d > 2 ? 1 : 0)); perDay = Math.max(1, Math.ceil(todo.length / studyDays)); mode = d <= 3 ? "Crunch" : d <= 14 ? "Focus" : "Steady"; }
  if (d !== null && d <= 3 && todo.length > 3) {
    items.push({ t: "Read the cram sheet for your exam weeks", go: { v: "course", id: c.id, tab: "exam" } });
    todo.slice(0, Math.min(4, perDay)).forEach(w => items.push({ t: `Week ${w.n}: read the Must-know points, then the quiz`, go: { v: "week", id: c.id, n: w.n, tab: "learn" } }));
    items.push({ t: "Take a short mock exam", go: { v: "course", id: c.id, tab: "practice" } });
  } else {
    todo.slice(0, perDay).forEach(w => items.push({ t: `Week ${w.n}: ${w.title}`, sub: wk(c.id, w.n).read ? "Take the quiz and flashcards" : "Read the lesson, then the quiz", go: { v: "week", id: c.id, n: w.n, tab: wk(c.id, w.n).read ? "quiz" : "learn" } }));
    if (!todo.length) items.push({ t: "All your weeks look solid. Take a mock exam.", go: { v: "course", id: c.id, tab: "practice" } });
  }
  if (due) items.push({ t: `Review ${due} flashcard${due > 1 ? "s" : ""} due today`, go: { v: "cards", id: c.id } });
  if (wrong && (d === null || d < 21)) items.push({ t: `Fix ${Math.min(wrong, 10)} saved mistake${wrong > 1 ? "s" : ""}`, go: { v: "mistakes", id: c.id } });
  const note = d === null ? "Add your exam date in the Files tab to get a timed plan." : mode === "Crunch" ? `${d} day${d > 1 ? "s" : ""} left. Focus on Must-know points and likely questions.` : `${todo.length} week${todo.length === 1 ? "" : "s"} left to master in ${d} days, about ${perDay} a day.`;
  return { mode, note, items };
}

/* ---------- read-aloud ---------- */
let speaking = false;
function chunks(text) { const out = []; String(text).split(/\n+/).forEach(par => { let cur = ""; par.split(/(?<=[.!?;:])\s+/).forEach(s => { if ((cur + " " + s).length > 260) { if (cur) out.push(cur); cur = s; } else cur = cur ? cur + " " + s : s; }); if (cur.trim()) out.push(cur); }); return out.filter(x => x.trim()); }
async function speak(text, btn) {
  if (speaking) { stopSpeak(); return; }
  const parts = chunks(text); if (!parts.length) return; speaking = true; if (btn) btn.innerHTML = I.stop + " Stop";
  const done = () => { speaking = false; if (btn && btn.isConnected) btn.innerHTML = I.play + " Listen"; };
  try {
    if (NATIVE() && WWCap.TTS) { for (const p of parts) { if (!speaking) break; await WWCap.TTS.speak({ text: p, lang: "en-GB", rate: 0.95 }); } }
    else if ("speechSynthesis" in window) { await new Promise(res => { let i = 0; const next = () => { if (!speaking || i >= parts.length) return res(); const u = new SpeechSynthesisUtterance(parts[i++]); u.lang = "en-GB"; u.rate = 0.98; u.onend = next; u.onerror = next; speechSynthesis.speak(u); }; next(); }); }
    else toast("Read-aloud isn't available on this device.");
  } catch (e) { toast("Read-aloud stopped: " + (e.message || e)); }
  done();
}
function stopSpeak() { if (!speaking) return; speaking = false; try { if (NATIVE() && WWCap.TTS) WWCap.TTS.stop(); else if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) { } $$("[data-listen]").forEach(b => b.innerHTML = I.play + " Listen"); }

/* =====================================================================
   READING FILES (pdf, docx, pptx, txt, images) — all on the device
   ===================================================================== */
let PDFJS = null, OCRW = null;
async function pdfjs() { if (PDFJS) return PDFJS; PDFJS = await import(BASE() + "lib/pdf.min.js"); PDFJS.GlobalWorkerOptions.workerSrc = BASE() + "lib/pdf.worker.min.js"; return PDFJS; }
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn't load " + src)); document.head.appendChild(s); }); }
async function ocrWorker() {
  if (OCRW) return OCRW;
  if (!window.Tesseract) await loadScript(BASE() + "lib/ocr/tesseract.min.js");
  if (!self.WW_ENG) await loadScript(BASE() + "lib/ocr/eng-data.js");
  const bin = atob(self.WW_ENG); const data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i); self.WW_ENG = null;
  OCRW = await Tesseract.createWorker([{ code: "eng", data }], 1, { workerPath: BASE() + "lib/ocr/worker.min.js", corePath: BASE() + "lib/ocr", workerBlobURL: false, cacheMethod: "none" });
  return OCRW;
}
async function ocrCanvas(cv, pageNo) {
  const w = await ocrWorker(); const { data } = await w.recognize(cv, {}, { blocks: true, text: false }); const Ht = cv.height; const items = [];
  (data.blocks || []).forEach(b => (b.paragraphs || []).forEach(pg => (pg.lines || []).forEach(l => {
    let ws = (l.words || []).filter(x => (x.confidence >= 30 || /^[A-Za-z]{3,}[.,;:]?$/.test(x.text)) && /[A-Za-z0-9]/.test(x.text)); if (!ws.length) return;
    while (ws.length > 1 && ws[ws.length - 1].confidence < 70 && ws[ws.length - 1].text.length <= 3) ws.pop();
    const x0 = Math.min(...ws.map(x => x.bbox.x0)), x1 = Math.max(...ws.map(x => x.bbox.x1)), y1 = Math.max(...ws.map(x => x.bbox.y1)), y0 = Math.min(...ws.map(x => x.bbox.y0));
    const t = ws.map(x => x.text).join(" ").replace(/^[®©•*°·]\s*/, "• ").replace(/^[eoO]\s+(?=[A-Z])/, "• "); if (t.replace(/[^A-Za-z]/g, "").length < 2) return;
    const ra = l.rowAttributes; const h = Math.max(4, ra && ra.rowHeight ? ra.rowHeight - (ra.descenders || 0) : (y1 - y0) * 0.78);
    items.push({ str: t, transform: [h, 0, 0, h, x0, Ht - y1], width: x1 - x0, fontName: "ocr" });
  })));
  return WW.linesFromPdfPage({ items }, pageNo);
}
function imgCanvas(blob) { return new Promise((res, rej) => { const img = new Image(); const u = URL.createObjectURL(blob); img.onload = () => { const sc = Math.min(1, 2200 / Math.max(img.width, img.height)); const cv = document.createElement("canvas"); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); res(cv); }; img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("This image type isn't supported. Use JPG or PNG.")); }; img.src = u; }); }
function kindOf(name, type) { const n = name.toLowerCase(); if (n.endsWith(".pdf") || type === "application/pdf") return "pdf"; if (n.endsWith(".docx")) return "docx"; if (n.endsWith(".pptx")) return "pptx"; if (/\.(txt|md|text)$/.test(n) || /^text\//.test(type)) return "txt"; if (/\.(png|jpe?g|webp|gif|bmp|heic)$/.test(n) || /^image\//.test(type)) return "img"; if (n.endsWith(".doc") || n.endsWith(".ppt")) return "old"; return "?"; }
async function readFile(blob, name, onStep) {
  const k = kindOf(name, blob.type);
  if (k === "pdf") {
    const pj = await pdfjs(); const doc = await pj.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise; const lines = []; let ocred = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      onStep && onStep(`Reading page ${i} of ${doc.numPages}`, i / doc.numPages);
      const pg = await doc.getPage(i); const tc = await pg.getTextContent(); let L = WW.linesFromPdfPage(tc, i, tc.styles);
      if (L.reduce((a, l) => a + l.text.length, 0) < 25) { const vp0 = pg.getViewport({ scale: 1 }); const vp = pg.getViewport({ scale: Math.min(2.4, 1800 / Math.max(vp0.width, vp0.height)) }); const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height; await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise; onStep && onStep(`Scanning page ${i} (photo/scan)…`, i / doc.numPages); L = await ocrCanvas(cv, i); ocred++; }
      lines.push(...L);
    }
    return { lines, pages: doc.numPages, ocred };
  }
  if (k === "docx" || k === "pptx") {
    const z = fflate.unzipSync(new Uint8Array(await blob.arrayBuffer())); const dec = b => new TextDecoder().decode(b);
    if (k === "docx") { if (!z["word/document.xml"]) throw new Error("This Word file looks damaged."); return { lines: WW.linesFromDocxXml(dec(z["word/document.xml"])), pages: 1 }; }
    const slides = Object.keys(z).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]); const lines = [];
    slides.forEach((p, i) => { const xml = dec(z[p]); xml.split(/<p:sp>|<p:sp /).slice(1).forEach(sp => { const title = /type="(title|ctrTitle)"/.test(sp); sp.split(/<a:p>|<a:p /).slice(1).forEach(par => { const t = (par.match(/<a:t>([^<]*)<\/a:t>/g) || []).map(x => x.replace(/<\/?a:t>/g, "")).join("").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim(); if (t) lines.push({ text: (!title && /<a:buChar|lvl=/.test(par) ? "• " : "") + t, size: title ? 22 : 12, bold: title, x: 0, y: 0, page: i + 1, para: true }); }); }); });
    return { lines, pages: slides.length };
  }
  if (k === "txt") return { lines: WW.linesFromText(await blob.text()), pages: 1 };
  if (k === "img") { onStep && onStep("Scanning the photo…", 0.5); const cv = await imgCanvas(blob); return { lines: await ocrCanvas(cv, 1), pages: 1, ocred: 1 }; }
  if (k === "old") throw new Error(`"${name}" is an old Word/PowerPoint format. Save it as .docx/.pptx or PDF and try again.`);
  throw new Error(`"${name}" isn't a supported file. Use PDF, Word (.docx), PowerPoint (.pptx), text or a photo.`);
}

/* =====================================================================
   BUILD a course atlas
   ===================================================================== */
async function buildCourse(c, onStep) {
  const material = [], summary = [];
  for (const f of c.files) {
    let L = await DB.get("lines:" + f.id);
    if (!L) { const blob = await DB.get("file:" + f.id); if (!blob) continue; const r = await readFile(blob, f.name, (m, p) => onStep && onStep(`${f.name}: ${m}`, p)); L = r.lines; f.pages = r.pages; f.ocred = r.ocred || 0; await DB.set("lines:" + f.id, L); }
    (f.role === "summary" || f.role === "guide" ? summary : material).push({ lines: L.map(l => ({ ...l })), name: f.name, fid: f.id });
  }
  if (!material.length && summary.length) { material.push(...summary.splice(0)); }
  onStep && onStep("Matching the material to your weeks…", 1);
  await new Promise(r => setTimeout(r, 30));
  const A = WW.build({ material, summary, weeksText: c.weeksText, course: { code: c.code, title: c.title } });
  A.fileIds = material.map(m => m.fid);
  await DB.set("atlas:" + c.id, A); atlasCache.set(c.id, A); c.built = Date.now(); c.nWeeks = A.weeks.length; save();
  return A;
}

/* =====================================================================
   RENDER
   ===================================================================== */
function dock(on) { return `<nav class="dock noprint"><div class="in"><button data-go="home" class="${on === "home" ? "on" : ""}">${I.home}Home</button><button data-go="guide" class="${on === "guide" ? "on" : ""}">${I.guide}Guide</button><button data-go="settings" class="${on === "settings" ? "on" : ""}">${I.gear}Settings</button></div></nav>`; }
function topbar(title, sub, right = "") { return `<div class="top"><button class="iconbtn" data-back aria-label="Back">${I.back}</button><div class="grow">${sub ? `<div class="kicker">${H(sub)}</div>` : ""}<h2 style="overflow:hidden;text-overflow:ellipsis">${H(title)}</h2></div>${right}</div>`; }
function wire(root) {
  $$("[data-back]", root).forEach(b => b.onclick = () => back() || go({ v: "home" }, false));
  $$("[data-go]", root).forEach(b => b.onclick = () => { const v = b.dataset.go; if (R.v === v) return; stack.length = 0; go({ v }, false); });
}
function ring(p, size = 48) { const r = size / 2 - 4, C = 2 * Math.PI * r; return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--sun)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}"/></svg><b>${Math.round(p * 100)}%</b></div>`; }

async function render() {
  const app = $("#app");
  try {
    if (!S.onboarded) return renderOnboard(app);
    const fn = { home: renderHome, add: renderAdd, course: renderCourse, week: renderWeek, guide: renderGuide, settings: renderSettings, cards: renderCardsSession, mistakes: renderMistakes, mock: renderMock, paper: renderPaper, viewer: renderViewer }[R.v] || renderHome;
    await fn(app); wire(app);
  } catch (e) { console.error(e); app.innerHTML = `<div class="wrap"><div class="card"><h3>Something went wrong</h3><p class="small muted">${H(e.message || e)}</p><button class="btn" id="gohome">Go home</button></div></div>`; $("#gohome").onclick = () => { stack.length = 0; go({ v: "home" }, false); }; }
}

/* ---------- onboarding ---------- */
function renderOnboard(app) {
  const step = R.ob || 0;
  const slides = [
    ["Your semester,<br>week by week.", "Weekwise turns your course material into a week-by-week study plan that matches your LMS."],
    ["Pick your class.", "Choose your department, level and semester. Your courses arrive ready to study, with lessons, notes and questions already written."],
    ["Study week by week.", "Each week has a lesson that teaches step by step, clean exam notes, quizzes and flashcards. It works offline, and your progress stays on your phone."]
  ];
  if (step === 4) {
    app.innerHTML = `<div class="wrap" style="min-height:100vh;display:flex;flex-direction:column;justify-content:center"><div class="brand"><i>W</i>Weekwise</div><div class="sp2"></div><h1>Your class</h1><p class="muted">Weekwise loads the ready-made courses for your class, and adds new ones as they come out.</p>${classForm("ob")}<div class="sp2"></div><button class="btn sun block" id="go2">Start</button><button class="btn ghost block" id="pv2" style="margin-top:8px">Back</button></div>`;
    if (!R._catAsked) { R._catAsked = 1; getCatalog().then(() => { const sel = $("#obd"); if (R.ob === 4 && sel && sel.options.length < depts().length + 2) render(); }); }
    const read = wireClassForm("ob", app);
    $("#pv2").onclick = () => { R.ob = 3; render(); };
    $("#go2").onclick = async () => { const v = read(); if (!v.dept || !v.level || !v.sem) return toast("Choose your department, level and semester."); Object.assign(S, v, { onboarded: true }); save(); const b = $("#go2"); b.disabled = true; b.innerHTML = '<span class="spin"></span> Setting up…'; await syncClass(true).catch(() => { }); R = { v: "home" }; render(); };
    return;
  }
  if (step < 3) {
    const [h, p] = slides[step];
    app.innerHTML = `<div class="wrap" style="min-height:100vh;display:flex;flex-direction:column;justify-content:center"><div class="brand"><i>W</i>Weekwise</div><div class="sp2"></div><div class="steps">${[0, 1, 2, 3].map(i => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div><h1 style="font-size:2.5rem">${h}</h1><p class="muted" style="font-size:1.08rem;margin-top:12px">${p}</p><div class="sp2"></div><div class="row"><button class="btn sun" id="nx">Next</button>${step ? `<button class="btn ghost" id="pv">Back</button>` : ""}</div></div>`;
    $("#nx").onclick = () => { R.ob = step + 1; render(); }; if (step) $("#pv").onclick = () => { R.ob = step - 1; render(); };
    return;
  }
  app.innerHTML = `<div class="wrap" style="min-height:100vh;display:flex;flex-direction:column;justify-content:center"><div class="brand"><i>W</i>Weekwise</div><div class="sp2"></div><div class="steps">${[0, 1, 2, 3].map(() => `<i class="on"></i>`).join("")}</div><h1>What should we call you?</h1><label class="f" for="nm">Your first name</label><input class="in" id="nm" maxlength="30" autocomplete="given-name" placeholder="e.g. Dami"><label class="f" for="lv">Your level</label><select class="in" id="lv"><option value="">Choose…</option><option>100 level</option><option>200 level</option><option>300 level</option><option>400 level</option><option>500 level</option><option>Postgraduate</option></select><p class="hint">First and second years usually write MCQ exams; higher levels write theory. You can change this for each course.</p><div class="sp2"></div><button class="btn sun block" id="go">Start</button></div>`;
  $("#go").onclick = () => { S.name = $("#nm").value.trim().slice(0, 30); save(); R.ob = 4; render(); };
}

/* ---------- home ---------- */
async function renderHome(app) {
  const t = today(); if (!R._line) R._line = nextLine(); const line = R._line;
  let cards = ""; const mine = S.courses.filter(showHere);
  for (const c of mine) {
    const A = await atlasOf(c.id); const m = A ? courseMastery(c, A) : 0; const cd = countdown(c);
    cards += `<div class="card course" data-open="${c.id}" role="button" tabindex="0">${ring(m)}<div class="grow"><div class="code">${H(c.code || "Course")}</div><div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${H(c.title || "")}</div><div class="tiny muted">${A ? A.weeks.length + " weeks" : "Not built yet"}${cd ? " · " + H(cd) : ""}</div></div></div>`;
  }
  // today across courses: nearest exam first
  let todayHtml = "";
  const withA = []; for (const c of mine) { const A = await atlasOf(c.id); if (A) withA.push([c, A]); }
  withA.sort((a, b) => (daysTo(a[0].exam && a[0].exam.date) ?? 999) - (daysTo(b[0].exam && b[0].exam.date) ?? 999));
  if (withA.length) {
    const [c, A] = withA.find(([c]) => (daysTo(c.exam && c.exam.date) ?? 1) >= 0) || withA[0]; const pl = plan(c, A);
    todayHtml = `<div class="card"><div class="row"><div class="grow"><div class="kicker">Today · ${H(c.code)}</div><h3>${H(pl.mode)} plan</h3></div><span class="tag key">${H(countdown(c) || "No exam date")}</span></div><p class="small muted">${H(pl.note)}</p><ol class="plan small" style="padding-left:20px;margin:8px 0 0">${pl.items.slice(0, 4).map((x, i) => `<li><a href="#" data-plan="${i}">${H(x.t)}</a>${x.sub ? `<div class="tiny muted">${H(x.sub)}</div>` : ""}</li>`).join("")}</ol></div>`;
    R._plan = pl;
  }
  app.innerHTML = `<div class="wrap"><div class="top"><div class="brand grow"><i>W</i>Weekwise</div>${S.streak.n > 1 && S.streak.last >= t - DAY ? `<span class="tag key">${S.streak.n}-day streak</span>` : ""}</div>
  <div class="hello"><div class="kicker">${H(new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }))}</div><h1>${greet()}${S.name ? ", " + H(S.name) : ""}.</h1><p class="quote">${H(line)}</p>${S.dept ? `<p class="tiny muted" style="margin-top:12px">${H(classLine())} · <a href="#" id="chcls">Change</a></p>` : ""}</div><div class="sp2"></div>
  ${todayHtml}${todayHtml ? '<div class="sp"></div>' : ""}
  <div class="row"><h2 class="grow">Your courses</h2><button class="btn small" id="add">${I.plus}Add course</button></div><div class="sp"></div>
  ${mine.length ? cards : window.WW_SINGLE || packs().length ? `<p class="small muted">No courses yet.${S.dept ? "" : " Add a ready-made pack below, or tap Add course to upload your own files."}</p>` : `<div class="card empty"><div class="art">W</div><h3>No courses yet</h3><p class="small muted">Add your first course. You'll need its material (PDF, Word, slides or photos), the summary if you have one, and the week list from your LMS.</p><div class="sp"></div><button class="btn sun" id="add2">${I.plus}Add a course</button><div class="sp"></div><a href="#" id="howto" class="small">How does it work?</a></div>`}
  ${(() => { const g = myGroup(); const left = g ? (g.packs || []).filter(e => !course("pack-" + e.id)) : []; return left.length ? `<div class="sp2"></div><h2>More for your class</h2>${left.map(e => `<div class="card course"><div class="grow"><div class="code">${H(e.code)}</div><div class="small muted">${H(e.title)}</div></div><button class="btn small sun" data-cat="${H(e.id)}">Add</button></div>`).join("")}` : S.dept && (!g || !(g.packs || []).length) && !window.WW_SINGLE ? `<div class="card" style="margin-top:14px"><b>${H(classLine())}</b><p class="small muted">There are no ready-made courses for your class yet. They will appear here automatically when they're added. Meanwhile, tap Add course to use your own files.</p></div>` : ""; })()}
  ${!S.dept && packs().filter(p => !course("pack-" + p.id)).length ? `<div class="sp2"></div><h2>Ready-made packs</h2><p class="small muted">Full lessons, exam notes and questions, already written for you.</p>${packs().filter(p => !course("pack-" + p.id)).map(p => `<div class="card course"><div class="grow"><div class="code">${H(p.code)}</div><div class="small muted">${H(p.title)} · ${p.weeks.length} weeks</div></div><button class="btn small sun" data-pack="${H(p.id)}">Add</button></div>`).join("")}` : ""}
  ${window.WW_NOSTORE ? `<p class="tiny muted" style="margin-top:14px">Preview mode: this browser isn't saving progress. On the hosted site everything is saved.</p>` : ""}
  </div>${dock("home")}`;
  $$("[data-cat]").forEach(b => b.onclick = async () => { b.disabled = true; try { S.hiddenPacks = (S.hiddenPacks || []).filter(x => x !== b.dataset.cat); const e = myGroup().packs.find(x => x.id === b.dataset.cat); const c = await installPack(await fetchPack(e)); save(); go({ v: "course", id: c.id, tab: "weeks", fresh: true }); } catch (er) { b.disabled = false; toast("Couldn't download it. Check your internet and try again."); } });
  const ch = $("#chcls"); if (ch) ch.onclick = e => { e.preventDefault(); stack.length = 0; go({ v: "settings" }, false); };
  $$("[data-pack]").forEach(b => b.onclick = async () => { const c = await installPack(packs().find(p => p.id === b.dataset.pack)); go({ v: "course", id: c.id, tab: "weeks", fresh: true }); });
  $$("[data-open]").forEach(el => el.onclick = () => go({ v: "course", id: el.dataset.open, tab: "weeks" }));
  [$("#add"), $("#add2")].forEach(b => b && (b.onclick = () => window.WW_SINGLE ? toast("Adding your own files works on the hosted site. This preview has the CSC 301 pack.", 4200) : go({ v: "add", step: 0, draft: { id: uid(), code: "", title: "", exam: { date: "", style: /^(1|2)00/.test(S.level) ? "mcq" : S.level ? "theory" : "both" }, weeksText: "", files: [] } })));
  const hw = $("#howto"); if (hw) hw.onclick = e => { e.preventDefault(); go({ v: "guide" }); };
  $$("[data-plan]").forEach(a => a.onclick = e => { e.preventDefault(); go(R._plan.items[+a.dataset.plan].go); });
}

/* ---------- add / edit course wizard ---------- */
const WEEK_EXAMPLE = "Week 1: Introduction to economics\nWeek 2: Scarcity, choice and opportunity cost\nWeek 3: Factors of production\nWeek 4: Theory of demand\n…";
async function renderAdd(app) {
  const d = R.draft; const step = R.step; const editing = !!course(d.id);
  const head = d.pack ? topbar("Course details", d.code) : `${topbar(editing ? "Edit course" : "New course", "Step " + (step + 1) + " of 4")}<div class="steps">${[0, 1, 2, 3].map(i => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>`;
  const fileRow = f => `<div class="file">${I.file}<div class="grow small">${H(f.name)}<div class="tiny muted">${(f.size / 1048576).toFixed(1)} MB</div></div><button class="iconbtn" data-rm="${f.id}" aria-label="Remove">${I.x}</button></div>`;
  if (step === 0) {
    app.innerHTML = `<div class="wrap">${head}<h2>About the course</h2><label class="f" for="cd">Course code</label><input class="in" id="cd" placeholder="e.g. ECO 101" value="${H(d.code)}" maxlength="20"><label class="f" for="tt">Course title</label><input class="in" id="tt" placeholder="e.g. Principles of Economics I" value="${H(d.title)}" maxlength="80"><label class="f" for="ed">Exam date (optional)</label><input class="in" id="ed" type="date" value="${H(d.exam.date)}"><p class="hint">With a date, Weekwise plans each day for you, whether you have months or hours.</p><label class="f">Exam type</label><div class="row wrapr" id="st">${[["mcq", "Multiple choice"], ["theory", "Theory / essay"], ["both", "Both"]].map(([k, l]) => `<span class="chip ${d.exam.style === k ? "on" : ""}" data-st="${k}">${l}</span>`).join("")}</div><div class="sp2"></div><button class="btn sun block" id="nx">${d.pack ? "Save" : "Next"}</button></div>`;
    $$("[data-st]").forEach(ch => ch.onclick = () => { d.exam.style = ch.dataset.st; $$("[data-st]").forEach(x => x.classList.toggle("on", x === ch)); });
    $("#nx").onclick = () => { d.code = $("#cd").value.trim(); d.title = $("#tt").value.trim(); d.exam.date = $("#ed").value; if (!d.code && !d.title) return toast("Add a course code or title."); if (d.pack) { const c = course(d.id); Object.assign(c, { code: d.code, title: d.title, exam: { ...d.exam } }); save(); toast("Saved."); return back() || go({ v: "course", id: c.id }, false); } R.step = 1; render(); };
    return;
  }
  if (step === 1 || step === 2) {
    const role = step === 1 ? "material" : "summary"; const list = d.files.filter(f => step === 1 ? f.role === "material" : f.role !== "material");
    app.innerHTML = `<div class="wrap">${head}<h2>${step === 1 ? "Course material" : "Summary and study guide"}</h2><p class="muted small">${step === 1 ? "Add the full course material. One big file or several (all units/modules) both work. PDF, Word, PowerPoint, text or photos of pages." : "Both are optional. The summary tells Weekwise what matters most, so those points rank higher. The study guide adds the course outline and glossary."}</p><div class="sp"></div><label class="drop" for="fi"><b>${step === 2 ? "Add the course summary" : "Tap to choose files"}</b><span class="small muted">PDF · DOCX · PPTX · TXT · JPG/PNG</span></label><input type="file" id="fi" multiple hidden accept=".pdf,.docx,.pptx,.txt,.md,image/*,application/pdf">${step === 2 ? `<div class="sp"></div><label class="drop" for="fg"><b>Add the study guide</b><span class="small muted">Optional</span></label><input type="file" id="fg" hidden accept=".pdf,.docx,.pptx,.txt,.md,application/pdf">` : ""}<div id="fl">${list.map(fileRow).join("")}</div><div class="sp2"></div><div class="row"><button class="btn ghost" id="pv">Back</button><button class="btn sun" id="nx" style="flex:1">${step === 2 && !list.length ? "Skip" : "Next"}</button></div></div>`;
    const fg = $("#fg"); if (fg) fg.onchange = async e => { for (const f of e.target.files) { const k = kindOf(f.name, f.type); if (k === "?" || k === "old") { toast(`${f.name}: not a supported file.`); continue; } const id = uid(); await DB.set("file:" + id, f); d.files.push({ id, name: f.name, size: f.size, type: f.type, role: "guide", isNew: true }); } render(); };
    $("#fi").onchange = async e => { for (const f of e.target.files) { const k = kindOf(f.name, f.type); if (k === "?" || k === "old") { toast(k === "old" ? `${f.name}: save as .docx/.pptx or PDF first.` : `${f.name}: not a supported file.`); continue; } const id = uid(); await DB.set("file:" + id, f); d.files.push({ id, name: f.name, size: f.size, type: f.type, role, isNew: true }); } render(); };
    $$("[data-rm]").forEach(b => b.onclick = async () => { const f = d.files.find(x => x.id === b.dataset.rm); d.files = d.files.filter(x => x !== f); if (f.isNew) { DB.del("file:" + f.id); DB.del("lines:" + f.id); } else (d.removed = d.removed || []).push(f.id); render(); });
    $("#pv").onclick = () => { R.step--; render(); };
    $("#nx").onclick = () => { if (step === 1 && !d.files.some(f => f.role === "material") && !d.files.length) return toast("Add at least one material file."); R.step++; render(); };
    return;
  }
  if (step === 3) {
    app.innerHTML = `<div class="wrap">${head}<h2>Your week list</h2><p class="muted small">Copy the weekly topics from your LMS and paste them here, one week per line. Sub-topics can go on the same line or below it.</p><textarea class="in" id="wt" placeholder="${H(WEEK_EXAMPLE)}">${H(d.weeksText)}</textarea><p class="hint">No list? Leave it empty and Weekwise uses the units in your material instead.</p><div id="pvw" class="small"></div><div class="sp2"></div><div class="row"><button class="btn ghost" id="pv">Back</button><button class="btn sun" id="bd" style="flex:1">Build my weeks</button></div><div id="pg"></div></div>`;
    const ta = $("#wt"); const prev = () => { const ws = WW.parseWeeks(ta.value); $("#pvw").innerHTML = ws.length ? `<p class="muted">Found <b>${ws.length}</b> week${ws.length > 1 ? "s" : ""}: ${ws.slice(0, 14).map(w => `<span class="tag extra" style="margin:2px">W${w.n}</span>`).join("")}</p>` : ""; }; ta.oninput = prev; prev();
    $("#pv").onclick = () => { d.weeksText = ta.value; R.step--; render(); };
    $("#bd").onclick = async () => {
      d.weeksText = ta.value; const btn = $("#bd"); btn.disabled = true; $("#pv").disabled = true;
      const pg = $("#pg"); pg.innerHTML = `<div class="sp"></div><div class="card"><div class="row"><span class="spin"></span><b id="pm">Starting…</b></div><div class="sp"></div><div class="bar"><i id="pb" style="width:2%"></i></div><p class="tiny muted" style="margin-top:8px">Scanned pages take longer (around 5–10 seconds each). Keep this screen open.</p></div>`;
      try {
        let c = course(d.id); const files = d.files.map(f => { const o = { ...f }; delete o.isNew; return o; });
        if (!c) { c = { id: d.id, created: Date.now(), scope: [] }; S.courses.push(c); }
        const weeksChanged = c.weeksText !== d.weeksText;
        Object.assign(c, { code: d.code, title: d.title, exam: { ...d.exam }, weeksText: d.weeksText, files });
        (d.removed || []).forEach(id => { DB.del("file:" + id); DB.del("lines:" + id); });
        if (weeksChanged) c.scope = [];
        await buildCourse(c, (m, p) => { $("#pm").textContent = m; $("#pb").style.width = Math.max(2, Math.round((p || 0) * 100)) + "%"; });
        save(); stack.length = 0; R = { v: "course", id: c.id, tab: "weeks", fresh: true }; render();
      } catch (e) { console.error(e); pg.innerHTML = `<div class="sp"></div><div class="card"><b>Couldn't finish</b><p class="small muted">${H(e.message || e)}</p></div>`; btn.disabled = false; $("#pv").disabled = false; }
    };
  }
}

/* ---------- course ---------- */
async function renderCourse(app) {
  const c = course(R.id); if (!c) { R = { v: "home" }; return renderHome(app); }
  const A = await atlasOf(c.id); const tab = R.tab || "weeks";
  if (!A) { app.innerHTML = `<div class="wrap">${topbar(c.code, c.title)}<div class="card"><p>This course hasn't been built yet.</p><button class="btn" id="rb">Build now</button></div></div>`; $("#rb").onclick = () => go({ v: "add", step: 3, draft: draftOf(c) }); return; }
  const m = courseMastery(c, A); const sc = scopeOf(c, A);
  const head = `${topbar(c.code || c.title, c.code ? c.title : "", ring(m, 44))}<div class="row wrapr small muted">${countdown(c) ? `<span class="tag key">${H(countdown(c))}</span>` : ""}<span>${A.weeks.length} weeks</span><span>·</span><span>${{ mcq: "MCQ exam", theory: "Theory exam", both: "MCQ + theory" }[c.exam.style] || ""}</span></div>
  <div class="tabs" role="tablist">${[["weeks", "Weeks"], ["exam", "Exam notes"], ["practice", "Practice"], ["files", "Files"]].map(([k, l]) => `<button role="tab" data-tab="${k}" class="${tab === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
  let body = "";
  if (tab === "weeks") {
    const cv = A.coverage; const pl = plan(c, A); R._plan = pl;
    const warn = cv.missing.length || cv.weak.length ? `<div class="card" style="border-color:var(--rust)"><b>Heads up</b><p class="small">${cv.missing.length ? `No material found for week${cv.missing.length > 1 ? "s" : ""} <b>${cv.missing.join(", ")}</b>. ` : ""}${cv.weak.length ? `Weak match for week${cv.weak.length > 1 ? "s" : ""} ${cv.weak.join(", ")}. ` : ""}Upload that week's material in Files, or check that the week title matches your material's wording.</p></div><div class="sp"></div>` : "";
    const fresh = R.fresh ? `<div class="card" style="border-color:var(--leaf)"><b>Your weeks are ready.</b><p class="small muted">${c.pack ? `All ${cv.weeks} weeks have a full lesson, exam notes, a quiz, flashcards and theory questions.` : `Weekwise matched ${cv.matched} of ${cv.weeks} weeks to your material.`} Tap a week to start, or open Exam notes to pick which weeks your exam covers.</p></div><div class="sp"></div>` : "";
    R.fresh = false;
    const nowN = (pl.items.find(x => x.go && x.go.v === "week") || {}).go;
    body = `${fresh}${warn}<div class="card"><div class="kicker">Today</div><p class="small" style="margin-top:4px">${H(pl.note)}</p><ol class="plan small" style="padding-left:20px;margin:6px 0 0">${pl.items.map((x, i) => `<li><a href="#" data-plan="${i}">${H(x.t)}</a>${x.sub ? `<div class="tiny muted">${H(x.sub)}</div>` : ""}</li>`).join("")}</ol></div><div class="sp"></div>
    <div class="tl">${A.weeks.map(w => { const wm = weekMastery(c, w); const p = wk(c.id, w.n); const out = !sc.includes(w.n); return `<div class="wk ${wm >= 0.7 ? "done" : nowN && nowN.n === w.n ? "now" : ""} ${out ? "out" : ""}" data-n="${w.n}" data-wk="${w.n}" role="button" tabindex="0"><div class="t">${H(w.title)}</div><div class="meta">${w.status === "missing" ? `<span class="tag warn">No material</span>` : w.status !== "matched" ? `<span class="tag key">Partial</span>` : ""}${p.best != null ? `<span class="tag ok">Quiz ${Math.round(p.best * 100)}%</span>` : ""}${p.read ? `<span class="tag extra">Read</span>` : ""}${out ? `<span class="tag extra">Not in exam</span>` : ""}<span class="tiny muted">${w.pack ? w.topics.length + " parts · " : ""}${w.terms.length} term${w.terms.length === 1 ? "" : "s"} · ${w.mcq.length} MCQ${w.mcq.length === 1 ? "" : "s"} · ${w.theory.length} theory</span></div><div class="bar" style="margin-top:8px"><i style="width:${Math.round(wm * 100)}%"></i></div></div>`; }).join("")}</div>`;
  }
  if (tab === "exam") body = c.pack ? packExamTab(c, A) : examTab(c, A);
  if (tab === "practice") {
    const due = dueCards(c, A, sc); const dueKnown = due.filter(k => P(c.id).cards[k.id]).length; const nNew = due.length - dueKnown; const wrong = P(c.id).wrong.length; const mocks = P(c.id).mocks.slice(-5).reverse();
    const nM = A.weeks.filter(w => sc.includes(w.n)).reduce((a, w) => a + w.mcq.length, 0);
    body = `<div class="card"><div class="kicker">Mock exam</div><h3>Test yourself on your exam weeks</h3><p class="small muted">${nM} questions across ${sc.length} week${sc.length > 1 ? "s" : ""}. Change which weeks count in Exam notes.</p><div class="row wrapr">${[10, 20, 40].map(n => `<button class="btn small ${n === 20 ? "" : "ghost"}" data-mock="${n}" ${nM < 3 ? "disabled" : ""}>${n} MCQs</button>`).join("")}<button class="btn small ghost" id="paper">Theory paper</button></div></div>
    <div class="card"><div class="kicker">Flashcards</div><h3>${dueKnown} due · ${nNew} new</h3><p class="small muted">Weekwise spaces your reviews, so cards you know come back less often.</p><button class="btn small" data-go-cards ${due.length ? "" : "disabled"}>Review cards</button></div>
    <div class="card"><div class="kicker">Mistakes</div><h3>${wrong} saved</h3><p class="small muted">Every question you miss is saved here until you get it right.</p><button class="btn small" id="mist" ${wrong ? "" : "disabled"}>Fix mistakes</button></div>
    ${mocks.length ? `<div class="card"><div class="kicker">Recent mocks</div>${mocks.map(m => `<div class="row small" style="justify-content:space-between;margin-top:6px"><span>${new Date(m.at).toLocaleDateString()} · ${m.n} questions</span><b>${Math.round(m.score * 100)}%</b></div>`).join("")}</div>` : ""}`;
  }
  if (tab === "files" && c.pack) body = `<div class="card"><div class="kicker">Course pack</div><p class="small">This course uses a ready-made pack. Its lessons, notes and questions were written from the course material, the full course summary and the study guide, so there is nothing to upload.</p><div class="row wrapr"><button class="btn small" id="ed">Exam date and type</button></div></div><div class="card"><button class="btn small ghost" id="del" style="color:var(--rust);border-color:var(--rust)">Remove this course</button></div>`;
  else if (tab === "files") {
    const fl = c.files.map(f => `<div class="file">${I.file}<div class="grow small">${H(f.name)}<div class="tiny muted">${f.role === "summary" ? "Summary" : f.role === "guide" ? "Study guide" : "Material"}${f.pages ? " · " + f.pages + " page" + (f.pages > 1 ? "s" : "") : ""}${f.ocred ? " · " + f.ocred + " scanned" : ""}</div></div>${kindOf(f.name, f.type) === "pdf" ? `<button class="btn small ghost" data-view="${f.id}">Open</button>` : ""}</div>`).join("");
    body = `<div class="card"><div class="kicker">Files</div>${fl || '<p class="small muted">No files.</p>'}</div><div class="card"><div class="kicker">Week list</div><p class="small muted">${A.weeks.length} weeks. Edit them if the LMS changed or a week matched badly.</p><div class="row wrapr"><button class="btn small" id="ew">Edit weeks</button><button class="btn small ghost" id="ef">Add or remove files</button><button class="btn small ghost" id="ed">Course details</button></div></div>
    <div class="card"><div class="kicker">Match report</div>${A.weeks.map(w => `<div class="small" style="margin-top:8px"><b>W${w.n}</b> ${H(w.title)}<div class="tiny muted">${w.sections.length ? "From: " + w.sections.slice(0, 4).map(s => H(s.title)).join(" · ") + (w.sections.length > 4 ? " +" + (w.sections.length - 4) : "") : w.status === "partial" ? "Pieced together from matching paragraphs" : "Nothing matched"}</div></div>`).join("")}${A.coverage.unusedSections.length ? `<p class="tiny muted" style="margin-top:10px">Not linked to any week: ${A.coverage.unusedSections.slice(0, 8).map(H).join("; ")}</p>` : ""}</div>
    <div class="card"><button class="btn small ghost" id="del" style="color:var(--rust);border-color:var(--rust)">Delete this course</button></div>`;
  }
  app.innerHTML = `<div class="wrap">${head}${body}</div>${dock("")}`;
  $$("[data-tab]").forEach(b => b.onclick = () => { R.tab = b.dataset.tab; render(); });
  $$("[data-wk]").forEach(el => el.onclick = () => go({ v: "week", id: c.id, n: +el.dataset.wk, tab: "learn" }));
  $$("[data-plan]").forEach(a => a.onclick = e => { e.preventDefault(); go(R._plan.items[+a.dataset.plan].go); });
  if (tab === "exam") (c.pack ? wirePackExam : wireExam)(c, A);
  if (tab === "practice") {
    $$("[data-mock]").forEach(b => b.onclick = () => go({ v: "mock", id: c.id, n: +b.dataset.mock }));
    $("#paper").onclick = () => go({ v: "paper", id: c.id }); const gc = $("[data-go-cards]"); gc.onclick = () => go({ v: "cards", id: c.id }); const mi = $("#mist"); mi.onclick = () => go({ v: "mistakes", id: c.id });
  }
  if (tab === "files") {
    $$("[data-view]").forEach(b => b.onclick = () => go({ v: "viewer", id: c.id, fid: b.dataset.view, page: 1 }));
    if (!c.pack) { $("#ew").onclick = () => go({ v: "add", step: 3, draft: draftOf(c) }); $("#ef").onclick = () => go({ v: "add", step: 1, draft: draftOf(c) }); } $("#ed").onclick = () => go({ v: "add", step: 0, draft: draftOf(c) });
    $("#del").onclick = async () => { if (!await confirmBox(`Delete ${c.code || c.title} and its files from this phone?`, "Delete")) return; for (const f of c.files) { await DB.del("file:" + f.id); await DB.del("lines:" + f.id); } await DB.del("atlas:" + c.id); atlasCache.delete(c.id); S.courses = S.courses.filter(x => x !== c); if (c.pack) S.hiddenPacks = [...new Set([...(S.hiddenPacks || []), c.pack])]; delete S.prog[c.id]; save(); stack.length = 0; go({ v: "home" }, false); toast("Course deleted."); };
  }
}
function draftOf(c) { return { pack: c.pack || "", id: c.id, code: c.code, title: c.title, exam: { ...c.exam }, weeksText: c.weeksText || "", files: c.files.map(f => ({ ...f })) }; }

/* ---------- exam notes ---------- */
function answerHtml(a, q) {
  if (!a) return "";
  return `<div class="ans"><div class="lbl">${q && q.marks <= 5 ? "Answer" : a.end ? "Introduction" : "Start with"}${a.marks[0] ? ` · ${a.marks[0]} mark${a.marks[0] > 1 ? "s" : ""}` : ""}</div>${a.intro.map(x => `<p>${H(x)}</p>`).join("") || '<p class="muted small">State what the question is about in one line.</p>'}${a.body.length ? `<div class="lbl">Main points${a.marks[1] ? ` · about ${a.marks[1]} mark${a.marks[1] > 1 ? "s" : ""} each` : ""}</div><ol>${a.body.map(x => `<li>${H(x)}</li>`).join("")}</ol>` : ""}${a.example ? `<div class="lbl">Example · ${a.marks[2] || 1} mark</div><p>${H(a.example)}</p>` : ""}${(q && q.marks <= 5) || !a.end ? "" : `<div class="lbl">Conclusion${a.marks[3] ? ` · ${a.marks[3]} mark` : ""}</div><p>${H(a.end)}</p>`}</div>`;
}
function examText(c, E) {
  const L = []; L.push(`${c.code} ${c.title} exam notes.`); L.push("Cram sheet."); E.cram.forEach((x, i) => L.push(`${i + 1}. ${x.text}`));
  E.weeks.forEach(w => { const pts = w.points.filter(p => p.tier !== "extra" && p.type !== "example"); if (!pts.length) return; L.push(`Week ${w.n}: ${w.title}.`); pts.forEach(p => L.push(p.term ? `${p.term}: ${p.def}` : p.text + (p.items ? " " + p.items.join("; ") + "." : ""))); });
  return L.join("\n");
}
function examTab(c, A) {
  const sc = scopeOf(c, A); const E = WW.examPack(A, sc, (c.pastQs || "").split(/\n+/).filter(x => x.trim().length > 8)); R._exam = E;
  const tierName = { core: "Must know", key: "Should know", extra: "Good to know" };
  return `<div class="card noprint"><div class="kicker">Exam covers</div><p class="small muted">Tap weeks to include or leave out (e.g. if your lecturer gave an area of concentration).</p><div class="row wrapr" id="scope">${A.weeks.map(w => `<span class="chip ${sc.includes(w.n) ? "on" : ""}" data-sc="${w.n}">W${w.n}</span>`).join("")}</div><div class="row" style="margin-top:10px"><a href="#" id="all" class="small">All weeks</a><span class="muted">·</span><a href="#" id="pq" class="small">${c.pastQs ? "Edit past questions" : "Add past questions (optional)"}</a></div></div>
  <div class="row noprint" style="margin:12px 0"><button class="btn small" id="pdf">${I.down}Save as PDF</button><button class="btn small ghost" data-listen id="lis">${I.play} Listen</button></div>
  <div class="card"><div class="kicker">Cram sheet</div><h3>The ${E.cram.length} things to know</h3><ol class="small" style="padding-left:20px">${E.cram.map(x => `<li style="margin:6px 0">${H(x.text)} <span class="src">W${x.week}</span></li>`).join("")}</ol></div>
  <div class="card"><div class="kicker">Likely questions</div><h3>Practise writing these</h3>${E.likely.slice(0, 12).map((q, i) => `<details style="margin-top:10px"><summary class="small"><b>${H(q.q)}</b> <span class="src">W${q.week} · ${q.marks} marks</span></summary>${answerHtml(q.answer, q)}</details>`).join("")}</div>
  ${E.hooks.length ? `<div class="card"><div class="kicker">Memory hooks</div>${E.hooks.map(h => `<div class="hook"><b>${H(h.code)}</b> “${H(h.line)}”<div class="tiny">${H(h.title)}: ${h.labels.map(H).join(", ")} <span class="src">W${h.week}</span></div></div>`).join("")}</div>` : ""}
  ${E.formulas.length ? `<div class="card"><div class="kicker">Formulas & rules</div>${E.formulas.map(f => `<div class="formula">${H(f.f)}</div>`).join("")}</div>` : ""}
  <div class="card"><div class="kicker">Week by week</div>${E.weeks.map(w => `<h3 style="margin-top:16px">Week ${w.n}: ${H(w.title)}${w.pq ? ` <span class="tag core">In past questions</span>` : ""}</h3>${["core", "key"].map(t => { const ps = w.points.filter(p => p.tier === t && p.type !== "example"); return ps.length ? `<div style="margin-top:8px"><span class="tag ${t}">${tierName[t]}</span><ul class="small" style="padding-left:18px;margin:6px 0">${ps.map(p => `<li style="margin:4px 0">${p.term ? `<b>${H(p.term)}</b>: ${H(p.def)}` : H(p.text)}${p.items ? `<ul>${p.items.map(x => `<li>${H(x)}</li>`).join("")}</ul>` : ""}</li>`).join("")}</ul></div>` : ""; }).join("")}`).join("")}</div>
  <div class="card"><div class="kicker">Glossary</div><dl class="gloss small">${E.glossary.map(g => `<dt>${H(g.term)} <span class="src">W${g.week}</span></dt><dd>${H(g.def)}</dd>`).join("")}</dl></div>`;
}
function wireExam(c, A) {
  $$("[data-sc]").forEach(ch => ch.onclick = () => { const n = +ch.dataset.sc; let sc = scopeOf(c, A); sc = sc.includes(n) ? sc.filter(x => x !== n) : [...sc, n].sort((a, b) => a - b); if (!sc.length) return toast("Keep at least one week."); c.scope = sc.length === A.weeks.length ? [] : sc; save(); const y = scrollY; render().then(() => scrollTo(0, y)); });
  $("#all").onclick = e => { e.preventDefault(); c.scope = []; save(); render(); };
  $("#pq").onclick = e => { e.preventDefault(); sheet(`<h3>Past questions</h3><p class="small muted">Paste any past or sample questions, one per line. Topics they mention move up in your notes.</p><textarea class="in" id="pqt">${H(c.pastQs || "")}</textarea><div class="sp"></div><button class="btn" id="pqs">Save</button>`, p => { $("#pqs", p).onclick = () => { c.pastQs = $("#pqt", p).value; save(); closeSheet(); render(); }; }); };
  $("#lis").onclick = e => speak(examText(c, R._exam), e.currentTarget);
  $("#pdf").onclick = () => exportPdf(c, A, R._exam).catch(e => toast("PDF failed: " + e.message));
}

/* ---------- PDF export (pdf-lib, built on the device) ---------- */
function winAnsi(s) { s = String(s).replace(/Θ/g, "Theta").replace(/[⇄]/g, "<->").replace(/−/g, "-").replace(/ᵏ/g, "^k").replace(/₂/g, "2").replace(/≠/g, "!=").replace(/÷/g, "/"); const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "ⁿ": "n", "⁺": "+", "⁻": "-", "ˣ": "x" }; return String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻ˣ]+/g, m => "^" + [...m].map(c => SUP[c]).join("")).replace(/₦/g, "N").replace(/[≤]/g, "<=").replace(/[≥]/g, ">=").replace(/[≈]/g, "~").replace(/[→]/g, "->").replace(/[←]/g, "<-").replace(/[↔]/g, "<->").replace(/[√]/g, "sqrt").replace(/[∑]/g, "Sum").replace(/[∫]/g, "Int").replace(/[θ]/g, "theta").replace(/[Ω]/g, "Omega").replace(/[ω]/g, "omega").replace(/[Δ]/g, "Delta").replace(/[δ]/g, "delta").replace(/[α]/g, "alpha").replace(/[β]/g, "beta").replace(/[λ]/g, "lambda").replace(/[μ]/g, "mu").replace(/[π]/g, "pi").replace(/[σ]/g, "sigma").replace(/[ε]/g, "epsilon").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF•]/g, ""); }
async function exportPdf(c, A, E) {
  toast("Making your PDF…");
  if (!window.PDFLib) await loadScript(BASE() + "lib/pdf-lib.min.js");
  const { PDFDocument, StandardFonts, rgb } = PDFLib; const doc = await PDFDocument.create();
  const F = await doc.embedFont(StandardFonts.Helvetica), FB = await doc.embedFont(StandardFonts.HelveticaBold), FS = await doc.embedFont(StandardFonts.TimesRomanBold);
  const W = 595, Hh = 842, M = 48; let pg, y;
  const newPage = () => { pg = doc.addPage([W, Hh]); y = Hh - M; pg.drawText(winAnsi(`${c.code} · Weekwise exam notes`), { x: M, y: 24, size: 8, font: F, color: rgb(.5, .5, .5) }); pg.drawText(String(doc.getPageCount()), { x: W - M, y: 24, size: 8, font: F, color: rgb(.5, .5, .5) }); };
  const text = (t, { size = 10, font = F, indent = 0, color = rgb(.1, .12, .18), gap = 3 } = {}) => { t = winAnsi(t); const maxW = W - 2 * M - indent; const words = t.split(/\s+/); let line = ""; const flush = () => { if (y < M + size) newPage(); pg.drawText(line, { x: M + indent, y: y - size, size, font, color }); y -= size * 1.35; }; for (const w of words) { const tt = line ? line + " " + w : w; if (font.widthOfTextAtSize(tt, size) > maxW && line) { flush(); line = w; } else line = tt; } if (line) flush(); y -= gap; };
  newPage();
  text(c.code || "", { size: 24, font: FS, gap: 0 }); text(c.title || "", { size: 13, font: FB }); text(`Exam notes for weeks ${scopeOf(c, A).join(", ")} · made ${new Date().toLocaleDateString()}`, { size: 9, color: rgb(.45, .45, .45), gap: 12 });
  text("CRAM SHEET", { size: 12, font: FB, color: rgb(.72, .45, .08) }); E.cram.forEach((x, i) => text(`${i + 1}. ${x.text}  (W${x.week})`, { indent: 6 })); y -= 8;
  text("LIKELY QUESTIONS", { size: 12, font: FB, color: rgb(.72, .45, .08) });
  E.likely.slice(0, 10).forEach((q, i) => { text(`${i + 1}. ${q.q} [${q.marks} marks, W${q.week}]`, { font: FB, indent: 6 }); const a = q.answer; if (a) { a.intro.forEach(x => text(x, { indent: 18, size: 9 })); a.body.slice(0, 5).forEach(x => text("• " + x, { indent: 18, size: 9 })); if (a.example) text("e.g. " + a.example, { indent: 18, size: 9 }); text(a.end, { indent: 18, size: 9, gap: 6 }); } }); y -= 8;
  if (E.hooks.length) { text("MEMORY HOOKS", { size: 12, font: FB, color: rgb(.72, .45, .08) }); E.hooks.forEach(h => text(`${h.code} - "${h.line}": ${h.title}: ${h.labels.join(", ")}`, { indent: 6 })); y -= 8; }
  if (E.formulas.length) { text("FORMULAS & RULES", { size: 12, font: FB, color: rgb(.72, .45, .08) }); E.formulas.forEach(f => text(f.f + `  (W${f.week})`, { indent: 6 })); y -= 8; }
  E.weeks.forEach(w => { const ps = w.points.filter(p => p.tier !== "extra" && p.type !== "example"); if (!ps.length) return; if (y < 140) newPage(); text(`WEEK ${w.n}: ${w.title}`, { size: 12, font: FB, color: rgb(.11, .13, .2), gap: 4 }); ps.forEach(p => { text((p.tier === "core" ? "[MUST] " : "") + (p.term ? `${p.term}: ${p.def}` : p.text), { indent: 6, font: p.tier === "core" ? FB : F }); (p.items || []).forEach(x => text("– " + x, { indent: 20, size: 9, gap: 1 })); }); y -= 6; });
  if (E.glossary.length) { newPage(); text("GLOSSARY", { size: 12, font: FB, color: rgb(.72, .45, .08) }); E.glossary.forEach(g => text(`${g.term}: ${g.def}`, { indent: 6, size: 9 })); }
  const bytes = await doc.save(); const name = `${(c.code || "course").replace(/[^A-Za-z0-9]+/g, "-")}-exam-notes.pdf`;
  await shareFile(bytes, name, "application/pdf");
}
async function shareFile(bytes, name, mime) {
  if (NATIVE() && WWCap.Filesystem) {
    let b64 = ""; const CH = 0x8000; for (let i = 0; i < bytes.length; i += CH) b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + CH)); b64 = btoa(b64);
    const r = await WWCap.Filesystem.writeFile({ path: name, data: b64, directory: "CACHE" });
    try { await WWCap.Share.share({ title: name, url: r.uri, dialogTitle: "Save or send" }); } catch (e) { if (!/cancel/i.test(e.message || "")) throw e; }
    return;
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: mime })); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); toast("Saved to your downloads.");
}

/* ---------- week ---------- */
async function renderWeek(app) {
  const c = course(R.id); const A = await atlasOf(c.id); const w = A.weeks.find(x => x.n === R.n); if (!w) return back();
  const tab = R.tab || "learn"; const p = wk(c.id, w.n); const i = A.weeks.indexOf(w);
  const srcFile = w.pages.length ? c.files.find(f => f.id === A.fileIds[w.pages[0].file] && kindOf(f.name, f.type) === "pdf") : null;
  const prevW = A.weeks[i - 1], nextW = A.weeks[i + 1];
  const head = `${topbar(w.title, `${c.code} · Week ${w.n}`)}<div class="tabs">${[["learn", "Learn"], ...(w.pack ? [["notes", "Notes"]] : []), ["quiz", "Quiz"], ["cards", "Cards"], ["theory", "Theory"]].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
  let body = "";
  if (tab === "learn" && w.pack) body = lessonHtml(c, w);
  else if (tab === "notes" && w.pack) body = `<div class="row noprint"><button class="btn small ghost" data-listen id="lis">${I.play} Listen</button></div><div class="card" style="margin-top:12px"><p class="bigline">${F(w.big)}</p>${weekNotesHtml(w, true)}</div>`;
  else if (tab === "learn") {
    const tierName = { core: "Must know", key: "Should know", extra: "Good to know" };
    if (w.status === "missing") body = `<div class="card"><h3>No material for this week</h3><p class="small muted">Nothing in your files matched “${H(w.title)}”. Add this week's material in Files, or check the week title.</p></div>`;
    else {
      const pts = t => w.points.filter(x => x.tier === t);
      body = `<div class="lesson"><div class="row noprint"><button class="btn small ghost" data-listen id="lis">${I.play} Listen</button>${srcFile ? `<button class="btn small ghost" id="src">${I.book} Source pages</button>` : ""}</div>
      ${w.overview.length ? `<div class="card" style="margin-top:12px"><div class="kicker">In one breath</div><p style="font-family:var(--serif);font-weight:600;font-size:1.08rem">${w.overview.map(H).join(" ")}</p></div>` : ""}
      ${w.objectives.length ? `<div class="card"><div class="kicker">By the end of this week you should be able to</div><ul class="small" style="padding-left:18px">${w.objectives.map(o => `<li>${H(o)}</li>`).join("")}</ul></div>` : ""}
      ${["core", "key", "extra"].map(t => pts(t).length ? `<h3><span class="tag ${t}">${tierName[t]}</span></h3><div class="card">${pts(t).map(x => `<div class="pt">${x.term ? `<span class="term">${H(x.term)}</span>: ${H(x.def)}` : x.type === "formula" ? `<div class="formula">${H(x.text)}</div>` : x.type === "example" ? `<span class="muted small">Example:</span> ${H(x.text)}` : H(x.text)}${x.items ? `<ul>${x.items.map(it => `<li>${H(it)}</li>`).join("")}</ul>` : ""}${x.memo ? `<div class="hook">Memory hook: <b>${H(x.memo.code)}</b>, “${H(x.memo.line)}”</div>` : ""}</div>`).join("")}</div>` : "").join("")}
      ${w.summary.length ? `<h3>From the summary</h3><div class="card small"><ul style="padding-left:18px;margin:0">${w.summary.map(s => `<li style="margin:4px 0">${H(s)}</li>`).join("")}</ul></div>` : ""}
      ${w.terms.length ? `<h3>Key terms</h3><div class="card"><dl class="gloss small">${w.terms.map(t => `<dt>${H(t.term)}</dt><dd>${H(t.def)}</dd>`).join("")}</dl></div>` : ""}
      ${w.examples.length ? `<h3>Examples</h3><div class="card small">${w.examples.map(e => `<p>${H(e)}</p>`).join("")}</div>` : ""}
      <div class="sp"></div><button class="btn ${p.read ? "ghost" : "sun"} block" id="rd">${p.read ? "✓ Marked as read" : "I've read this. Quiz me"}</button></div>`;
    }
  }
  if (tab === "quiz") body = quizBody(w.mcq, "wq");
  if (tab === "cards") { const pc = P(c.id).cards; const known = w.cards.filter(k => pc[k.id] && pc[k.id].reps).length; body = `<div class="card"><h3>${w.cards.length} cards</h3><p class="small muted">${known} learned. Review the whole week, or only the cards that are due.</p><div class="row"><button class="btn small" id="cw" ${w.cards.length ? "" : "disabled"}>Study this week</button></div></div><div class="card"><dl class="gloss small">${w.cards.map(k => `<dt>${H(k.f)}</dt><dd style="white-space:pre-line">${H(k.b)}</dd>`).join("")}</dl></div>`; }
  if (tab === "theory") body = w.theory.length ? w.theory.map((q, k) => `<div class="card"><div class="row"><b class="grow">${H(q.q)}</b><span class="tag extra">${q.marks}m</span></div><div class="row" style="margin-top:8px"><button class="btn small ghost" data-ans="${k}">Model answer</button><button class="btn small ghost" data-write="${k}">Write & mark</button></div><div id="ta${k}"></div></div>`).join("") : `<div class="card"><p class="muted">No theory questions for this week.</p></div>`;
  const nav = `<div class="row" style="margin-top:18px">${prevW ? `<button class="btn ghost small" id="pw">← Week ${prevW.n}</button>` : ""}<span class="grow"></span>${nextW ? `<button class="btn ghost small" id="nw">Week ${nextW.n} →</button>` : ""}</div>`;
  app.innerHTML = `<div class="wrap">${head}${body}${nav}</div>`;
  $$("[data-tab]").forEach(b => b.onclick = () => { R.tab = b.dataset.tab; stopSpeak(); render(); });
  const pw = $("#pw"); if (pw) pw.onclick = () => { R.n = prevW.n; R.ti = null; render(); scrollTo(0, 0); }; const nw = $("#nw"); if (nw) nw.onclick = () => { R.n = nextW.n; R.ti = null; render(); scrollTo(0, 0); };
  if (w.pack && (tab === "learn" || tab === "notes")) wirePackWeek(c, A, w, tab);
  else if (tab === "learn" && w.status !== "missing") {
    $("#rd").onclick = () => { p.read = true; touchStreak(); save(); R.tab = "quiz"; render(); scrollTo(0, 0); };
    $("#lis").onclick = e => speak([`Week ${w.n}. ${w.title}.`, ...w.overview, ...w.points.filter(x => x.type !== "example").map(x => x.term ? `${x.term}. ${x.def}` : x.text + (x.items ? " " + x.items.join(". ") + "." : ""))].join("\n"), e.currentTarget);
    const sb = $("#src"); if (sb) sb.onclick = () => { const pg = w.pages[0]; const fid = srcFile.id; go({ v: "viewer", id: c.id, fid, page: pg.page, only: w.pages.filter(x => x.file === pg.file).map(x => x.page) }); };
  }
  if (tab === "quiz") runQuiz(w.mcq, "wq", res => { const old = p.best; p.best = Math.max(p.best || 0, res.score); p.tries++; touchStreak(); res.wrong.forEach(q => addWrong(c, w.n, q)); res.right.forEach(q => clearWrong(c, q)); save(); return old; });
  if (tab === "cards") { const b = $("#cw"); b.onclick = () => go({ v: "cards", id: c.id, ns: [w.n], all: true }); }
  if (tab === "theory") {
    $$("[data-ans]").forEach(b => b.onclick = () => { const q = w.theory[+b.dataset.ans]; const el = $("#ta" + b.dataset.ans); el.innerHTML = el.innerHTML ? "" : answerHtml(q.answer, q); });
    $$("[data-write]").forEach(b => b.onclick = () => { const k = +b.dataset.write; const q = w.theory[k]; const el = $("#ta" + k); el.innerHTML = `<textarea class="in" style="min-height:140px;margin-top:10px" placeholder="Write your answer the way you would in the exam…"></textarea><button class="btn small" style="margin-top:8px">Mark it</button><div></div>`; $("button", el).onclick = () => { const ans = $("textarea", el).value; if (ans.trim().split(/\s+/).length < 5) return toast("Write a bit more first."); const guide = [...q.answer.intro, ...q.answer.body]; const m = WW.mark(ans, guide); p.theory = Math.max(p.theory || 0, m.score / 10); touchStreak(); save(); $("div", el).innerHTML = `<div class="card" style="margin-top:10px"><div class="row"><span class="big">${m.score}</span><span class="muted">/ 10 estimated</span></div>${m.hit.length ? `<p class="small"><b>You covered:</b></p><ul class="small">${m.hit.map(x => `<li>${H(x)}</li>`).join("")}</ul>` : ""}${m.miss.length ? `<p class="small"><b>Add these to score higher:</b></p><ul class="small">${m.miss.map(x => `<li>${H(x)}</li>`).join("")}</ul>` : ""}<p class="tiny muted">A word-match estimate. Your examiner also marks clarity and examples.</p></div>`; }; });
  }
}
function addWrong(c, n, q) { const pr = P(c.id); if (!pr.wrong.some(x => x.q.q === q.q)) pr.wrong.push({ n, q, at: Date.now() }); if (pr.wrong.length > 200) pr.wrong.shift(); }
function clearWrong(c, q) { const pr = P(c.id); pr.wrong = pr.wrong.filter(x => x.q.q !== q.q); }

/* ---------- MCQ engine (shared) ---------- */
function quizBody(qs, key) { if (!qs.length) return `<div class="card"><p class="muted">Not enough material for questions in this week.</p></div>`; return `<div id="${key}"></div>`; }
function runQuiz(qs, key, onDone, opts = {}) {
  const host = $("#" + key); if (!host || !qs.length) return; let i = 0; const res = []; const t0 = Date.now();
  const show = () => {
    if (i >= qs.length) {
      const right = res.filter(r => r.ok).map(r => r.q), wrong = res.filter(r => !r.ok).map(r => r.q); const score = right.length / qs.length; const old = onDone({ score, right, wrong });
      host.innerHTML = `<div class="card" style="text-align:center"><div class="kicker">Result</div><div class="big" style="margin:8px 0">${Math.round(score * 100)}%</div><p class="muted">${right.length} of ${qs.length} right${opts.timed ? ` · ${Math.round((Date.now() - t0) / 60000)} min` : ""}${old != null && score > old ? " · new best!" : ""}</p><p class="small">${score >= 0.8 ? "Solid. Move on, and come back in a few days." : score >= 0.5 ? "Getting there. Read the Must-know points again, then retry." : "Go back to the lesson first, then try again."}</p><div class="row" style="justify-content:center"><button class="btn small" id="${key}r">Try again</button></div></div>${wrong.length ? `<h3 style="margin-top:16px">Review</h3>${wrong.map(q => `<div class="card small"><b>${H(q.q)}</b><p style="color:var(--leaf)">✓ ${H(q.o[q.a])}</p><div class="why">${H(q.why)}</div></div>`).join("")}` : ""}`;
      $("#" + key + "r").onclick = () => { i = 0; res.length = 0; show(); }; return;
    }
    const q = qs[i];
    host.innerHTML = `<div class="prog">${qs.map((_, k) => `<i class="${k < i ? (res[k].ok ? "ok" : "no") : k === i ? "cur" : ""}"></i>`).join("")}</div><div class="kicker">Question ${i + 1} of ${qs.length}${q._w ? ` · W${q._w}` : ""}</div><h3 style="margin:8px 0 6px;font-family:var(--sans);font-weight:600;font-size:1.05rem;line-height:1.4">${H(q.q)}</h3>${q.o.map((o, k) => `<button class="opt" data-o="${k}">${String.fromCharCode(65 + k)}. ${H(o)}</button>`).join("")}<div id="${key}f"></div>`;
    $$("[data-o]", host).forEach(b => b.onclick = () => {
      if (host.dataset.lock === "1") return; host.dataset.lock = "1"; const k = +b.dataset.o; const ok = k === q.a; res.push({ q, ok });
      $$("[data-o]", host).forEach((x, j) => { if (j === q.a) x.classList.add("right"); else if (j === k) x.classList.add("wrong"); });
      $("#" + key + "f").innerHTML = `<div class="why">${ok ? "<b>Correct.</b> " : "<b>Not quite.</b> "}${H(q.why)}</div><div class="sp"></div><button class="btn block" id="${key}n">${i + 1 < qs.length ? "Next" : "See result"}</button>`;
      $("#" + key + "n").onclick = () => { host.dataset.lock = "0"; i++; show(); window.scrollTo(0, host.offsetTop - 80); };
    });
  };
  show();
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

async function renderMock(app) {
  const c = course(R.id); const A = await atlasOf(c.id); const sc = scopeOf(c, A);
  if (!R.qs) { const pool = A.weeks.filter(w => sc.includes(w.n)).map(w => shuffle(w.mcq).map(q => ({ ...q, _w: w.n }))); const out = []; let k = 0; while (out.length < R.n && pool.some(p => p.length)) { const p = pool[k++ % pool.length]; if (p.length) out.push(p.shift()); } R.qs = shuffle(out).map(q => { const o = shuffle(q.o.map((x, j) => ({ x, ok: j === q.a }))); return { ...q, o: o.map(z => z.x), a: o.findIndex(z => z.ok) }; }); }
  app.innerHTML = `<div class="wrap">${topbar("Mock exam", c.code)}<div id="mk"></div></div>`;
  runQuiz(R.qs, "mk", res => { const pr = P(c.id); pr.mocks.push({ at: Date.now(), n: R.qs.length, score: res.score }); res.wrong.forEach(q => addWrong(c, q._w, q)); res.right.forEach(q => clearWrong(c, q)); touchStreak(); save(); }, { timed: true });
}
async function renderPaper(app) {
  const c = course(R.id); const A = await atlasOf(c.id); const sc = scopeOf(c, A);
  if (!R.qs) { const E = WW.examPack(A, sc, (c.pastQs || "").split(/\n+/)); const top = E.likely.filter(q => q.marks >= 6); R.qs = shuffle(top.slice(0, 14)).slice(0, 5); }
  app.innerHTML = `<div class="wrap">${topbar("Theory paper", c.code)}<div class="card"><p class="small">Answer like the real exam: an introduction, the main points, an example, then a conclusion. Aim for about 30 minutes in total.</p></div>${R.qs.map((q, k) => `<div class="card"><div class="row"><b class="grow">${k + 1}. ${H(q.q)}</b><span class="tag extra">W${q.week}</span></div><textarea class="in" data-pa="${k}" style="min-height:130px;margin-top:10px" placeholder="Your answer…"></textarea><div id="pr${k}"></div></div>`).join("")}<button class="btn sun block" id="mkall">Mark my paper</button><div id="tot"></div></div>`;
  $("#mkall").onclick = () => { let t = 0; R.qs.forEach((q, k) => { const ans = $(`[data-pa="${k}"]`).value; const m = WW.mark(ans || "", [...q.answer.intro, ...q.answer.body]); const sc10 = ans.trim().split(/\s+/).length < 5 ? 0 : m.score; t += sc10; $("#pr" + k).innerHTML = `<p class="small"><b>${sc10}/10</b>. ${m.miss.length ? "Missing: " + m.miss.slice(0, 3).map(H).join(" · ") : "Well covered."}</p><details class="small"><summary>Model answer</summary>${answerHtml(q.answer, q)}</details>`; }); $("#tot").innerHTML = `<div class="card" style="text-align:center;margin-top:12px"><div class="big">${Math.round(t / R.qs.length * 10)}%</div><p class="tiny muted">Word-match estimate.</p></div>`; touchStreak(); save(); };
}

/* ---------- flashcards with spaced repetition ---------- */
async function renderCardsSession(app) {
  const c = course(R.id); const A = await atlasOf(c.id); const pc = P(c.id).cards;
  if (!R.deck) { const ns = R.ns || scopeOf(c, A); let d = R.all ? A.weeks.filter(w => ns.includes(w.n)).flatMap(w => w.cards.map(k => ({ ...k, week: w.n }))) : dueCards(c, A, ns); d.sort((a, b) => ((pc[a.id] || {}).due || 0) - ((pc[b.id] || {}).due || 0)); R.deck = d.slice(0, 40); R.i = 0; }
  const k = R.deck[R.i];
  if (!k) { app.innerHTML = `<div class="wrap">${topbar("Flashcards", c.code)}<div class="card empty"><div class="art">✓</div><h3>Done for now</h3><p class="small muted">Cards you found hard will come back sooner.</p><button class="btn" data-back>Back</button></div></div>`; touchStreak(); return; }
  app.innerHTML = `<div class="wrap">${topbar("Flashcards", `${c.code} · ${R.i + 1} of ${R.deck.length} · W${k.week}`)}<div class="flash" id="fc"><div class="in"><div class="face front">${H(k.f)}<div class="tiny muted" style="margin-top:14px;font-family:var(--sans);font-weight:500">Tap to flip</div></div><div class="face back">${H(k.b)}</div></div></div><div id="gr" style="visibility:hidden"><p class="small muted" style="text-align:center">How well did you know it?</p><div class="grade"><button class="btn ghost" data-g="0">Again</button><button class="btn ghost" data-g="1">Hard</button><button class="btn ghost" data-g="2">Good</button><button class="btn" data-g="3">Easy</button></div></div></div>`;
  $("#fc").onclick = () => { $("#fc").classList.toggle("flip"); $("#gr").style.visibility = "visible"; };
  $$("[data-g]").forEach(b => b.onclick = () => { const g = +b.dataset.g; const s = pc[k.id] || { ef: 2.5, iv: 0, reps: 0, due: 0 };
    if (g === 0) { s.reps = 0; s.iv = 0; s.due = Date.now() + 60e3; R.deck.push(k); } else { s.reps++; s.ef = Math.max(1.3, s.ef + [0, -0.15, 0, 0.15][g]); s.iv = s.reps === 1 ? (g === 3 ? 3 : 1) : s.reps === 2 ? (g === 1 ? 2 : 4) : Math.round(s.iv * s.ef * (g === 1 ? 0.7 : g === 3 ? 1.3 : 1)); s.due = today() + s.iv * DAY; }
    pc[k.id] = s; save(); R.i++; render(); });
}
async function renderMistakes(app) {
  const c = course(R.id); const pr = P(c.id);
  if (!R.qs) R.qs = shuffle(pr.wrong).slice(0, 15).map(x => ({ ...x.q, _w: x.n }));
  app.innerHTML = `<div class="wrap">${topbar("Fix mistakes", c.code)}${R.qs.length ? `<div id="ms"></div>` : `<div class="card empty"><div class="art">✓</div><h3>No mistakes saved</h3></div>`}</div>`;
  runQuiz(R.qs, "ms", res => { res.right.forEach(q => clearWrong(c, q)); touchStreak(); save(); });
}

/* ---------- PDF viewer ---------- */
async function renderViewer(app) {
  const c = course(R.id); const f = c.files.find(x => x.id === R.fid); if (!f) return back();
  app.innerHTML = `<div class="wrap">${topbar(f.name, c.code)}${R.only && R.only.length ? `<p class="small muted">Showing the pages for this week (${R.only[0]}–${R.only[R.only.length - 1]}). <a href="#" id="allp">Show the whole file</a></p>` : ""}<div id="pv"><div class="row"><span class="spin"></span><span class="small">Opening…</span></div></div></div>`;
  const ap = $("#allp"); if (ap) ap.onclick = e => { e.preventDefault(); R.only = null; render(); };
  const blob = await DB.get("file:" + f.id); if (!blob) { $("#pv").innerHTML = `<p class="muted">File missing. It may not have been in the backup you restored.</p>`; return; }
  const pj = await pdfjs(); const doc = await pj.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise;
  const pages = R.only && R.only.length ? R.only : Array.from({ length: doc.numPages }, (_, i) => i + 1);
  const host = $("#pv"); host.innerHTML = pages.map(n => `<div class="pdfpg" data-p="${n}"><div class="tiny muted" style="padding:6px 10px;color:#666">Page ${n}</div></div>`).join("");
  const Wd = Math.min(1400, host.clientWidth * (devicePixelRatio || 1));
  const draw = async el => { if (el.dataset.done) return; el.dataset.done = 1; const pg = await doc.getPage(+el.dataset.p); const v0 = pg.getViewport({ scale: 1 }); const vp = pg.getViewport({ scale: Wd / v0.width }); const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height; await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise; el.appendChild(cv); };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) draw(e.target); }), { rootMargin: "600px" }); $$(".pdfpg", host).forEach(el => io.observe(el));
}

/* ---------- guide ---------- */
function renderGuide(app) {
  app.innerHTML = `<div class="wrap"><div class="top"><div class="grow"><div class="kicker">Guide</div><h1>How Weekwise works</h1></div></div>
  <div class="card guide"><h3>Your class</h3><p class="small">Weekwise asks for your department, level and semester, then loads the ready-made courses for that class. When new courses are added for your class, they appear by themselves the next time you open Weekwise with internet. Change your class in Settings.</p></div>
  <div class="card guide"><h3>Two kinds of course</h3><p class="small"><b>Ready-made packs</b> are written by hand from a course's material, summary and study guide. They teach each week step by step and give clean exam notes. Add one from the home screen.</p><p class="small"><b>Your own uploads</b> are sorted automatically on your phone. They are quick and work for any course, but the notes use the wording of your files.</p></div>
  <div class="card guide"><h3>1. Add a course</h3><p class="small">Tap <b>Add course</b>. Enter the code, title, exam date (if you know it) and exam type.</p></div>
  <div class="card guide"><h3>2. Upload the material</h3><p class="small">Add the full course material: one large PDF or several unit files. Word, PowerPoint, text files and photos of pages also work. Scanned pages are read automatically, but each one takes a few seconds.</p></div>
  <div class="card guide"><h3>3. Add the summary</h3><p class="small">If your school gives a course summary, add it. Weekwise uses it to decide what's most important, and those points get the <span class="tag core">Must know</span> label.</p></div>
  <div class="card guide"><h3>4. Paste your weeks</h3><p class="small">Open your LMS, copy the weekly topics and paste them in. One week per line is enough:</p><div class="formula">Week 1: Introduction to economics<br>Week 2: Scarcity and opportunity cost<br>Week 3: Factors of production</div><p class="small">Weekwise finds each week's part of the material, even when the wording differs a little. If a week has no matching material, it tells you.</p></div>
  <div class="card guide"><h3>5. Study each week</h3><ul class="small" style="padding-left:18px"><li><b>Learn</b>: in a pack, a step-by-step lesson. Each part explains the idea, gives an everyday picture and a worked example, then asks you one question before you move on. For your own uploads, the week's points sorted into Must / Should / Good to know.</li><li><b>Notes</b> (packs): the week's exam notes on one page. <b>Listen</b> reads only the teaching content and skips code and tables of symbols.</li><li><b>Quiz</b>: multiple-choice questions with explanations.</li><li><b>Cards</b>: flashcards that come back at the right time.</li><li><b>Theory</b>: likely essay questions with model answers. Write your own answer and get it marked.</li></ul></div>
  <div class="card guide"><h3>6. Get exam-ready</h3><ul class="small" style="padding-left:18px"><li>In <b>Exam notes</b>, choose which weeks your exam covers. Everything updates to match.</li><li>The <b>Cram sheet</b> holds the most important points, for when time is short.</li><li><b>Save as PDF</b> to print or share your notes.</li><li><b>Practice</b> has timed mocks, a theory paper and your saved mistakes.</li><li>The <b>Today</b> plan adjusts to the time you have left: months, weeks, days or hours.</li></ul></div>
  <div class="card guide"><h3>Tips</h3><ul class="small" style="padding-left:18px"><li>Paste the week titles exactly as your LMS shows them. Matching works better that way.</li><li>Got past questions? Add them in Exam notes. Topics they mention move to the top.</li><li>Back up in Settings before changing phones. Your files can go in the backup too.</li><li>Everything runs on your phone. No internet needed, and nothing is uploaded.</li></ul></div>
  <div class="card guide"><h3>Common questions</h3><p class="small"><b>A week says “No material”.</b> The week's title didn't match anything in your files. Open Files, then Edit weeks, and add a few words from the material, e.g. “Week 8: Money and banking (functions of money, central bank)”.</p><p class="small"><b>The material is in one huge file.</b> That's fine. Weekwise splits it by its headings.</p><p class="small"><b>My exam is in a few hours.</b> Open Exam notes and read the cram sheet, then the likely questions. Skip everything else.</p></div>
  </div>${dock("guide")}`;
}

/* ---------- settings & backup ---------- */
function renderSettings(app) {
  app.innerHTML = `<div class="wrap"><div class="top"><div class="grow"><div class="kicker">Settings</div><h1>You</h1></div></div>
  <div class="card"><label class="f" for="nm">Name</label><input class="in" id="nm" value="${H(S.name)}" maxlength="30"><label class="f">Theme</label><div class="row wrapr">${[["auto", "Match phone"], ["paper", "Paper"], ["ink", "Ink (dark)"]].map(([k, l]) => `<span class="chip ${S.theme === k ? "on" : ""}" data-th="${k}">${l}</span>`).join("")}</div><label class="f">Text size</label><div class="row wrapr">${[[14, "Small"], [16, "Normal"], [18, "Large"], [20, "Larger"]].map(([k, l]) => `<span class="chip ${S.fs === k ? "on" : ""}" data-fs="${k}">${l}</span>`).join("")}</div></div>
  <div class="card"><div class="kicker">Your class</div>${classForm("st")}<div class="row wrapr" style="margin-top:12px"><button class="btn small" id="svcls">Save</button><button class="btn small ghost" id="upd">Check for new courses</button></div><p class="tiny muted" style="margin-top:8px">${S.catChecked ? "Last checked " + new Date(S.catChecked).toLocaleString() : "Not checked yet"}. Weekwise checks by itself whenever you open it with internet.</p></div>
  <div class="card"><div class="kicker">Backup</div><p class="small muted">Save everything (courses, progress and optionally your files) to one backup file. Restore it on any phone.</p><label class="row small" style="margin:8px 0"><input type="checkbox" id="wf" checked> Include my files (bigger backup)</label><div class="row wrapr"><button class="btn small" id="bk">${I.down}Make backup</button><label class="btn small ghost" for="rs">Restore</label><input type="file" id="rs" accept=".json,application/json" hidden></div></div>
  <div class="card"><div class="kicker">Course packs</div><p class="small muted">Got a Weekwise pack file for a course? Load it here.</p><label class="btn small ghost" for="pk">Load a pack file</label><input type="file" id="pk" accept=".json,application/json" hidden></div>
  <div class="card"><div class="kicker">About</div><p class="small">Weekwise 2.0. Works fully offline. Your files and progress stay on this device.</p><button class="btn small ghost" id="reset" style="color:var(--rust);border-color:var(--rust)">Erase everything</button></div>
  </div>${dock("settings")}`;
  $("#nm").onchange = e => { S.name = e.target.value.trim(); save(); toast("Saved."); };
  const readCls = wireClassForm("st", app);
  $("#svcls").onclick = async () => { const v = readCls(); if (!v.dept || !v.level || !v.sem) return toast("Choose your department, level and semester."); Object.assign(S, v); save(); await syncClass(false).catch(() => toast("Couldn't reach the course list. You're offline?")); render(); };
  $("#upd").onclick = async () => { await syncClass(false).catch(() => toast("Couldn't reach the course list. You're offline?")); render(); };
  if (!R._catAsked) { R._catAsked = 1; getCatalog().then(() => { const sel = $("#std"); if (R.v === "settings" && sel && sel.options.length < depts().length + 2) render(); }).catch(() => { }); }
  $$("[data-th]").forEach(ch => ch.onclick = () => { S.theme = ch.dataset.th; applyTheme(); save(); render(); });
  $$("[data-fs]").forEach(ch => ch.onclick = () => { S.fs = +ch.dataset.fs; applyTheme(); save(); render(); });
  $("#bk").onclick = () => backup($("#wf").checked).catch(e => toast("Backup failed: " + e.message));
  $("#rs").onchange = e => { const f = e.target.files[0]; if (f) restore(f).catch(er => toast("Restore failed: " + er.message)); };
  $("#pk").onchange = e => { const f = e.target.files[0]; if (f) loadPackFile(f).catch(er => toast("Couldn't load: " + er.message)); };
  $("#reset").onclick = async () => { if (!await confirmBox("Erase all courses, files and progress on this phone?", "Erase")) return; await DB.clear(); atlasCache.clear(); S = fresh(); save(); applyTheme(); R = { v: "home" }; stack.length = 0; render(); };
}
async function blobToB64(b) { const buf = new Uint8Array(await b.arrayBuffer()); let s = ""; const CH = 0x8000; for (let i = 0; i < buf.length; i += CH) s += String.fromCharCode.apply(null, buf.subarray(i, i + CH)); return btoa(s); }
async function backup(withFiles) {
  toast("Preparing backup…"); const out = { app: "weekwise", v: 1, at: Date.now(), state: S, atlas: {}, files: {} };
  for (const c of S.courses) { out.atlas[c.id] = await atlasOf(c.id); if (withFiles) for (const f of c.files) { const b = await DB.get("file:" + f.id); if (b) out.files[f.id] = { type: b.type || f.type || "", data: await blobToB64(b) }; } }
  const bytes = new TextEncoder().encode(JSON.stringify(out)); await shareFile(bytes, `weekwise-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
}
async function restore(file) {
  const j = JSON.parse(await file.text()); if (j.app !== "weekwise" || !j.state) throw new Error("This isn't a Weekwise backup.");
  if (!await confirmBox("Replace everything on this phone with the backup?", "Restore")) return;
  await DB.clear(); atlasCache.clear(); S = Object.assign(fresh(), j.state);
  for (const id in j.atlas || {}) if (j.atlas[id]) await DB.set("atlas:" + id, j.atlas[id]);
  for (const id in j.files || {}) { const bin = atob(j.files[id].data); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); await DB.set("file:" + id, new Blob([u], { type: j.files[id].type })); }
  await DB.set("state", S); applyTheme(); stack.length = 0; R = { v: "home" }; render(); toast("Backup restored.");
}

/* ---------- course packs: lessons, notes, smart listen ---------- */
const arr = x => x == null ? [] : Array.isArray(x) ? x : [x];
function F(s) {
  let h = H(s); const codes = [];
  h = h.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return "\u0001" + (codes.length - 1) + "\u0002"; });
  h = h.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:)!?]|$)/g, "$1<em>$2</em>");
  return h.replace(/\u0001(\d+)\u0002/g, (m, i) => "<code>" + codes[+i] + "</code>");
}
const plain = s => String(s).replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:)!?]|$)/g, "$1$2");
const SUPN = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "ⁿ": "n", "ᵏ": "k" };
/* turn written text into something a voice can read naturally */
function spoken(s) {
  let t = String(s).replace(/`([^`]+)`/g, (m, c) => (/^[\w\s()\[\].,+\-*\/=<>!&%']+$/.test(c) && c.length <= 26 && !/;/.test(c)) ? " " + c.replace(/&(?=\w)/g, "address of ").replace(/\*(?=\w)/g, "star ").replace(/->/g, " arrow ").replace(/==/g, " equals ").replace(/!=/g, " not equal to ").replace(/\+\+/g, " plus plus").replace(/%/g, " mod ") + " " : " shown on screen ");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:)!?]|$)/g, "$1$2");
  t = t.replace(/O\(([^()]+)\)/g, " O of $1 ").replace(/([A-Za-z0-9])²/g, "$1 squared").replace(/([A-Za-z0-9])³/g, "$1 cubed").replace(/([A-Za-z0-9])([⁰¹⁴-⁹ⁿᵏ]+)/g, (m, a, b) => a + " to the power " + [...b].map(c => SUPN[c]).join("")).replace(/log₂/g, "log 2 ");
  t = t.replace(/\s<\s/g, " is less than ").replace(/\s>\s/g, " is greater than ").replace(/≤/g, " less than or equal to ").replace(/≥/g, " greater than or equal to ").replace(/[×·]/g, " times ").replace(/÷/g, " divided by ").replace(/(\s)[−–](\s?\d)/g, "$1minus $2").replace(/−/g, " minus ").replace(/[→]/g, " to ").replace(/[←⇄]/g, " ").replace(/Ω/g, "Omega").replace(/Θ/g, "Theta").replace(/\bNULL\b/g, "null").replace(/\be\.g\./g, "for example").replace(/\bi\.e\./g, "that is").replace(/=/g, " equals ").replace(/[\[\]{}]/g, " ").replace(/\s+/g, " ").trim();
  return t;
}
const TIERN = { m: ["core", "Must know"], s: ["key", "Should know"], g: ["extra", "Good to know"] };
function ptsHtml(pts) { return `<ul class="pts">${pts.map(p => { const m = p.match(/^([A-Z][^:`]{1,44}):\s(.+)$/s); return `<li>${m ? `<b>${F(m[1])}:</b> ${F(m[2])}` : F(p)}</li>`; }).join("")}</ul>`; }
function tableHtml(t) { const wide = t.h.length >= 3; return `<div class="tw${wide ? " stackable" : ""}"><table class="tb"><thead><tr>${t.h.map(x => `<th>${F(x)}</th>`).join("")}</tr></thead><tbody>${t.r.map(r => `<tr>${r.map((x, i) => `<td data-l="${H(t.h[i] || "")}">${F(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; }
function box(cls, label, inner) { return `<div class="bx ${cls}"><div class="lb">${label}</div>${inner}</div>`; }
function topicBody(t, mode) {
  let h = "";
  if (mode === "learn") { h += `<div class="teach">${arr(t.teach).map(p => `<p>${F(p)}</p>`).join("")}</div>`; if (t.pic) h += box("pic", "Picture it", `<p>${F(t.pic)}</p>`); }
  else if (!t.pts && !t.table && !t.steps && t.teach) h += `<p>${F(arr(t.teach)[0])}</p>`;
  if (mode === "notes" && t.pts) h += ptsHtml(t.pts);
  if (t.diagram) h += `<pre class="code dg">${H(t.diagram)}</pre>`;
  if (t.table) h += tableHtml(t.table);
  if (t.steps) h += `<ol class="stp">${t.steps.map(s => `<li>${F(s)}</li>`).join("")}</ol>`;
  if (t.code) h += `<pre class="code">${H(t.code)}</pre>`;
  if (t.ex) h += box("ex", mode === "learn" ? "Worked example" : "Example", arr(t.ex).map((x, i) => `<p${i === 0 && arr(t.ex).length > 1 ? ' class="exq"' : ""}>${F(x)}</p>`).join(""));
  if (t.memo) h += box("memo", "Memory hook", `<p>${F(t.memo)}</p>`);
  if (t.trap) h += box("trap", "Watch out", `<p>${F(t.trap)}</p>`);
  if (mode === "learn" && t.pts) h += box("rem", "Remember for the exam", ptsHtml(t.pts));
  if (t.note) h += `<p class="mnote">${F(t.note)}</p>`;
  return h;
}
function topicSpeech(t, mode) {
  const L = [plain(t.h) + "."];
  if (mode === "learn") { arr(t.teach).forEach(p => L.push(spoken(p))); if (t.pic) L.push(spoken(t.pic)); }
  else if (!t.pts && !t.table && !t.steps) L.push(spoken(arr(t.teach)[0]));
  if (mode === "notes" && t.pts) t.pts.forEach(p => L.push(spoken(p)));
  if (t.table) {
    const labelled = !t.table.h[0] || t.table.r.every(r => String(r[0]).length <= 46);
    if (labelled) t.table.r.forEach(r => L.push(spoken(r[0] + ": " + r.slice(1).filter(Boolean).map((x, i) => (t.table.h.length > 2 && t.table.h[i + 1] && !t.table.h[0] ? t.table.h[i + 1] + ", " : "") + x).join(". ") + ".")));
    else t.table.h.forEach((hd, i) => L.push(spoken(hd + ": " + t.table.r.map(r => r[i]).filter(Boolean).join(" ") )));
  }
  if (t.steps) t.steps.forEach((s, i) => L.push("Step " + (i + 1) + ". " + spoken(s)));
  if (t.ex && mode === "learn") arr(t.ex).forEach(x => L.push(spoken(x)));
  if (t.memo) L.push("Memory hook. " + spoken(t.memo));
  if (t.trap) L.push("Watch out. " + spoken(t.trap));
  if (mode === "learn" && t.pts) { L.push("Remember for the exam."); t.pts.forEach(p => L.push(spoken(p))); }
  return L.filter(x => x && x.trim()).join("\n");
}
function packToAtlas(p) {
  const weeks = p.weeks.map(w => {
    const mcq = w.mcq.map(([q, o, a, why]) => { const idx = shuffle(o.map((_, i) => i)); return { q, o: idx.map(i => o[i]), a: idx.indexOf(a), why, kind: "pack" }; });
    const theory = w.theory.map(([q, marks, pts, ex]) => { const m1 = marks >= 8 ? 2 : 1, m3 = ex ? 1 : 0, body = pts.slice(1); return { q, marks, from: "material", guide: pts, answer: { intro: [pts[0]], body, example: ex || "", end: "", marks: [m1, body.length ? Math.max(1, Math.floor((marks - m1 - m3) / body.length)) : 0, m3, 0] } }; });
    const terms = w.terms.map(([term, def]) => ({ term, def, week: w.n, how: "def" }));
    const cards = [...terms.map(t => ({ f: t.term, b: t.def, kind: "term" })), ...w.topics.filter(t => t.ask).map(t => ({ f: plain(t.ask[0]), b: plain(t.ask[1]), kind: "ask" }))].map((x, k) => ({ id: `w${w.n}c${k}`, ...x }));
    const points = w.topics.flatMap(t => (t.pts || []).map(x => ({ text: plain(x), type: "point", tier: TIERN[t.tier || "s"][0] })));
    return { n: w.n, title: w.title, subs: [], conf: 1, status: "matched", sections: [], pages: [], overview: [w.big], points, terms, lists: [], formulas: [], examples: [], summary: [], exercises: [], objectives: [], mcq, theory, cards, pack: true, big: w.big, cram: w.cram || [], topics: w.topics };
  });
  return { v: 1, built: Date.now(), pack: p.id, packV: p.v, exam: p.exam || null, course: { code: p.code, title: p.title }, weeks, coverage: { weeks: weeks.length, matched: weeks.length, weak: [], missing: [], unusedSections: [] }, docTitles: [], fileIds: [] };
}
const packs = () => window.WW_PACKS || [];
async function installPack(p) {
  const id = "pack-" + p.id; let c = course(id);
  if (!c) { c = { id, created: Date.now(), scope: [], files: [], exam: { date: "", style: "both" } }; S.courses.push(c); }
  Object.assign(c, { code: p.code, title: p.title, pack: p.id, weeksText: p.weeks.map(w => `Week ${w.n}: ${w.title}`).join("\n"), nWeeks: p.weeks.length, built: Date.now() });
  const A = packToAtlas(p); await DB.set("atlas:" + id, A); atlasCache.set(id, A); save(); return c;
}
function lessonHtml(c, w) {
  const n = w.topics.length; const ti = Math.max(0, Math.min(n - 1, R.ti != null ? R.ti : (wk(c.id, w.n).ti || 0))); R.ti = ti; const t = w.topics[ti]; const tr = TIERN[t.tier || "s"];
  return `<div class="row noprint"><button class="btn small ghost" data-listen id="lis">${I.play} Listen</button><span class="grow"></span><span class="tiny muted">Part ${ti + 1} of ${n}</span></div>
  <div class="prog" style="margin-top:10px">${w.topics.map((_, k) => `<i class="${k < ti ? "ok" : k === ti ? "cur" : ""}" data-ti="${k}"></i>`).join("")}</div>
  ${ti === 0 ? `<div class="card big-idea"><div class="kicker">The big idea</div><p>${F(w.big)}</p></div>` : ""}
  <article class="card lesson-t"><span class="tag ${tr[0]}">${tr[1]}</span><h3>${F(t.h)}</h3>${topicBody(t, "learn")}</article>
  ${t.ask ? `<div class="card ask"><div class="kicker">Check yourself</div><p class="askq">${F(t.ask[0])}</p><p class="tiny muted" id="askhint">Say the answer in your head (or out loud) first.</p><button class="btn small" id="rv">Show answer</button><div id="av" hidden><div class="bx rem"><div class="lb">Answer</div><p>${F(t.ask[1])}</p></div><div class="row"><button class="btn small" id="ok">I knew it</button><button class="btn small ghost" id="no">Not yet</button></div></div></div>` : ""}
  <div class="row" style="margin-top:14px">${ti > 0 ? `<button class="btn ghost" id="lp">Back</button>` : ""}<button class="btn sun" id="ln" style="flex:1" ${t.ask ? "disabled" : ""}>${ti + 1 < n ? "Next part" : "Finish lesson. Quiz me"}</button></div>`;
}
function weekNotesHtml(w, withTerms) {
  return `<div class="notes">${w.topics.map(t => { const tr = TIERN[t.tier || "s"]; return `<section class="nt"><h4>${F(t.h)} <span class="tag ${tr[0]}">${tr[1]}</span></h4>${topicBody(t, "notes")}</section>`; }).join("")}${withTerms && w.terms.length ? `<section class="nt"><h4>Key terms</h4><dl class="gloss small">${w.terms.map(t => `<dt>${H(t.term)}</dt><dd>${H(t.def)}</dd>`).join("")}</dl></section>` : ""}</div>`;
}
const weekNotesSpeech = w => [`Week ${w.n}. ${w.title}.`, spoken(w.big), ...w.topics.map(t => topicSpeech(t, "notes"))].join("\n");
function wirePackWeek(c, A, w, tab) {
  const p = wk(c.id, w.n);
  if (tab === "notes") { $("#lis").onclick = e => speak(weekNotesSpeech(w), e.currentTarget); return; }
  const n = w.topics.length, ti = R.ti, t = w.topics[ti]; p.ti = ti; save();
  const goT = k => { R.ti = k; stopSpeak(); render(); window.scrollTo(0, 0); };
  $("#lis").onclick = e => speak((ti === 0 ? spoken(w.big) + "\n" : "") + topicSpeech(t, "learn"), e.currentTarget);
  $$("[data-ti]").forEach(d => d.onclick = () => goT(+d.dataset.ti));
  const next = () => { if (ti + 1 < n) goT(ti + 1); else { p.read = true; p.ti = 0; touchStreak(); save(); R.ti = 0; R.tab = "quiz"; render(); window.scrollTo(0, 0); } };
  const ln = $("#ln"); ln.onclick = next; const lp = $("#lp"); if (lp) lp.onclick = () => goT(ti - 1);
  if (t.ask) {
    $("#rv").onclick = () => { $("#av").hidden = false; $("#rv").hidden = true; $("#askhint").hidden = true; ln.disabled = false; };
    $("#ok").onclick = next;
    $("#no").onclick = () => { $("#av").hidden = true; $("#rv").hidden = false; ln.disabled = true; window.scrollTo(0, 0); toast("Read it once more, then try the question again."); };
  }
}
function packExamTab(c, A) {
  const sc = scopeOf(c, A); const ws = A.weeks.filter(w => sc.includes(w.n)); R._ws = ws;
  const likely = ws.flatMap(w => w.theory.map(q => ({ ...q, week: w.n }))).sort((a, b) => b.marks - a.marks || a.week - b.week);
  const gl = ws.flatMap(w => w.terms).sort((a, b) => a.term.localeCompare(b.term));
  return `<div class="card noprint"><div class="kicker">Exam covers</div><p class="small muted">Tap weeks to include or leave out, for example if your lecturer gives an area of concentration.</p><div class="row wrapr" id="scope">${A.weeks.map(w => `<span class="chip ${sc.includes(w.n) ? "on" : ""}" data-sc="${w.n}">W${w.n}</span>`).join("")}</div><div class="row" style="margin-top:10px"><a href="#" id="all" class="small">All weeks</a></div></div>
  <div class="row noprint wrapr" style="margin:12px 0">${window.WW_SINGLE ? "" : `<button class="btn small" id="pdf">${I.down}Save as PDF</button>`}<button class="btn small ghost" data-listen id="lis">${I.play} Listen</button><button class="btn small ghost" id="oall">Open all weeks</button></div>
  ${A.exam ? `<div class="card"><div class="kicker">About the exam</div><ul class="pts small">${A.exam.lines.map(x => `<li>${F(x)}</li>`).join("")}</ul></div>` : ""}
  <div class="card"><div class="kicker">Cram sheet</div><h3>If you only have an hour, read this</h3>${ws.map(w => `<p class="cw"><b>Week ${w.n}: ${H(w.title)}</b></p><ul class="pts small">${w.cram.map(x => `<li>${F(x)}</li>`).join("")}</ul>`).join("")}</div>
  <div class="card"><div class="kicker">Full exam notes</div><h3>Week by week</h3><p class="small muted">Everything examinable, in order. Tap a week to open it.</p>${ws.map(w => `<details class="wkn" data-wn="${w.n}"><summary><b>Week ${w.n}</b> ${H(w.title)}</summary><p class="bigline">${F(w.big)}</p>${weekNotesHtml(w, true)}</details>`).join("")}</div>
  <div class="card"><div class="kicker">Likely theory questions</div><h3>Practise writing these</h3>${likely.map(q => `<details style="margin-top:10px"><summary class="small"><b>${H(q.q)}</b> <span class="src">W${q.week} · ${q.marks} marks</span></summary>${answerHtml(q.answer, q)}</details>`).join("")}</div>
  <div class="card"><div class="kicker">Glossary</div><dl class="gloss small">${gl.map(g => `<dt>${H(g.term)} <span class="src">W${g.week}</span></dt><dd>${H(g.def)}</dd>`).join("")}</dl></div>`;
}
function wirePackExam(c, A) {
  $$("[data-sc]").forEach(ch => ch.onclick = () => { const n = +ch.dataset.sc; let sc = scopeOf(c, A); sc = sc.includes(n) ? sc.filter(x => x !== n) : [...sc, n].sort((a, b) => a - b); if (!sc.length) return toast("Keep at least one week."); c.scope = sc.length === A.weeks.length ? [] : sc; save(); const y = scrollY; render().then(() => scrollTo(0, y)); });
  $("#all").onclick = e => { e.preventDefault(); c.scope = []; save(); render(); };
  $("#oall").onclick = e => { const open = e.currentTarget.dataset.o !== "1"; $$("details.wkn").forEach(d => d.open = open); e.currentTarget.dataset.o = open ? "1" : "0"; e.currentTarget.textContent = open ? "Close all weeks" : "Open all weeks"; };
  $("#lis").onclick = e => { const openW = $$("details.wkn").filter(d => d.open).map(d => +d.dataset.wn); const ws = openW.length ? R._ws.filter(w => openW.includes(w.n)) : null; speak(ws ? ws.map(weekNotesSpeech).join("\n") : ["Cram sheet.", ...R._ws.flatMap(w => [`Week ${w.n}. ${w.title}.`, ...w.cram.map(spoken)])].join("\n"), e.currentTarget); if (!ws) toast("Reading the cram sheet. Open a week first to hear its full notes."); };
  const pb = $("#pdf"); if (pb) pb.onclick = () => exportPackPdf(c, A, R._ws).catch(e => toast("PDF failed: " + e.message));
}
async function exportPackPdf(c, A, ws) {
  toast("Making your PDF…");
  if (!window.PDFLib) await loadScript(BASE() + "lib/pdf-lib.min.js");
  const { PDFDocument, StandardFonts, rgb } = PDFLib; const doc = await PDFDocument.create();
  const F0 = await doc.embedFont(StandardFonts.Helvetica), FB = await doc.embedFont(StandardFonts.HelveticaBold), FS = await doc.embedFont(StandardFonts.TimesRomanBold), FI = await doc.embedFont(StandardFonts.HelveticaOblique), FC = await doc.embedFont(StandardFonts.Courier);
  const W = 595, Hh = 842, M = 46; let pg, y; const INK = rgb(.1, .12, .18), SUN = rgb(.72, .45, .08), GREY = rgb(.42, .42, .42);
  const newPage = () => { pg = doc.addPage([W, Hh]); y = Hh - M; pg.drawText(winAnsi(`${c.code} · Weekwise exam notes`), { x: M, y: 24, size: 8, font: F0, color: GREY }); pg.drawText(String(doc.getPageCount()), { x: W - M - 8, y: 24, size: 8, font: F0, color: GREY }); };
  const text = (t, o = {}) => { const { size = 10, font = F0, indent = 0, color = INK, gap = 3, bullet = "" } = o; t = winAnsi(plain(t)); const x0 = M + indent + (bullet ? 10 : 0); const maxW = W - M - x0; let line = "", first = true;
    const flush = () => { if (y < M + size + 4) newPage(); if (first && bullet) pg.drawText(winAnsi(bullet), { x: M + indent, y: y - size, size, font: F0, color }); pg.drawText(line, { x: x0, y: y - size, size, font, color }); y -= size * 1.36; first = false; };
    for (const w of t.split(/\s+/)) { const tt = line ? line + " " + w : w; if (font.widthOfTextAtSize(tt, size) > maxW && line) { flush(); line = w; } else line = tt; } if (line) flush(); y -= gap; };
  const mono = (code, indent = 8) => { String(code).split("\n").forEach(l => { let s = winAnsi(l.replace(/\t/g, "    ")); const max = Math.floor((W - 2 * M - indent) / (7.6 * 0.6)); while (s.length > max) { if (y < M + 12) newPage(); pg.drawText(s.slice(0, max), { x: M + indent, y: y - 7.6, size: 7.6, font: FC, color: INK }); y -= 10; s = "    " + s.slice(max); } if (y < M + 12) newPage(); pg.drawText(s, { x: M + indent, y: y - 7.6, size: 7.6, font: FC, color: INK }); y -= 10; }); y -= 4; };
  const need = h => { if (y < M + h) newPage(); };
  newPage(); text(c.code || "", { size: 26, font: FS, gap: 0 }); text(c.title || "", { size: 14, font: FB }); text(`Exam notes for week${ws.length > 1 ? "s" : ""} ${ws.map(w => w.n).join(", ")} · made ${new Date().toLocaleDateString()}`, { size: 9, color: GREY, gap: 10 });
  if (A.exam) { text("ABOUT THE EXAM", { size: 11, font: FB, color: SUN }); A.exam.lines.forEach(l => text(l, { bullet: "•", indent: 4, size: 9.5 })); y -= 6; }
  text("CRAM SHEET", { size: 11, font: FB, color: SUN });
  ws.forEach(w => { need(40); text(`Week ${w.n}: ${w.title}`, { font: FB, size: 9.5, gap: 1 }); w.cram.forEach(l => text(l, { bullet: "•", indent: 4, size: 9.5, gap: 1.5 })); y -= 3; });
  ws.forEach(w => {
    newPage(); text(`WEEK ${w.n}`, { size: 9, font: FB, color: SUN, gap: 0 }); text(w.title, { size: 18, font: FS, gap: 4 }); text(w.big, { font: FI, size: 10, color: GREY, gap: 8 });
    w.topics.forEach(t => {
      need(60); text(t.h + (t.tier === "m" ? "   [MUST KNOW]" : ""), { font: FB, size: 11.5, gap: 3 });
      if (!t.pts && !t.table && !t.steps && t.teach) text(arr(t.teach)[0], { indent: 4 });
      (t.pts || []).forEach(p2 => text(p2, { bullet: "•", indent: 4, gap: 2 }));
      if (t.diagram) mono(t.diagram);
      if (t.table) { text(t.table.h.filter(Boolean).join("  |  "), { size: 8, font: FB, color: GREY, indent: 4, gap: 1 }); t.table.r.forEach(r => { need(24); text(r[0], { font: FB, size: 9.5, indent: 4, bullet: "–", gap: 0.5 }); r.slice(1).forEach((x, i) => x && text((t.table.h.length > 2 && t.table.h[i + 1] ? t.table.h[i + 1] + ": " : "") + x, { size: 9.5, indent: 18, gap: 1 })); }); y -= 3; }
      (t.steps || []).forEach((s, i) => text(s, { bullet: (i + 1) + ".", indent: 4, gap: 2 }));
      if (t.code) mono(t.code);
      if (t.ex) { text("Example", { font: FB, size: 8.5, color: SUN, indent: 4, gap: 1 }); arr(t.ex).forEach(x => text(x, { size: 9.5, indent: 10, gap: 1.5 })); y -= 2; }
      if (t.memo) text("Memory hook: " + t.memo, { font: FI, size: 9.5, indent: 4 });
      if (t.trap) text("Watch out: " + t.trap, { font: FI, size: 9.5, indent: 4 });
      y -= 6;
    });
    need(50); text("Key terms", { font: FB, size: 11.5, gap: 3 }); w.terms.forEach(g => text(`${g.term}: ${g.def}`, { size: 9.5, indent: 4, bullet: "•", gap: 1.5 }));
    need(60); y -= 6; text("Likely questions", { font: FB, size: 11.5, gap: 3 });
    w.theory.forEach((q, i) => { need(50); text(`${i + 1}. ${q.q}  [${q.marks} marks]`, { font: FB, size: 9.5, indent: 4, gap: 1.5 }); [...q.answer.intro, ...q.answer.body].forEach(x => text(x, { size: 9, indent: 14, bullet: "•", gap: 1 })); if (q.answer.example) text("e.g. " + q.answer.example, { size: 9, indent: 14, font: FI, gap: 1 }); y -= 4; });
  });
  const bytes = await doc.save(); await shareFile(bytes, `${(c.code || "course").replace(/[^A-Za-z0-9]+/g, "-")}-exam-notes.pdf`, "application/pdf");
}
async function loadPackFile(file) {
  const p = JSON.parse(await file.text()); if (!p || !p.id || !p.code || !Array.isArray(p.weeks) || !p.weeks.length || !p.weeks[0].topics) throw new Error("This isn't a Weekwise course pack.");
  await DB.set("pack:" + p.id, p); window.WW_PACKS = packs().filter(x => x.id !== p.id).concat([p]); const c = await installPack(p); toast(`${p.code} pack added.`); stack.length = 0; go({ v: "course", id: c.id, tab: "weeks", fresh: true }, false);
}


/* ---------- class (department, level, semester) and the course catalog ---------- */
const LEVELS = [["100", "100 level"], ["200", "200 level"], ["300", "300 level"], ["400", "400 level"], ["500", "500 level"], ["PG", "Postgraduate"]];
const SEMS = [["1", "First semester"], ["2", "Second semester"]];
const lvlName = v => (LEVELS.find(x => x[0] === v) || [, v ? v + " level" : ""])[1];
const semName = v => (SEMS.find(x => x[0] === v) || [, ""])[1];
const classLine = () => [S.dept, lvlName(S.level), semName(S.sem)].filter(Boolean).join(" · ");
const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const CAT_URL = () => window.WW_SOURCE || (BASE() + "catalog.json");
let CAT = null;
async function getCatalog(online) {
  if (online !== false && !window.WW_SINGLE) { try { const r = await fetch(CAT_URL(), { cache: "no-store" }); if (r.ok) { CAT = await r.json(); await DB.set("catalog", CAT); S.catChecked = Date.now(); save(); return CAT; } } catch (e) { } }
  if (!CAT) CAT = (await DB.get("catalog").catch(() => null)) || window.WW_CATALOG || { groups: [] };
  return CAT;
}
const depts = () => [...new Set(((CAT && CAT.groups) || []).map(g => g.dept))].sort();
const inAnyGroup = id => ((CAT && CAT.groups) || []).some(g => (g.packs || []).some(e => e.id === id));
const showHere = c => !c.pack || !S.dept || !inAnyGroup(c.pack) || !!(myGroup() && (myGroup().packs || []).some(e => e.id === c.pack));
const myGroup = () => ((CAT && CAT.groups) || []).find(g => norm(g.dept) === norm(S.dept) && String(g.level) === String(S.level) && String(g.sem) === String(S.sem));
async function fetchPack(entry) {
  const local = packs().find(p => p.id === entry.id && p.v >= entry.v); if (local) return local;
  const base = CAT_URL().slice(0, CAT_URL().lastIndexOf("/") + 1);
  const r = await fetch(base + entry.file, { cache: "no-store" }); if (!r.ok) throw new Error("download failed");
  const p = await r.json(); await DB.set("pack:" + p.id, p); window.WW_PACKS = packs().filter(x => x.id !== p.id).concat([p]); return p;
}
/* bring this phone's courses in line with the catalog for the student's class */
async function syncClass(quiet) {
  if (!S.dept || !S.level || !S.sem) return 0;
  await getCatalog(); const g = myGroup(); if (!g) return 0;
  let added = 0, updated = 0;
  for (const e of g.packs || []) {
    if ((S.hiddenPacks || []).includes(e.id)) continue;
    const c = course("pack-" + e.id); const A = c ? await atlasOf(c.id) : null;
    if (c && A && (A.packV || 0) >= e.v) continue;
    try { const p = await fetchPack(e); await installPack(p); c ? updated++ : added++; } catch (err) { console.error(err); }
  }
  if (!quiet || added || updated) toast(added || updated ? [added ? `${added} new course${added > 1 ? "s" : ""} added` : "", updated ? `${updated} course${updated > 1 ? "s" : ""} updated` : ""].filter(Boolean).join(", ") + "." : "You're up to date.");
  return added + updated;
}
function classForm(prefix) {
  const ds = depts(); const known = !S.dept || ds.some(d => norm(d) === norm(S.dept));
  return `<label class="f" for="${prefix}d">Department</label><select class="in" id="${prefix}d"><option value="">Choose…</option>${ds.map(d => `<option ${norm(d) === norm(S.dept) ? "selected" : ""}>${H(d)}</option>`).join("")}<option value="__other" ${!known ? "selected" : ""}>My department isn't listed</option></select>
  <input class="in" id="${prefix}o" placeholder="Type your department" style="margin-top:8px" value="${known ? "" : H(S.dept)}" ${known ? "hidden" : ""}>
  <label class="f" for="${prefix}l">Level</label><select class="in" id="${prefix}l"><option value="">Choose…</option>${LEVELS.map(([v, n]) => `<option value="${v}" ${String(S.level).startsWith(v) ? "selected" : ""}>${n}</option>`).join("")}</select>
  <label class="f">Semester</label><div class="row wrapr">${SEMS.map(([v, n]) => `<span class="chip ${S.sem === v ? "on" : ""}" data-sem="${v}">${n}</span>`).join("")}</div>`;
}
function wireClassForm(prefix, root) {
  const sel = $("#" + prefix + "d", root), oth = $("#" + prefix + "o", root); let sem = S.sem;
  sel.onchange = () => { oth.hidden = sel.value !== "__other"; if (!oth.hidden) oth.focus(); };
  $$("[data-sem]", root).forEach(ch => ch.onclick = () => { sem = ch.dataset.sem; $$("[data-sem]", root).forEach(x => x.classList.toggle("on", x === ch)); });
  return () => ({ dept: sel.value === "__other" ? oth.value.trim() : sel.value, level: $("#" + prefix + "l", root).value, sem });
}
function nextLine() {
  const L = window.WW_LINES || LINES; if (!S.lineBag || !S.lineBag.length || S.lineBag.some(i => i >= L.length)) { S.lineBag = shuffle(L.map((_, i) => i)); }
  const i = S.lineBag.pop(); save(); return L[i];
}

/* ---------- boot ---------- */
async function boot() {
  try { S = Object.assign(fresh(), await DB.get("state") || {}); } catch (e) { S = fresh(); console.error(e); }
  try { for (const k of await DB.keys()) if (String(k).startsWith("pack:")) { const p = await DB.get(k); if (p && p.id && !packs().some(x => x.id === p.id && x.v >= p.v)) window.WW_PACKS = packs().filter(x => x.id !== p.id).concat([p]); }
    for (const c of S.courses) if (c.pack) { const p = packs().find(x => x.id === c.pack); const A = await atlasOf(c.id); if (p && (!A || A.packV !== p.v)) await installPack(p); } } catch (e) { console.error(e); }
  if (S.level && /level/i.test(S.level)) S.level = S.level.replace(/\D.*$/, "") || (/post/i.test(S.level) ? "PG" : "");
  if (S.onboarded && !S.dept && !S.sem) { S.onboarded = false; R.ob = 4; } /* ask existing users for their class once */
  await getCatalog(false).catch(() => { });
  applyTheme(); render();
  if (S.onboarded) syncClass(true).then(n => { if (n && (R.v === "home" || R.v === "course")) render(); }).catch(() => { });
  history.pushState(null, "");
  if (NATIVE() && WWCap.App) WWCap.App.addListener("backButton", () => { if (!back()) WWCap.App.exitApp(); });
  if (!NATIVE() && "serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => { });
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
}
window.WWApp = { get S() { return S; }, go, render, buildCourse, readFile, DB };
boot();
})();
