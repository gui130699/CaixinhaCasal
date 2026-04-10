import { getToken } from 'firebase/messaging'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { messagingPromise, db } from '@/lib/firebase'

// Chave VAPID gerada no Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

/**
 * Solicita permissão de notificação, obtém token FCM e salva no Firestore.
 * Deve ser chamado após o usuário estar autenticado.
 */
export async function registerFCMToken(userId: string, familyId: string): Promise<void> {
  try {
    if (!VAPID_KEY) return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const messaging = await messagingPromise
    if (!messaging) return

    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    if (!token) return

    // Salva token no Firestore — sobrescreve o doc do userId (um token por dispositivo/browser)
    await setDoc(doc(db, 'fcm_tokens', `${userId}_${btoa(token).slice(0, 16)}`), {
      user_id: userId,
      family_id: familyId,
      token,
      updated_at: serverTimestamp(),
      user_agent: navigator.userAgent.slice(0, 200),
    })
  } catch {
    // Falha silenciosa — não crítico para o funcionamento do app
  }
}
