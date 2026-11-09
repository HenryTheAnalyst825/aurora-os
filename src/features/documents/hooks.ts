import { useQuery, type QueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

const seenKey = (uid: string) => `aurora-docs-seen-${uid}`

// Đánh dấu đã xem tài liệu mới (gọi khi mở trang Tài liệu)
export function markDocsSeen(uid: string, qc: QueryClient) {
  try {
    localStorage.setItem(seenKey(uid), new Date().toISOString())
  } catch {
    /* trình duyệt chặn lưu trữ: bỏ qua */
  }
  qc.invalidateQueries({ queryKey: ['docs-new'] })
}

// Số tài liệu mới (do người khác tải lên) kể từ lần xem gần nhất, hiện ở menu bên trái
export function useNewDocsCount() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['docs-new', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      let since: string | null = null
      try {
        since = localStorage.getItem(seenKey(profile!.id))
        if (!since) localStorage.setItem(seenKey(profile!.id), new Date().toISOString())
      } catch {
        /* bỏ qua */
      }
      if (!since) return 0
      const { count } = await supabase.from('documents').select('id', { count: 'exact', head: true }).gt('created_at', since).neq('uploaded_by', profile!.id)
      return count ?? 0
    },
  })
}
