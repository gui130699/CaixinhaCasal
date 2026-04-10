import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Installment } from '@/types'

const STORAGE_KEY = 'notified_installments'
const MS_PER_DAY = 86_400_000

/** Retorna { installmentId: lastNotifiedTimestamp } */
function getNotified(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveNotified(map: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function wasNotifiedToday(id: string): boolean {
  const map = getNotified()
  const last = map[id]
  if (!last) return false
  return Date.now() - last < MS_PER_DAY
}

function markNotified(id: string) {
  const map = getNotified()
  map[id] = Date.now()
  saveNotified(map)
}

const ICON = '/CaixinhaCasal/icons/pwa-192x192.png'

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

/** Dispara uma notificação via Service Worker (iOS PWA) ou diretamente */
async function showNotification(title: string, body: string, tag?: string) {
  const opts: NotificationOptions = { body, icon: ICON, badge: ICON, tag }
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(title, opts)
  } else {
    new Notification(title, opts)
  }
}

async function sendNotification(installment: Installment) {
  const goalName = installment.goal?.name ?? 'Meta'
  const due = new Date(installment.due_date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - due.getTime()) / MS_PER_DAY)

  const body = diffDays === 0
    ? `Parcela de ${goalName} vence hoje!`
    : `Parcela de ${goalName} está vencida há ${diffDays} dia${diffDays > 1 ? 's' : ''}.`

  await showNotification('Caixinha Casal 💰', body, installment.id)
  markNotified(installment.id)
}


export async function checkAndNotifyOverdueInstallments(
  familyId: string,
  userId: string
): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Busca parcelas vencidas ou que vencem hoje do usuário
  const q = query(
    collection(db, 'families', familyId, 'installments'),
    where('user_id', '==', userId),
    where('due_date', '<=', todayStr),
    where('status', 'in', ['pending', 'overdue', 'partial'])
  )

  const snap = await getDocs(q)
  if (snap.empty) return

  // Enrich com goal
  const installments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Installment))

  // Carrega goals para ter o nome
  const goalIds = [...new Set(installments.map(i => i.goal_id))]
  const goalsMap: Record<string, { name: string }> = {}
  await Promise.all(
    goalIds.map(async gid => {
      try {
        const { doc: docRef, getDoc } = await import('firebase/firestore')
        const gs = await getDoc(docRef(db, 'families', familyId, 'goals', gid))
        if (gs.exists()) goalsMap[gid] = gs.data() as { name: string }
      } catch { /* ignora */ }
    })
  )

  for (const inst of installments) {
    if (wasNotifiedToday(inst.id)) continue
    const enriched: Installment = {
      ...inst,
      goal: goalsMap[inst.goal_id] ? { name: goalsMap[inst.goal_id].name } as never : undefined,
    }
    sendNotification(enriched)
    // Pequeno delay entre notificações para não sobrecarregar
    await new Promise(r => setTimeout(r, 300))
  }
}
