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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_state' }, () => {
        qc.invalidateQueries({ queryKey: ['factory-progress'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
        qc.invalidateQueries({ queryKey: ['documents'] })
        qc.invalidateQueries({ queryKey: ['docs-new'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_folders' }, () => {
        qc.invalidateQueries({ queryKey: ['folders'] })
        qc.invalidateQueries({ queryKey: ['documents'] })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
}
