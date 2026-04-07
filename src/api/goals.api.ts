import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Goal, GoalMember, Installment } from '@/types'
import type { CreateGoalFormData } from '@/lib/validators'
import { calculateInstallment, calculateMonths } from '@/lib/utils'

function generateInstallments(goalId: string, familyId: string, firstInstallmentDate: string, months: number, memberSchedule: { userId: string; amount: number }[]) {
  const installs: Omit<Installment, 'id'>[] = []
  const base = new Date(firstInstallmentDate + 'T00:00:00')
  const dueDay = base.getDate()
  for (let i = 0; i < months; i++) {
    const d = new Date(base)
    d.setMonth(d.getMonth() + i)
    const ref = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const due = new Date(d.getFullYear(), d.getMonth(), Math.min(dueDay, maxDay)).toISOString().substring(0, 10)
    memberSchedule.forEach(ms => {
      installs.push({
        goal_id: goalId,
        family_id: familyId,
        user_id: ms.userId,
        reference_month: ref,
        due_date: due,
        expected_amount: ms.amount,
        paid_amount: 0,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
    })
  }
  return installs
}

export const goalsApi = {
  async listByFamily(familyId: string): Promise<Goal[]> {
    const snap = await getDocs(
      query(collection(db, 'families', familyId, 'goals'), orderBy('created_at', 'desc'))
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Goal[]
  },

  async getById(id: string, familyId: string): Promise<Goal | null> {
    const snap = await getDoc(doc(db, 'families', familyId, 'goals', id))
    if (!snap.exists()) return null
    const membersSnap = await getDocs(collection(db, 'families', familyId, 'goals', id, 'members'))
    const goal_members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    return { id: snap.id, ...snap.data(), goal_members } as Goal
  },

  async create(userId: string, familyId: string, form: CreateGoalFormData): Promise<Goal> {
    let months: number
    let installmentTotal: number
    let targetAmount: number | null

    if (form.mode === 'monthly_value') {
      installmentTotal = form.monthly_amount ?? 0
      months = form.months_count ?? 0
      targetAmount = months > 0 ? installmentTotal * months : null
    } else {
      targetAmount = form.target_amount ?? 0
      if (form.total_calc_mode === 'by_installment') {
        installmentTotal = form.installment_amount ?? 0
        months = calculateMonths(targetAmount, installmentTotal)
      } else {
        months = form.total_months ?? 1
        installmentTotal = calculateInstallment(targetAmount, months)
      }
    }

    const firstInstallDate = form.first_installment_date
    let targetDate: string | null = null
    if (months > 0) {
      const d = new Date(firstInstallDate + 'T00:00:00')
      d.setMonth(d.getMonth() + months - 1)
      targetDate = d.toISOString().substring(0, 10)
    }

    // Build participants list
    const participants = (form.participant_ids ?? [userId]).map(uid => ({
      user_id: uid,
      participation_percent: form.percentages?.[uid] ?? Math.round(100 / (form.participant_ids?.length ?? 1)),
      expected_monthly_amount: Math.round(installmentTotal * ((form.percentages?.[uid] ?? Math.round(100 / (form.participant_ids?.length ?? 1))) / 100) * 100) / 100,
    }))

    const ref = await addDoc(collection(db, 'families', familyId, 'goals'), {
      family_id: familyId,
      bank_account_id: null,
      name: form.name,
      description: form.description ?? null,
      target_amount: targetAmount ?? installmentTotal * 12,
      initial_amount: 0,
      current_balance: 0,
      remaining_amount: targetAmount ?? installmentTotal * 12,
      start_date: firstInstallDate,
      first_installment_date: firstInstallDate,
      target_date: targetDate,
      months_count: months > 0 ? months : null,
      installment_amount: installmentTotal,
      calculation_mode: form.mode,
      is_open_ended: months === 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await Promise.all(
      participants.map(m =>
        setDoc(doc(db, 'families', familyId, 'goals', ref.id, 'members', m.user_id), {
          goal_id: ref.id,
          user_id: m.user_id,
          expected_monthly_amount: m.expected_monthly_amount,
          participation_percent: m.participation_percent,
          status: 'active',
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
      )
    )

    if (months > 0) {
      const memberSchedule = participants.map(m => ({ userId: m.user_id, amount: m.expected_monthly_amount }))
      const installs = generateInstallments(ref.id, familyId, firstInstallDate, months, memberSchedule)
      await Promise.all(installs.map(inst => addDoc(collection(db, 'families', familyId, 'installments'), inst)))
    }

    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Goal
  },

  async update(id: string, familyId: string, data: Partial<Goal>): Promise<void> {
    await updateDoc(doc(db, 'families', familyId, 'goals', id), {
      ...data,
      updated_at: new Date().toISOString(),
    })
  },

  async updateStatus(id: string, familyId: string, status: Goal['status']): Promise<void> {
    const updates: any = { status, updated_at: new Date().toISOString() }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    await updateDoc(doc(db, 'families', familyId, 'goals', id), updates)
  },

  async delete(id: string, familyId: string): Promise<void> {
    await deleteDoc(doc(db, 'families', familyId, 'goals', id))
  },

  async getMembers(goalId: string, familyId: string): Promise<GoalMember[]> {
    const snap = await getDocs(collection(db, 'families', familyId, 'goals', goalId, 'members'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as GoalMember[]
  },
}

