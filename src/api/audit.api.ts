import { supabase } from '@/lib/supabase'
import type { AuditLog } from '@/types'

export const auditApi = {
  async list(filters?: {
    actor_id?: string
    entity?: string
    action?: string
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }): Promise<{ data: AuditLog[]; count: number }> {
    let query = supabase
      .from('audit_logs')
      .select('*, actor:profiles!audit_logs_actor_user_id_fkey(id,full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filters?.actor_id) query = query.eq('actor_user_id', filters.actor_id)
    if (filters?.entity) query = query.eq('entity_name', filters.entity)
    if (filters?.action) query = query.eq('action_type', filters.action)
    if (filters?.start_date) query = query.gte('created_at', filters.start_date)
    if (filters?.end_date) query = query.lte('created_at', filters.end_date)
    if (filters?.limit) query = query.limit(filters.limit)
    if (filters?.offset) query = query.range(filters.offset, (filters.offset) + (filters.limit ?? 50) - 1)

    const { data, error, count } = await query
    if (error) throw error
    return { data: data ?? [], count: count ?? 0 }
  },

  async log(params: {
    actorId: string
    entity: string
    entityId?: string
    action: AuditLog['action_type']
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }): Promise<void> {
    await supabase.from('audit_logs').insert({
      actor_user_id: params.actorId,
      entity_name: params.entity,
      entity_id: params.entityId ?? null,
      action_type: params.action,
      before_data: params.before ?? null,
      after_data: params.after ?? null,
    })
  },
}
