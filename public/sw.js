// Service Worker for Offline Mode - MCD HRMS
const CACHE_NAME = 'mcd-hrms-v1';
const OFFLINE_CACHE = 'mcd-hrms-offline-v1';
const ATTENDANCE_QUEUE = 'mcd-attendance-queue';

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin && !url.origin.includes('render.com')) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(OFFLINE_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // If network fails, try cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log('[SW] Serving from cache:', request.url);
            return cachedResponse;
          }

          // If it's an attendance request, queue it
          if (url.pathname === '/api/attendance/mark') {
            console.log('[SW] Network unavailable, queuing attendance');
            await queueAttendanceRequest(request);
            return new Response(
              JSON.stringify({
                success: true,
                offline: true,
                message: 'Attendance queued for sync when online',
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 202,
              }
            );
          }

          // Return offline response
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              error: 'Network unavailable. Please try again when online.',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 503,
            }
          );
        })
    );
    return;
  }

  // For non-API requests, try network first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return caches.match('/index.html');
        });
      })
  );
});

// Background sync for attendance
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendance());
  }
});

// Queue attendance request in IndexedDB
async function queueAttendanceRequest(request) {
  try {
    const body = await request.clone().json();
    const db = await openDB();
    const tx = db.transaction(ATTENDANCE_QUEUE, 'readwrite');
    const store = tx.objectStore(ATTENDANCE_QUEUE);
    
    await store.add({
      url: request.url,
      method: request.method,
      body: body,
      timestamp: Date.now(),
    });

    // Register background sync
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-attendance');
    }
  } catch (error) {
    console.error('[SW] Error queuing attendance:', error);
  }
}

// Sync queued attendance when online
async function syncAttendance() {
  try {
    const db = await openDB();
    const tx = db.transaction(ATTENDANCE_QUEUE, 'readonly');
    const store = tx.objectStore(ATTENDANCE_QUEUE);
    const requests = await store.getAll();

    console.log('[SW] Syncing', requests.length, 'queued attendance records');

    for (const req of requests) {
      try {
        const response = await fetch(req.url, {
          method: req.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
        });

        if (response.ok) {
          // Remove from queue on success
          const deleteTx = db.transaction(ATTENDANCE_QUEUE, 'readwrite');
          await deleteTx.objectStore(ATTENDANCE_QUEUE).delete(req.timestamp);
          console.log('[SW] Synced attendance:', req.timestamp);
        }
      } catch (error) {
        console.error('[SW] Failed to sync attendance:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mcd-hrms-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(ATTENDANCE_QUEUE)) {
        db.createObjectStore(ATTENDANCE_QUEUE, { keyPath: 'timestamp' });
      }
    };
  });
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
