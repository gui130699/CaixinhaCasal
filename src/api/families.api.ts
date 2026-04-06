import { supabase } from '@/lib/supabase'
import type { Family, FamilyMember } from '@/types'
import type { CreateFamilyFormData } from '@/lib/validators'

export const familiesApi = {
  async list(): Promise<Family[]> {
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  async getById(id: string): Promise<Family> {
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(form: CreateFamilyFormData): Promise<Family> {
    const { data, error } = await supabase
      .from('families')
      .insert(form)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, form: Partial<CreateFamilyFormData & { status: string }>): Promise<Family> {
    const { data, error } = await supabase
      .from('families')
      .update(form)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('families').delete().eq('id', id)
    if (error) throw error
  },

  // Members
  async getMembers(familyId: string): Promise<FamilyMember[]> {
    const { data, error } = await supabase
      .from('family_members')
      .select('*, profile:profiles(*)')
      .eq('family_id', familyId)
      .order('joined_at')
    if (error) throw error
    return data
  },

  async addMember(familyId: string, userId: string, role: 'admin' | 'member'): Promise<FamilyMember> {
    const { data, error } = await supabase
      .from('family_members')
      .insert({ family_id: familyId, user_id: userId, role })
      .select('*, profile:profiles(*)')
      .single()
    if (error) throw error
    return data
  },

  async updateMemberRole(memberId: string, role: 'admin' | 'member'): Promise<void> {
    const { error } = await supabase
      .from('family_members')
      .update({ role })
      .eq('id', memberId)
    if (error) throw error
  },

  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('family_members')
      .update({ status: 'inactive' })
      .eq('id', memberId)
    if (error) throw error
  },

  async getUserFamily(userId: string): Promise<{ family: Family; role: string } | null> {
    const { data, error } = await supabase
      .from('family_members')
      .select('role, status, family:families(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()
    if (error) return null
    return { family: data.family as unknown as Family, role: data.role }
  },
}
