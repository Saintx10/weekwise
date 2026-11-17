/* Weekwise offline cache — generated */
const V = "ww-757d162423";
const FILES = ["./","app.js","core.js","fonts/fraunces-latin-600-normal.woff2","fonts/fraunces-latin-700-normal.woff2","fonts/plus-jakarta-sans-latin-400-normal.woff2","fonts/plus-jakarta-sans-latin-500-normal.woff2","fonts/plus-jakarta-sans-latin-600-normal.woff2","fonts/plus-jakarta-sans-latin-700-normal.woff2","icons/favicon.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","index.html","lib/fflate.js","lib/ocr/eng-data.js","lib/ocr/tesseract-core-lstm.wasm.js","lib/ocr/tesseract-core-simd-lstm.wasm.js","lib/ocr/tesseract.min.js","lib/ocr/worker.min.js","lib/pdf-lib.min.js","lib/pdf.min.js","lib/pdf.worker.min.js","lines.js","manifest.webmanifest","style.css"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url); if (e.request.method !== "GET" || u.origin !== location.origin || /\/(catalog\.json|packs\/)/.test(u.pathname)) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return res; }).catch(() => caches.match("./"))));
});
