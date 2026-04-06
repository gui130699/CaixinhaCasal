import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as limitQuery,
  startAfter,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AuditLog } from '@/types'

export const auditApi = {
  async list(filters?: { page?: number; limit?: number }): Promise<{ data: AuditLog[]; total: number }> {
    const lim = filters?.limit ?? 50
    const snap = await getDocs(
      query(collection(db, 'auditLogs'), orderBy('created_at', 'desc'), limitQuery(500))
    )
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AuditLog[]
    const page = filters?.page ?? 1
    const data = all.slice((page - 1) * lim, page * lim)
    return { data, total: all.length }
  },

  async log(params: {
    actorId: string
    entity: string
    entityId?: string
    action: string
    description?: string
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }): Promise<void> {
    await addDoc(collection(db, 'auditLogs'), {
      user_id: params.actorId,
      table_name: params.entity,
      entity_id: params.entityId ?? null,
      action: params.action,
      description: params.description ?? null,
      before_data: params.before ?? null,
      after_data: params.after ?? null,
      created_at: new Date().toISOString(),
    })
  },
}
