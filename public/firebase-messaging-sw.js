// Firebase Messaging Service Worker
// Este arquivo DEVE estar na raiz do site para que o FCM consiga interceptar mensagens em background.
// Com base: /CaixinhaCasal/, o arquivo fica acessível em /CaixinhaCasal/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyB8x4jO56mL_AF2qnlmatTL7Y2cdj24028',
  authDomain: 'caixinha-casal.firebaseapp.com',
  projectId: 'caixinha-casal',
  storageBucket: 'caixinha-casal.firebasestorage.app',
  messagingSenderId: '1083587518314',
  appId: '1:1083587518314:web:8344058a7b3dc6fd668f13',
})

const messaging = firebase.messaging()

// Exibe notificação quando o app está em background
messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification ?? {}
  self.registration.showNotification(title ?? 'Caixinha Casal', {
    body: body ?? '',
    icon: icon ?? '/CaixinhaCasal/icons/pwa-192x192.png',
    badge: '/CaixinhaCasal/icons/pwa-192x192.png',
  })
})
