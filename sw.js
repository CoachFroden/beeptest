const CACHE_NAME = "beeptest-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./beepTest.css",
  "./beepTest.js",
  "./manifest.json",
  "./beep.wav",
  "./startbeeptest.mp3",
  "./nedtelling.mp3",
  "./startbeeps.mp3"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
