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

function generateInstallments(goalId: string, familyId: string, startDate: string, months: number, memberSchedule: { userId: string; amount: number }[]) {
  const installs: Omit<Installment, 'id'>[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(startDate)
    d.setMonth(d.getMonth() + i)
    const ref = d.toISOString().substring(0, 7)
    const due = new Date(d.getFullYear(), d.getMonth() + 1, 5).toISOString().substring(0, 10)
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
    const months =
      form.calculation_mode === 'by_months'
        ? (form.months_count ?? 1)
        : calculateMonths(form.target_amount, form.installment_amount ?? 1)

    const installment =
      form.calculation_mode === 'by_months'
        ? calculateInstallment(form.target_amount, form.months_count ?? 1)
        : (form.installment_amount ?? 0)

    const startDate = new Date(form.start_date)
    const targetDate = new Date(startDate)
    targetDate.setMonth(targetDate.getMonth() + months)

    const ref = await addDoc(collection(db, 'families', familyId, 'goals'), {
      family_id: familyId,
      bank_account_id: form.bank_account_id ?? null,
      name: form.name,
      description: form.description ?? null,
      target_amount: form.target_amount,
      initial_amount: form.initial_amount ?? 0,
      current_balance: form.initial_amount ?? 0,
      remaining_amount: form.target_amount - (form.initial_amount ?? 0),
      start_date: form.start_date,
      target_date: targetDate.toISOString().substring(0, 10),
      months_count: months,
      installment_amount: installment,
      calculation_mode: form.calculation_mode,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const members = [{ user_id: userId, expected_monthly_amount: installment, participation_percent: 100 }]

    await Promise.all(
      members.map(m =>
        setDoc(doc(db, 'families', familyId, 'goals', ref.id, 'members', m.user_id), {
          goal_id: ref.id,
          user_id: m.user_id,
          expected_monthly_amount: m.expected_monthly_amount,
          participation_percent: m.participation_percent,
        })
      )
    )

    // Gerar cronograma
    const memberSchedule = members.map(m => ({ userId: m.user_id, amount: m.expected_monthly_amount }))
    const installs = generateInstallments(ref.id, familyId, form.start_date, months, memberSchedule)
    await Promise.all(
      installs.map(inst => addDoc(collection(db, 'families', familyId, 'installments'), inst))
    )

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

