const CACHE_NAME = 'merca-plus-v1'

// Recursos estáticos a cachear en la instalación
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Limpia caches viejos al activar nueva versión
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Solo interceptar peticiones del mismo origen
  if (url.origin !== location.origin) return

  // Estrategia: Network first para rutas de la app, Cache first para estáticos
  const isStatic =
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/_next/static/')

  if (isStatic) {
    // Cache first: sirve desde caché, actualiza en segundo plano
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            return response
          }),
      ),
    )
  } else {
    // Network first: intenta red, cae a caché si no hay conexión
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match(request)),
    )
  }
})

// Soporte para notificaciones push
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Merca+', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: data,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const focused = windowClients.find((c) => c.focused)
      if (focused) return focused.focus()
      if (windowClients.length) return windowClients[0].focus()
      return clients.openWindow('/dashboard')
    }),
  )
})
