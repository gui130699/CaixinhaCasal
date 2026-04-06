import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'
import type { UpdateProfileFormData } from '@/lib/validators'

export const profilesApi = {
  async getById(id: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, form: UpdateProfileFormData): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name, phone: form.phone ?? null })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateLastLogin(id: string) {
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', id)
  },

  async isMasterAdmin(userId: string): Promise<boolean> {
    const { count } = await supabase
      .from('admin_roles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    return (count ?? 0) > 0
  },

  async listAllWithEmail() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, family_members(family_id, role, status, families(name))')
      .order('full_name')
    if (error) throw error
    return data
  },
}
