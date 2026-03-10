/* eslint-disable no-undef */
/*
 * Firebase Messaging Service Worker
 *
 * Este service worker roda em background e é responsável por
 * receber e exibir push notifications quando o app está fechado.
 *
 * IMPORTANTE: Substitua as credenciais abaixo pelas do seu projeto Firebase.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ⚠️ Substitua com as credenciais do seu projeto Firebase
firebase.initializeApp({
  apiKey: "AIzaSyCrKpGzuPhgybFIx7vRcml5yWDTOSNbESE",
  authDomain: "velo-c34f2.firebaseapp.com",
  projectId: "velo-c34f2",
  storageBucket: "velo-c34f2.firebasestorage.app",
  messagingSenderId: "558892217675",
  appId: "1:558892217675:web:41d93ff019bb7abb0da4ce",
});

const messaging = firebase.messaging();

// Handler de notificações em background
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Push recebido em background:', payload);

  const notificationTitle = payload.notification?.title || '🔔 Velo — Lembrete';
  const notificationOptions = {
    body: payload.notification?.body || 'Você tem um agendamento próximo!',
    icon: '/logo.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Fechar' },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Ao clicar na notificação, abrir o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já tem uma aba aberta, focar nela
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Senão, abrir nova aba
      return clients.openWindow('/');
    })
  );
});
