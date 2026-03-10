/**
 * Serviço de Push Notifications via Firebase Cloud Messaging.
 *
 * Gerencia o registro de tokens FCM, envio ao backend,
 * e recebimento de mensagens em foreground.
 *
 * ⚠️ Substitua as credenciais abaixo pelas do seu projeto Firebase.
 */

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import api from './api';

// ⚠️ Substitua com as credenciais do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCrKpGzuPhgybFIx7vRcml5yWDTOSNbESE",
  authDomain: "velo-c34f2.firebaseapp.com",
  projectId: "velo-c34f2",
  storageBucket: "velo-c34f2.firebasestorage.app",
  messagingSenderId: "558892217675",
  appId: "1:558892217675:web:41d93ff019bb7abb0da4ce",
};

// ⚠️ Substitua com a chave VAPID do seu projeto Firebase
// (Firebase Console > Cloud Messaging > Web Push certificates)
const VAPID_KEY = "BP4OBJ21lzYyIa_jPn2BpmWB-SIWy_3W6vEPj2n49CicwDWG0GAK0_BzgKT_O8GiRA7LbNJMJuLybKQCtpDJ8aY";

let firebaseApp = null;
let messaging = null;

function getFirebaseMessaging() {
  if (messaging) return messaging;
  try {
    firebaseApp = initializeApp(firebaseConfig);
    messaging = getMessaging(firebaseApp);
    return messaging;
  } catch (error) {
    console.error('[Push] Falha ao inicializar Firebase:', error);
    return null;
  }
}

/**
 * Solicita permissão de notificação e registra o token FCM no backend.
 * @returns {string|null} O token FCM ou null se falhou.
 */
export async function requestPushPermission() {
  try {
    // 1. Verificar se o browser suporta
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('[Push] Browser não suporta push notifications');
      return null;
    }

    // 2. Pedir permissão
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('[Push] Permissão negada pelo usuário');
      return null;
    }

    // 3. Registrar o Service Worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.info('[Push] Service Worker registrado');

    // 4. Obter token FCM
    const msg = getFirebaseMessaging();
    if (!msg) return null;

    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn('[Push] Não foi possível obter token FCM');
      return null;
    }

    console.info('[Push] Token FCM obtido:', token.substring(0, 20) + '...');

    // 5. Enviar token ao backend
    await api.post('/push/subscribe', {
      token,
      device_info: navigator.userAgent.substring(0, 200),
    });

    // Salvar no localStorage para referência
    localStorage.setItem('velo_fcm_token', token);

    return token;
  } catch (error) {
    console.error('[Push] Erro ao registrar push:', error);
    return null;
  }
}

/**
 * Remove o token FCM e cancela a inscrição no backend.
 */
export async function unsubscribePush() {
  try {
    const token = localStorage.getItem('velo_fcm_token');
    if (!token) return;

    // Remover do backend
    await api.delete('/push/unsubscribe', { data: { token } });

    // Remover do Firebase
    const msg = getFirebaseMessaging();
    if (msg) {
      await deleteToken(msg);
    }

    localStorage.removeItem('velo_fcm_token');
    console.info('[Push] Unsubscribed com sucesso');
  } catch (error) {
    console.error('[Push] Erro ao cancelar push:', error);
  }
}

/**
 * Verifica se o push está ativo (tem token salvo).
 */
export function isPushEnabled() {
  return !!localStorage.getItem('velo_fcm_token');
}

/**
 * Escuta mensagens em foreground.
 * @param {Function} callback - Função chamada com { title, body, data }
 * @returns {Function} Unsubscribe function
 */
export function onForegroundMessage(callback) {
  const msg = getFirebaseMessaging();
  if (!msg) return () => {};

  return onMessage(msg, (payload) => {
    console.info('[Push] Mensagem foreground recebida:', payload);
    callback({
      title: payload.notification?.title || '🔔 Notificação',
      body: payload.notification?.body || '',
      data: payload.data || {},
    });
  });
}
