import { supabase } from '../../lib/supabase'

export interface PerkRedemptionRow {
  id: string
  user_id: string
  perk_key: 'priority_support' | 'swap_task' | 'super_star_up' | 'manager_promo'
  perk_title: string
  cost: number
  payload: Record<string, unknown>
  status: 'pending' | 'completed'
  created_at: string
  profiles?: { full_name: string; employee_code: string | null } | null
}

export interface MyTaskOption {
  id: string
  title: string
  status: string
  due_date: string | null
}

export interface MemberOption {
  id: string
  full_name: string
  employee_code: string | null
}

export async function redeemPerk(perkKey: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc('redeem_perk', {
    p_perk_key: perkKey,
    p_payload: payload,
  })
  if (error) throw error
  return data as {
    redemption_id: string
    perk_title: string
    cost: number
    remaining_credits: number
    rank_tier: string | null
    is_manager_tag: boolean
  }
}

export async function fetchPerkRedemptions(): Promise<PerkRedemptionRow[]> {
  const { data, error } = await supabase
    .from('perk_redemptions')
    .select('id, user_id, perk_key, perk_title, cost, payload, status, created_at, profiles(full_name, employee_code)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as unknown as PerkRedemptionRow[]
}

export async function markSupportResolved(id: string) {
  const { error } = await supabase
    .from('perk_redemptions')
    .update({ status: 'completed' })
    .eq('id', id)
  if (error) throw error
}

export async function fetchMyActiveTasks(userId: string): Promise<MyTaskOption[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, due_date')
    .eq('assignee_id', userId)
    .neq('status', 'done')
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as MyTaskOption[]
}

export async function fetchActiveMembers(excludeUserId: string): Promise<MemberOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, employee_code')
    .eq('is_active', true)
    .neq('id', excludeUserId)
    .order('full_name')
  if (error) return []
  return (data ?? []) as MemberOption[]
}