import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

// Một kênh realtime duy nhất cho cả app: có thay đổi ở tasks/task_comments/messages thì tải lại dữ liệu liên quan.
// Hủy đăng ký khi rời khỏi app để không chiếm kết nối.
export function useRealtimeSync() {
  const qc = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel('tasks-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        qc.invalidateQueries({ queryKey: ['tasks'] })
        qc.invalidateQueries({ queryKey: ['factory-progress'] })
        qc.invalidateQueries({ queryKey: ['history'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' }, () => {
        qc.invalidateQueries({ queryKey: ['comments'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        qc.invalidateQueries({ queryKey: ['messages'] })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
}
