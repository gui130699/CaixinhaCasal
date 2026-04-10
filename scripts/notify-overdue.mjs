/**
 * Script: notify-overdue.mjs
 * Rodado via GitHub Actions todo dia às 08:00 BRT.
 * Busca parcelas vencidas no Firestore e envia push via FCM para cada usuário afetado.
 *
 * Requer env vars:
 *   FIREBASE_SERVICE_ACCOUNT  — JSON da service account do Firebase (string)
 *   FIREBASE_PROJECT_ID       — ID do projeto Firebase
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

// ── Init ──────────────────────────────────────────────────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
})

const db = getFirestore()
const messaging = getMessaging()

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = new Date()
today.setHours(0, 0, 0, 0)
const todayStr = today.toISOString().split('T')[0]

function daysOverdue(dueDateStr) {
  const due = new Date(dueDateStr + 'T00:00:00')
  return Math.round((today - due) / 86_400_000)
}

// ── Coleta parcelas vencidas agrupadas por usuário ────────────────────────────
async function getOverdueByUser() {
  // Busca todas as famílias
  const familiesSnap = await db.collection('families').get()
  const byUser = {} // { userId: { familyId, installments: [] } }

  await Promise.all(
    familiesSnap.docs.map(async familyDoc => {
      const familyId = familyDoc.id
      const instSnap = await db
        .collection('families').doc(familyId)
        .collection('installments')
        .where('due_date', '<=', todayStr)
        .where('status', 'in', ['pending', 'overdue', 'partial'])
        .get()

      if (instSnap.empty) return

      // Carrega names das metas (cache local por família)
      const goalCache = {}
      await Promise.all(
        [...new Set(instSnap.docs.map(d => d.data().goal_id))].map(async gid => {
          const gs = await db.collection('families').doc(familyId).collection('goals').doc(gid).get()
          goalCache[gid] = gs.exists ? gs.data().name : 'Meta'
        })
      )

      for (const d of instSnap.docs) {
        const inst = { id: d.id, ...d.data(), goalName: goalCache[d.data().goal_id] }
        const uid = inst.user_id
        if (!byUser[uid]) byUser[uid] = { familyId, installments: [] }
        byUser[uid].installments.push(inst)
      }
    })
  )

  return byUser
}

// ── Busca tokens FCM dos usuários ─────────────────────────────────────────────
async function getTokensForUsers(userIds) {
  const tokensMap = {} // { userId: string[] }
  await Promise.all(
    userIds.map(async uid => {
      const snap = await db.collection('fcm_tokens').where('user_id', '==', uid).get()
      tokensMap[uid] = snap.docs.map(d => d.data().token).filter(Boolean)
    })
  )
  return tokensMap
}

// ── Envia notificação via FCM ─────────────────────────────────────────────────
async function sendPush(token, title, body) {
  try {
    await messaging.send({
      token,
      notification: { title, body },
      webpush: {
        notification: {
          icon: 'https://gui130699.github.io/CaixinhaCasal/icons/pwa-192x192.png',
          badge: 'https://gui130699.github.io/CaixinhaCasal/icons/pwa-192x192.png',
        },
        fcmOptions: {
          link: 'https://gui130699.github.io/CaixinhaCasal/',
        },
      },
    })
  } catch (err) {
    // Token inválido/expirado — remove do Firestore
    if (err.code === 'messaging/registration-token-not-registered') {
      const snap = await db.collection('fcm_tokens').where('token', '==', token).get()
      await Promise.all(snap.docs.map(d => d.ref.delete()))
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[notify-overdue] Verificando parcelas vencidas até ${todayStr}...`)

  const byUser = await getOverdueByUser()
  const userIds = Object.keys(byUser)

  if (userIds.length === 0) {
    console.log('[notify-overdue] Nenhuma parcela vencida encontrada.')
    return
  }

  console.log(`[notify-overdue] ${userIds.length} usuário(s) com parcelas vencidas.`)

  const tokensMap = await getTokensForUsers(userIds)

  for (const userId of userIds) {
    const tokens = tokensMap[userId] ?? []
    if (tokens.length === 0) {
      console.log(`[notify-overdue] Usuário ${userId} sem tokens FCM — pulando.`)
      continue
    }

    const { installments } = byUser[userId]
    for (const inst of installments) {
      const days = daysOverdue(inst.due_date)
      const title = 'Caixinha Casal 💰'
      const body = days === 0
        ? `Parcela de ${inst.goalName} vence hoje!`
        : `Parcela de ${inst.goalName} está vencida há ${days} dia${days > 1 ? 's' : ''}.`

      for (const token of tokens) {
        await sendPush(token, title, body)
      }
      console.log(`[notify-overdue] Notificado: usuário ${userId} — "${body}"`)
    }
  }

  console.log('[notify-overdue] Concluído.')
}

main().catch(err => {
  console.error('[notify-overdue] Erro:', err)
  process.exit(1)
})
