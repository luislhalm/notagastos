const CACHE_NAME = 'notagastos-v1';

// Recursos estáticos a precargar en la instalación
const PRECACHE = [
  '/notagastos/',
  '/notagastos/index.html',
  '/notagastos/manifest.json',
  'https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.10.0/lib/msal-browser.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js'
];

// Dominios que NUNCA se interceptan — siempre van a la red
const BYPASS = [
  'graph.microsoft.com',
  'login.microsoftonline.com',
  'login.microsoft.com',
  'aadcdn.msftauth.net',
  'aadcdn.msauthimages.net'
];

// ---- INSTALL: precachear recursos estáticos ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ---- ACTIVATE: limpiar caches antiguas ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- FETCH: network-first para API, cache-first para estáticos ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Dejar pasar sin tocar: Graph API, login Microsoft y peticiones no-GET
  if (BYPASS.some(d => url.hostname.includes(d))) return;
  if (event.request.method !== 'GET') return;

  // Para el resto: intentar red primero, caer en caché si falla (offline)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Solo cachear respuestas válidas de recursos estáticos conocidos
        if (response.ok && PRECACHE.includes(event.request.url)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
