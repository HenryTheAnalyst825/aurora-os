import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchChannels, fetchDms } from './api'
import { ChannelList } from './ChannelList'
import { Thread } from './Thread'

export function ChatPage() {
  const { channelId } = useParams()
  const navigate = useNavigate()
  const ch = useQuery({ queryKey: ['channels'], queryFn: fetchChannels })
  const dm = useQuery({ queryKey: ['dms'], queryFn: fetchDms })
  const channels = ch.data ?? []
  const dms = dm.data ?? []
  const channel = channels.find((c) => c.id === channelId)
  const activeDm = dms.find((d) => d.dm_channel_id === channelId)
  const title = activeDm ? activeDm.other_name : channel ? `# ${channel.name}` : ''

  // Màn hình lớn: tự mở kênh chung đầu tiên
  useEffect(() => {
    if (!channelId && channels.length && window.matchMedia('(min-width: 768px)').matches) {
      navigate(`/chat/${(channels.find((c) => c.type === 'general') ?? channels[0]).id}`, { replace: true })
    }
  }, [channelId, channels, navigate])

  const loading = ch.isLoading || dm.isLoading
  const known = !!(channel || activeDm)

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-96 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <aside className={`w-full shrink-0 border-slate-200 md:w-60 md:border-r ${channelId ? 'hidden md:flex' : 'flex'} flex-col`}>
        <ChannelList channels={channels} dms={dms} activeId={channelId} />
      </aside>
      <section className={`min-w-0 flex-1 flex-col ${channelId ? 'flex' : 'hidden md:flex'}`}>
        {channelId && known ? (
          <>
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2">
              <Link to="/chat" className="grid min-h-11 place-items-center pr-2 text-sm font-semibold text-accent md:hidden">← Kênh</Link>
              <h1 className="font-semibold">{title}</h1>
            </div>
            <Thread key={channelId} channelId={channelId} />
          </>
        ) : (
          <p className="m-auto p-6 text-sm text-slate-600">
            {channelId && !loading ? 'Không tìm thấy kênh hoặc bạn không có quyền truy cập.' : loading ? 'Đang tải…' : 'Chọn một kênh để bắt đầu.'}
          </p>
        )}
      </section>
    </div>
  )
}
