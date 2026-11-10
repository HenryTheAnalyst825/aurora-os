import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority?: string;
  created_by?: string;
  created_at: string;
}

interface UserNotification {
  id: string;
  title: string;
  message?: string;
  body?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'announcements' | 'personal'>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // State tạo thông báo BTC (dành cho Admin)
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    // 1. Lấy thông báo từ Ban Tổ Chức (bảng announcements)
    const { data: annData } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (annData) setAnnouncements(annData as Announcement[]);

    // 2. Lấy thông báo cá nhân (bảng notifications)
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (notifData) setNotifications(notifData as UserNotification[]);
    }
    setLoading(false);
  }

  async function handleCreateAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);

    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('announcements').insert([
      {
        title: title.trim(),
        content: content.trim(),
        created_by: userData?.user?.id || null
      }
    ]);

    setSubmitting(false);
    if (!error) {
      setTitle('');
      setContent('');
      fetchData();
    } else {
      alert('Không thể đăng thông báo. Hãy kiểm tra bảng announcements trên Supabase.');
    }
  }

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
  }

  async function markAllAsRead() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userData.user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🔔 Trung tâm Thông báo</h1>
          <p className="text-sm text-slate-500">
            Cập nhật tin tức chính thức từ Ban Tổ Chức và thông báo hoạt động cá nhân của bạn
          </p>
        </div>

        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === 'announcements'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📢 Bản tin Ban Tổ Chức ({announcements.length})
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${
              activeTab === 'personal'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📬 Thông báo của tôi</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-600 text-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'announcements' ? (
        <div className="space-y-6">
          {/* Form đăng bản tin dành riêng cho Admin */}
          {isAdmin && (
            <form
              onSubmit={handleCreateAnnouncement}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4"
            >
              <h2 className="text-base font-bold text-slate-800">
                ✍️ Đăng thông báo mới từ Ban Tổ Chức (Quyền Quản trị viên)
              </h2>
              <div>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Tiêu đề thông báo toàn nhà máy..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <textarea
                  rows={3}
                  required
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Nội dung chi tiết thông báo..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {submitting ? 'Đang phát hành...' : 'Phát hành Thông báo'}
              </button>
            </form>
          )}

          {/* Danh sách Bản tin Ban Tổ Chức */}
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Đang tải bản tin...</p>
          ) : announcements.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <p className="text-slate-500 text-sm">Hiện chưa có thông báo chính thức nào từ Ban Tổ Chức.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map(ann => (
                <div
                  key={ann.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                      📌 Ban Tổ Chức Aurora OS
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(ann.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{ann.title}</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{ann.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Bạn có <strong>{unreadCount}</strong> thông báo chưa đọc.
            </p>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                ✓ Đánh dấu tất cả là đã đọc
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Đang tải thông báo...</p>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <p className="text-slate-500 text-sm">Hộp thư thông báo cá nhân của bạn đang trống.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex items-start justify-between gap-4 ${
                    n.is_read
                      ? 'bg-white border-slate-200 text-slate-600'
                      : 'bg-blue-50/60 border-blue-200 text-slate-900 shadow-sm'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                      <h4 className="font-semibold text-sm">{n.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600">{n.message || n.body}</p>
                    <span className="block text-[11px] text-slate-400">
                      {new Date(n.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  {!n.is_read && (
                    <span className="text-[11px] font-medium text-blue-600 shrink-0">Đánh dấu đã đọc</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}