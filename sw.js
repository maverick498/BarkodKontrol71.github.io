// ==========================================
// SERVICE WORKER - Depo Kontrol PWA
// ==========================================

const CACHE_NAME = 'depo-kontrol-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// ==========================================
// KURULUM (INSTALL)
// ==========================================
self.addEventListener('install', (event) => {
  console.log('[SW] Kurulum yapılıyor...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Önbellek açıldı');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Tüm kaynaklar önbelleğe alındı');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Önbellek hatası:', error);
      })
  );
});

// ==========================================
// AKTİVASYON (ACTIVATE)
// ==========================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Aktivasyon yapılıyor...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eski önbellek siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service Worker aktif');
      return self.clients.claim();
    })
  );
});

// ==========================================
// FETCH (Network First, Cache Fallback)
// ==========================================
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı network yanıtı - önbelleğe al
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Network hatası - önbellekten sun
        return caches.match(event.request).then((response) => {
          if (response) {
            console.log('[SW] Önbellekten sunuluyor:', event.request.url);
            return response;
          }
          
          // Önbellekte de yoksa
          return new Response('Çevrimdışı - İçerik bulunamadı', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain; charset=utf-8'
            })
          });
        });
      })
  );
});

// ==========================================
// MESAJLAŞMA (İsteğe bağlı)
// ==========================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_CLEAR') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// ==========================================
// PUSH BİLDİRİMLERİ (Gelecek özellik)
// ==========================================
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Yeni bildirim',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Depo Kontrol', options)
  );
});

// ==========================================
// BİLDİRİM TIKLAMA
// ==========================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Bildirim tıklandı');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('./')
  );
});

console.log('[SW] Service Worker yüklendi');
