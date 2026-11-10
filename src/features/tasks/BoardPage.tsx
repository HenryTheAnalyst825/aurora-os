import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  assignee_id?: string;
  created_by?: string;
  attachment_url?: string;
  created_at: string;
}

type ViewMode = 'todo' | 'schedule' | 'board';
type TodoFilter = 'all' | 'my_day' | 'important' | 'completed';

export function BoardPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Chế độ hiển thị kiểu Outlook
  const [viewMode, setViewMode] = useState<ViewMode>('todo');
  const [todoFilter, setTodoFilter] = useState<TodoFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [onlyMyTasks, setOnlyMyTasks] = useState<boolean>(false);

  // Form thêm nhanh công việc
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAttachment, setNewAttachment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Ngăn xem chi tiết công việc bên phải (Outlook Reading Pane)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data as Task[]);
    }
    setLoading(false);
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      status: 'todo',
      priority: newPriority,
      due_date: newDueDate || new Date().toISOString().split('T')[0],
      assignee_id: profile?.id || null,
      created_by: profile?.id || null,
    };

    const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
    setSubmitting(false);

    if (!error && data) {
      setTasks(prev => [data as Task, ...prev]);
      setNewTitle('');
      setNewDescription('');
      setNewAttachment('');
    } else {
      // Fallback nếu schema bảng tasks chỉ có các cột cơ bản
      const minimalPayload = {
        title: newTitle.trim(),
        status: 'todo',
        priority: newPriority,
      };
      const { data: fallbackData } = await supabase.from('tasks').insert([minimalPayload]).select().single();
      if (fallbackData) {
        setTasks(prev => [fallbackData as Task, ...prev]);
        setNewTitle('');
      }
    }
  }

  async function toggleTaskComplete(task: Task) {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    await updateTaskStatus(task.id, nextStatus);
  }

  async function updateTaskStatus(taskId: string, nextStatus: Task['status']) {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: nextStatus } : t)));
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => (prev ? { ...prev, status: nextStatus } : null));
    }
    await supabase.from('tasks').update({ status: nextStatus }).eq('id', taskId);
  }

  async function deleteTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (selectedTask?.id === taskId) setSelectedTask(null);
    await supabase.from('tasks').delete().eq('id', taskId);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Bộ lọc tổng hợp
  const filteredTasks = tasks.filter(t => {
    if (onlyMyTasks && profile?.id && t.assignee_id && t.assignee_id !== profile.id) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    if (viewMode === 'todo') {
      if (todoFilter === 'my_day') return t.due_date?.startsWith(todayStr) && t.status !== 'done';
      if (todoFilter === 'important') return (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'done';
      if (todoFilter === 'completed') return t.status === 'done';
    }
    return true;
  });

  // Tạo danh sách 7 ngày trong tuần hiện tại cho chế độ Schedule (Outlook Calendar)
  const getWeekDays = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay() || 7;
    startOfWeek.setDate(now.getDate() - day + 1);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
      return { iso, label, isToday: iso === todayStr };
    });
  };

  const weekDays = getWeekDays();

  const priorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-red-100 text-red-700">Khẩn cấp</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-orange-100 text-orange-700">Cao</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-blue-50 text-blue-700">Trung bình</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-600">Thấp</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header kiểu Microsoft Outlook */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📅 Schedule & To-Do List</h1>
          <p className="text-sm text-slate-500">
            Quản lý lịch trình làm việc, danh sách To-Do cá nhân và tiến độ vận hành theo chuẩn Outlook
          </p>
        </div>

        {/* Chuyển đổi 3 chế độ xem */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('todo')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'todo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ☑️ To-Do List
          </button>
          <button
            onClick={() => setViewMode('schedule')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'schedule' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📆 Lịch trình (Schedule)
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🗂️ Bảng tiến độ (Board)
          </button>
        </div>
      </div>

      {/* Thanh công cụ lọc & Tìm kiếm */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="🔍 Tìm kiếm công việc, lịch hẹn..."
            className="w-full md:max-w-xs px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
          >
            <option value="all">Mọi độ ưu tiên</option>
            <option value="urgent">🔥 Khẩn cấp</option>
            <option value="high">⚡ Ưu tiên cao</option>
            <option value="medium">📌 Trung bình</option>
            <option value="low">🌱 Thấp</option>
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
            <input
              type="checkbox"
              checked={onlyMyTasks}
              onChange={e => setOnlyMyTasks(e.target.checked)}
              className="rounded border-slate-300"
            />
            Chỉ việc của tôi ({profile?.full_name || 'Cá nhân'})
          </label>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600 font-medium">
            Hoàn thành: <strong>{tasks.filter(t => t.status === 'done').length}</strong>/{tasks.length}
          </span>
        </div>
      </div>

      {/* Form Thêm nhanh Công việc / Lịch hẹn (Quick Add) */}
      <form
        onSubmit={handleAddTask}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
      >
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            required
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="➕ Thêm công việc mới hoặc lịch trình trong ngày (Nhấn Enter để lưu)..."
            className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <input
            type="date"
            value={newDueDate}
            onChange={e => setNewDueDate(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
          />
          <select
            value={newPriority}
            onChange={e => setNewPriority(e.target.value as Task['priority'])}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
          >
            <option value="low">Ưu tiên: Thấp</option>
            <option value="medium">Ưu tiên: Trung bình</option>
            <option value="high">Ưu tiên: Cao</option>
            <option value="urgent">Ưu tiên: Khẩn cấp</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition shrink-0"
          >
            {submitting ? 'Đang thêm...' : 'Thêm vào Lịch'}
          </button>
        </div>
      </form>

      {/* NỘI DUNG CHÍNH THEO CHẾ ĐỘ XEM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột chính */}
        <div className={selectedTask ? 'lg:col-span-8' : 'lg:col-span-12'}>
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              Đang đồng bộ lịch trình và danh sách công việc...
            </div>
          ) : viewMode === 'todo' ? (
            /* CHẾ ĐỘ 1: OUTLOOK TO-DO LIST */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Sidebar danh mục To-Do bên trái */}
              <div className="md:col-span-3 bg-white rounded-xl border border-slate-200 p-3 space-y-1 h-fit">
                <button
                  onClick={() => setTodoFilter('all')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    todoFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>📋 Tất cả công việc</span>
                  <span>{tasks.length}</span>
                </button>
                <button
                  onClick={() => setTodoFilter('my_day')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    todoFilter === 'my_day' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>☀️ Ngày của tôi (My Day)</span>
                  <span>{tasks.filter(t => t.due_date?.startsWith(todayStr) && t.status !== 'done').length}</span>
                </button>
                <button
                  onClick={() => setTodoFilter('important')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    todoFilter === 'important' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>⭐ Quan trọng</span>
                  <span>
                    {tasks.filter(t => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'done').length}
                  </span>
                </button>
                <button
                  onClick={() => setTodoFilter('completed')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    todoFilter === 'completed' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>✅ Đã hoàn thành</span>
                  <span>{tasks.filter(t => t.status === 'done').length}</span>
                </button>
              </div>

              {/* Danh sách To-Do bên phải */}
              <div className="md:col-span-9 space-y-2">
                {filteredTasks.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
                    <p className="text-sm text-slate-500">Không có công việc nào trong danh mục này.</p>
                  </div>
                ) : (
                  filteredTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`bg-white p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        selectedTask?.id === task.id
                          ? 'border-slate-900 ring-1 ring-slate-900'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={task.status === 'done'}
                          onChange={e => {
                            e.stopPropagation();
                            toggleTaskComplete(task);
                          }}
                          className="w-4 h-4 rounded-full accent-slate-900 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <h4
                            className={`text-sm font-medium truncate ${
                              task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span>📅 Hạn: {task.due_date ? task.due_date.split('T')[0] : 'Hôm nay'}</span>
                            <span>•</span>
                            <span className="uppercase">{task.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {priorityBadge(task.priority)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : viewMode === 'schedule' ? (
            /* CHẾ ĐỘ 2: OUTLOOK SCHEDULE CALENDAR (LỊCH TUẦN) */
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <h3 className="text-sm font-bold">📆 Lịch trình làm việc trong tuần (Weekly Schedule)</h3>
                <span className="text-xs text-slate-300">Hôm nay: {new Date().toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                {weekDays.map(day => {
                  const dayTasks = filteredTasks.filter(t =>
                    t.due_date ? t.due_date.startsWith(day.iso) : day.isToday
                  );
                  return (
                    <div key={day.iso} className={`min-h-[320px] p-3 space-y-2 ${day.isToday ? 'bg-blue-50/40' : ''}`}>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className={`text-xs font-bold ${day.isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                          {day.label}
                        </span>
                        {day.isToday && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded">
                            Hôm nay
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {dayTasks.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic pt-2">Trống lịch</p>
                        ) : (
                          dayTasks.map(t => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTask(t)}
                              className={`p-2 rounded-lg border text-xs cursor-pointer transition ${
                                t.status === 'done'
                                  ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                                  : 'bg-white border-slate-200 shadow-sm hover:border-slate-400'
                              }`}
                            >
                              <div className="font-semibold truncate">{t.title}</div>
                              <div className="mt-1 flex items-center justify-between">
                                {priorityBadge(t.priority)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* CHẾ ĐỘ 3: BOARD 4 CỘT */
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {(
                [
                  ['todo', '📌 Cần làm (To Do)'],
                  ['in_progress', '⚡ Đang thực hiện'],
                  ['review', '🔍 Chờ kiểm tra'],
                  ['done', '✅ Hoàn thành'],
                ] as const
              ).map(([statusKey, statusLabel]) => {
                const colTasks = filteredTasks.filter(t => t.status === statusKey);
                return (
                  <div key={statusKey} className="bg-slate-100/80 rounded-xl p-3 space-y-3 border border-slate-200">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-bold uppercase text-slate-700">{statusLabel}</h3>
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white text-slate-700 shadow-sm">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 min-h-[360px]">
                      {colTasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2 cursor-pointer hover:border-slate-400 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-slate-900">{task.title}</h4>
                            {priorityBadge(task.priority)}
                          </div>
                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                            <span>📅 {task.due_date ? task.due_date.split('T')[0] : 'Hôm nay'}</span>
                            <select
                              value={task.status}
                              onClick={e => e.stopPropagation()}
                              onChange={e => updateTaskStatus(task.id, e.target.value as Task['status'])}
                              className="px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 bg-slate-50 text-[11px]"
                            >
                              <option value="todo">Cần làm</option>
                              <option value="in_progress">Đang làm</option>
                              <option value="review">Chờ duyệt</option>
                              <option value="done">Hoàn thành</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ngăn chi tiết công việc bên phải (Outlook Reading Pane) */}
        {selectedTask && (
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 h-fit sticky top-6">
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase text-blue-600">Chi tiết Lịch trình / Task</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Trạng thái thực hiện:</label>
                <select
                  value={selectedTask.status}
                  onChange={e => updateTaskStatus(selectedTask.id, e.target.value as Task['status'])}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  <option value="todo">📌 Cần làm (To Do)</option>
                  <option value="in_progress">⚡ Đang thực hiện (In Progress)</option>
                  <option value="review">🔍 Chờ kiểm tra (Review)</option>
                  <option value="done">✅ Đã hoàn thành (Completed)</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-2 border-y border-slate-100">
                <span className="text-slate-500">Mức độ ưu tiên:</span>
                {priorityBadge(selectedTask.priority)}
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Hạn hoàn thành (Due Date):</span>
                <span className="font-semibold text-slate-800">
                  {selectedTask.due_date ? selectedTask.due_date.split('T')[0] : 'Trong ngày'}
                </span>
              </div>

              {selectedTask.description && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 whitespace-pre-line">
                  <strong className="block text-[11px] uppercase text-slate-400 mb-1">Ghi chú chi tiết:</strong>
                  {selectedTask.description}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => toggleTaskComplete(selectedTask)}
                className="px-3.5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
              >
                {selectedTask.status === 'done' ? '↩️ Mở lại công việc' : '✓ Đánh dấu Hoàn thành'}
              </button>
              <button
                onClick={() => deleteTask(selectedTask.id)}
                className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                🗑️ Xóa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}