import { supabase } from '../../lib/supabase'
import type { FinishResult, GameKey } from './types'

export type GameConfig = {
  seconds: number
  max_decisions: number
  credits_per_point: number
  max_credits_per_session: number
  max_credit_sessions_per_day: number
  progress_bonus_threshold: number
  progress_bonus_per_session: number
  progress_bonus_cap: number
  progress_bonus_sessions_per_user_per_day: number
}
export const DEFAULT_CONFIG: GameConfig = {
  seconds: 60, max_decisions: 40, credits_per_point: 0.5, max_credits_per_session: 100, max_credit_sessions_per_day: 10,
  progress_bonus_threshold: 50, progress_bonus_per_session: 0.5, progress_bonus_cap: 25, progress_bonus_sessions_per_user_per_day: 3,
}

export type MySession = { game_key: GameKey; score: number; credits_awarded: number; finished_at: string }
export type BoardRow = { player_id: string; full_name: string; department_id: string | null; best_score: number; total_score: number; plays: number }
export type XpRow = { id: string; full_name: string; department_id: string | null; xp: number; credits: number }

export async function fetchGameConfig(): Promise<GameConfig> {
  const { data } = await supabase.from('system_state').select('value').eq('key', 'game_config').maybeSingle()
  return { ...DEFAULT_CONFIG, ...((data?.value as Partial<GameConfig> | null) ?? {}) }
}

export async function startSession(game: GameKey) {
  const { data, error } = await supabase.rpc('start_game_session', { p_game: game })
  if (error) throw error
  return data as { session_id: string; seed: number; seconds: number }
}

export async function finishSession(sessionId: string, correct: number, wrong: number) {
  const { data, error } = await supabase.rpc('finish_game_session', { p_session: sessionId, p_correct: correct, p_wrong: wrong })
  if (error) throw error
  return data as FinishResult
}

export async function fetchMySessions(userId: string) {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('game_key, score, credits_awarded, finished_at')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []) as MySession[]
}

export async function fetchLeaderboard(game: GameKey | null) {
  const { data, error } = await supabase.rpc('get_game_leaderboard', { p_game: game, p_limit: 20 })
  if (error) throw error
  return (data ?? []) as BoardRow[]
}

export async function fetchXpBoard() {
  const { data, error } = await supabase.from('leaderboard').select('id, full_name, department_id, xp, credits').limit(20)
  if (error) throw error
  return (data ?? []) as XpRow[]
}

export const friendlyError = (e: unknown) => {
  const msg = (e as { message?: string })?.message ?? ''
  if (/Could not find the function|does not exist|schema cache/i.test(msg)) return 'Tính năng game chưa được cài trên database (cần chạy file docs/005_game_simulator.sql).'
  return msg || 'Có lỗi xảy ra. Thử lại sau.'
}
