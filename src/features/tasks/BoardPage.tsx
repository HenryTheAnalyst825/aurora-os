import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { ProjectsPage } from './ProjectsPage';

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string;
  assignee_id?: string;
  assignee_name?: string;
  department_name?: string;
  created_at?: string;
}

interface MemberProfile {
  id: string;
  full_name: string;
  employee_code?: string;
  role?: string;
}

type MainSection = 'calendar_todo' | 'assign_center' | 'projects_branch';

// Dữ liệu mẫu hiển thị ngay khi DB chưa có task để lịch không bị trống trơn
const INITIAL_SAMPLE_TASKS: TaskItem[] = [
  {
    id: 'sample-1',
    title: 'Kiểm tra an toàn dây chuyền sản xuất Ca Sáng',
    description: 'Rà soát toàn bộ cảm biến nhiệt độ và áp suất khu vực xưởng A1 trước 08:30.',
    status: 'in_progress',
    priority: 'urgent',
    due_date: new Date().toISOString().split('T')[0],
    assignee_name: 'Quản trị viên (ADMIN-0001)',
    department_name: 'Vận hành & Bảo trì',
  },
  {
    id: 'sample-2',
    title: 'Họp giao ban điều phối tiến độ nhà máy tuần',
    description: 'Báo cáo KPI 6 phòng ban và rà soát danh sách ticket hỗ trợ tồn đọng.',
    status: 'todo',
    priority: 'high',
    due_date: new Date().toISOString().split('T')[0],
    assignee_name: 'Toàn bộ Trưởng bộ phận',
    department_name: 'Ban Quản Trị Hệ Thống',
  },
  {
    id: 'sample-3',
    title: 'Đối soát tồn kho vật tư dự phòng tháng',
    description: 'Cập nhật biên bản kiểm kê lên kho Tài liệu chung của Aurora OS.',
    status: 'todo',
    priority: 'medium',
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    assignee_name: 'Bộ phận Kho vận',
    department_name: 'Logistics',
  },
];

export function BoardPage() {
  const { profile } = useAuth();
  const todayISO = new Date().toISOString().split('T')[0];

  // 3 nhánh tách biệt rõ ràng
  const [activeSection, setActiveSection] = useState<MainSection>('calendar_todo');

  // Dữ liệu Tasks & Thành viên
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_SAMPLE_TASKS);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // State điều khiển Lịch (Calendar)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(INITIAL_SAMPLE_TASKS[0]);

  // State cho nhánh "Giao To-Do riêng" (Assign Center)
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDate, setAssignDate] = useState(todayISO);
  const [assignPriority, setAssignPriority] = useState<TaskItem['priority']>('high');
  const [assignUserId, setAssignUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Thêm nhanh To-Do trực tiếp vào ngày đang chọn trên Lịch
  const [quickTodoTitle, setQuickTodoTitle] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    // 1. Tải danh sách thành viên để giao việc
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, employee_code, role')
      .order('full_name', { ascending: true });

    if (profilesData && profilesData.length > 0) {
      setMembers(profilesData as MemberProfile[]);
      setAssignUserId(profilesData[0].id);
    }

    // 2. Tải danh sách công việc từ bảng tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (tasksData && tasksData.length > 0) {
      const normalized: TaskItem[] = tasksData.map((t: Record<string, unknown>) => {
        const assignee = (profilesData as MemberProfile[] | null)?.find(m => m.id === t.assignee_id);
        return {
          id: String(t.id),
          title: String(t.title || 'Công việc không tên'),
          description: t.description ? String(t.description) : 'Chưa có mô tả chi tiết.',
          status: (t.status as TaskItem['status']) || 'todo',
          priority: (t.priority as TaskItem['priority']) || 'medium',
          due_date: t.due_date ? String(t.due_date).split('T')[0] : todayISO,
          assignee_id: t.assignee_id ? String(t.assignee_id) : undefined,
          assignee_name: assignee?.full_name || profile?.full_name || 'Nhân sự vận hành',
        };
      });
      setTasks(normalized);
      setSelectedTask(normalized[0]);
    }
    setLoading(false);
  }

  // Tạo công việc mới từ nhánh "Giao To-Do riêng"
  async function handleAssignTask(e: React.FormEvent) {
    e.preventDefault();
    if (!assignTitle.trim()) return;
    setSubmitting(true);

    const targetMember = members.find(m => m.id === assignUserId);
    const newTaskObj: TaskItem = {
      id: `local-${Date.now()}`,
      title: assignTitle.trim(),
      description: assignDesc.trim() || 'Thực hiện theo quy trình vận hành tiêu chuẩn.',
      status: 'todo',
      priority: assignPriority,
      due_date: assignDate || todayISO,
      assignee_id: assignUserId || profile?.id,
      assignee_name: targetMember
        ? `${targetMember.full_name} (${targetMember.employee_code || 'NV'})`
        : profile?.full_name || 'Quản trị viên',
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title: newTaskObj.title,
          description: newTaskObj.description,
          status: 'todo',
          priority: newTaskObj.priority,
          due_date: newTaskObj.due_date,
          assignee_id: newTaskObj.assignee_id || null,
        },
      ])
      .select()
      .single();

    setSubmitting(false);

    if (!error && data) {
      newTaskObj.id = String(data.id);
    }

    setTasks(prev => [newTaskObj, ...prev]);
    setSelectedDate(newTaskObj.due_date);
    setSelectedTask(newTaskObj);
    setAssignTitle('');
    setAssignDesc('');
    setActiveSection('calendar_todo');
  }

  // Thêm nhanh To-Do ngay tại ngày đang chọn trên Lịch
  async function handleQuickAddOnDate(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTodoTitle.trim()) return;

    const newTaskObj: TaskItem = {
      id: `quick-${Date.now()}`,
      title: quickTodoTitle.trim(),
      description: `Công việc được lên lịch trực tiếp cho ngày ${selectedDate}.`,
      status: 'todo',
      priority: 'medium',
      due_date: selectedDate,
      assignee_id: profile?.id,
      assignee_name: profile?.full_name || 'Quản trị viên',
    };

    setTasks(prev => [newTaskObj, ...prev]);
    setSelectedTask(newTaskObj);
    setQuickTodoTitle('');

    await supabase.from('tasks').insert([
      {
        title: newTaskObj.title,
        description: newTaskObj.description,
        status: 'todo',
        priority: 'medium',
        due_date: selectedDate,
        assignee_id: profile?.id || null,
      },
    ]);
  }

  async function updateStatus(task: TaskItem, nextStatus: TaskItem['status']) {
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    if (selectedTask?.id === task.id) {
      setSelectedTask(prev => (prev ? { ...prev, status: nextStatus } : null));
    }
    if (!task.id.startsWith('sample-') && !task.id.startsWith('local-') && !task.id.startsWith('quick-')) {
      await supabase.from('tasks').update({ status: nextStatus }).eq('id', task.id);
    }
  }

  async function deleteTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (selectedTask?.id === taskId) setSelectedTask(null);
    if (!taskId.startsWith('sample-') && !taskId.startsWith('local-') && !taskId.startsWith('quick-')) {
      await supabase.from('tasks').delete().eq('id', taskId);
    }
  }

  // Xây dựng lưới Lịch Tháng (42 ô chuẩn Outlook Calendar)
  const buildCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7; // Thứ 2 là đầu tuần
    const startDate = new Date(year, month, 1 - startOffset);

    return Array.from({ length: 35 }, (_, idx) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + idx);
      const iso = d.toISOString().split('T')[0];
      return {
        dateObj: d,
        dayNumber: d.getDate(),
        iso,
        isCurrentMonth: d.getMonth() === month,
        isToday: iso === todayISO,
      };
    });
  };

  const calendarDays = buildCalendarDays();
  const tasksForSelectedDate = tasks.filter(t => t.due_date === selectedDate);

  const priorityStyle = (p: TaskItem['priority']) => {
    switch (p) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Thanh tiêu đề & 3 Nhánh độc lập */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📅 Trung tâm Lịch & Công việc (Outlook Schedule)</h1>
          <p className="text-sm text-slate-500">
            Theo dõi lịch biểu có gắn To-Do trực tiếp, phân công nhiệm vụ và quản lý nhánh Dự án độc lập
          </p>
        </div>

        {/* 3 Nhánh rõ ràng theo yêu cầu */}
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveSection('calendar_todo')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeSection === 'calendar_todo'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📆 1. Lịch & To-Do được giao
          </button>
          <button
            onClick={() => setActiveSection('assign_center')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeSection === 'assign_center'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📤 2. Giao việc (Assign To-Do)
          </button>
          <button
            onClick={() => setActiveSection('projects_branch')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeSection === 'projects_branch'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📁 3. Nhánh Dự án (Projects)
          </button>
        </div>
      </div>

      {/* =====================================================================
          NHÁNH 1: LỊCH CALENDAR HIỂN THỊ TRỰC TIẾP TO-DO + KHUNG CHI TIẾT BÊN PHẢI
      ===================================================================== */}
      {activeSection === 'calendar_todo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI (8 CỘT): LỊCH THÁNG OUTLOOK CÓ GẮN TO-DO TRÊN TỪNG NGÀY */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Thanh điều hướng tháng */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
                  }
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold"
                >
                  ◀ Tháng trước
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelectedDate(todayISO);
                  }}
                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold"
                >
                  Hôm nay
                </button>
                <button
                  onClick={() =>
                    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
                  }
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold"
                >
                  Tháng sau ▶
                </button>
              </div>

              <h2 className="text-sm font-bold uppercase tracking-wide">
                Tháng {currentMonth.getMonth() + 1} / {currentMonth.getFullYear()}
              </h2>
            </div>

            {/* Tiêu đề Thứ trong tuần */}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-600 py-2">
              <div>Thứ 2</div>
              <div>Thứ 3</div>
              <div>Thứ 4</div>
              <div>Thứ 5</div>
              <div>Thứ 6</div>
              <div>Thứ 7</div>
              <div className="text-red-600">Chủ nhật</div>
            </div>

            {/* Lưới 35 ô ngày */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
              {calendarDays.map(day => {
                const dayTasks = tasks.filter(t => t.due_date === day.iso);
                const isSelected = selectedDate === day.iso;

                return (
                  <div
                    key={day.iso}
                    onClick={() => {
                      setSelectedDate(day.iso);
                      if (dayTasks.length > 0) setSelectedTask(dayTasks[0]);
                    }}
                    className={`min-h-[115px] p-2 cursor-pointer transition flex flex-col justify-between ${
                      !day.isCurrentMonth ? 'bg-slate-50/60 text-slate-400' : 'bg-white hover:bg-blue-50/30'
                    } ${isSelected ? 'ring-2 ring-inset ring-slate-900 bg-blue-50/40' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          day.isToday
                            ? 'bg-blue-600 text-white'
                            : isSelected
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-700'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                          {dayTasks.length} việc
                        </span>
                      )}
                    </div>

                    {/* Danh sách To-Do được gán ngay trên ô lịch */}
                    <div className="mt-1.5 space-y-1 overflow-hidden">
                      {dayTasks.slice(0, 3).map(t => (
                        <div
                          key={t.id}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedDate(day.iso);
                            setSelectedTask(t);
                          }}
                          className={`px-1.5 py-1 rounded text-[11px] font-medium truncate border ${
                            t.status === 'done'
                              ? 'bg-slate-100 text-slate-400 line-through border-slate-200'
                              : priorityStyle(t.priority)
                          }`}
                        >
                          {t.status === 'done' ? '✓ ' : '• '}
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[10px] font-semibold text-blue-600 pl-1">
                          + {dayTasks.length - 3} công việc khác...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT PHẢI (4 CỘT): TO-DO LIST CỦA NGÀY ĐANG CHỌN & CHI TIẾT CÔNG VIỆC */}
          <div className="lg:col-span-4 space-y-4">
            {/* Hộp 1: Danh sách To-Do trong ngày đang bấm chọn */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <span className="text-[11px] font-bold uppercase text-blue-600">To-Do List trong ngày</span>
                  <h3 className="text-base font-bold text-slate-900">📅 Ngày {selectedDate}</h3>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800">
                  {tasksForSelectedDate.length} nhiệm vụ
                </span>
              </div>

              {/* Form thêm nhanh 1 To-Do vào ngày này */}
              <form onSubmit={handleQuickAddOnDate} className="flex gap-2">
                <input
                  type="text"
                  value={quickTodoTitle}
                  onChange={e => setQuickTodoTitle(e.target.value)}
                  placeholder="➕ Thêm nhanh To-Do vào ngày này..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 shrink-0"
                >
                  Thêm
                </button>
              </form>

              {/* Danh sách To-Do của ngày */}
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {tasksForSelectedDate.length === 0 ? (
                  <div className="p-4 text-center rounded-lg bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                    Chưa có To-Do nào vào ngày {selectedDate}. Nhập vào ô bên trên hoặc chuyển sang tab{' '}
                    <strong>Giao việc</strong> để phân công!
                  </div>
                ) : (
                  tasksForSelectedDate.map(t => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition flex items-start justify-between gap-2 ${
                        selectedTask?.id === t.id
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={t.status === 'done'}
                          onChange={e => {
                            e.stopPropagation();
                            updateStatus(t, t.status === 'done' ? 'todo' : 'done');
                          }}
                          className="mt-0.5 rounded accent-slate-900 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {t.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            👤 Giao cho: {t.assignee_name || 'Quản trị viên'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border shrink-0 ${priorityStyle(t.priority)}`}>
                        {t.priority.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Hộp 2: Chi tiết To-Do khi bấm vào (Outlook Reading Pane) */}
            {selectedTask && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-emerald-600">
                      🔍 Chi tiết Công việc (Assigned To-Do)
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedTask.title}</h3>
                  </div>
                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${priorityStyle(selectedTask.priority)}`}>
                    {selectedTask.priority.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Người được giao (Assignee):</span>
                    <span className="font-bold text-slate-900">
                      👤 {selectedTask.assignee_name || profile?.full_name || 'Quản trị viên'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Ngày thực hiện:</span>
                    <span className="font-bold text-blue-700">📅 {selectedTask.due_date}</span>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Trạng thái tiến độ:</label>
                    <select
                      value={selectedTask.status}
                      onChange={e => updateStatus(selectedTask, e.target.value as TaskItem['status'])}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                    >
                      <option value="todo">📌 Cần làm (To-Do)</option>
                      <option value="in_progress">⚡ Đang thực hiện (In Progress)</option>
                      <option value="review">🔍 Chờ nghiệm thu (Review)</option>
                      <option value="done">✅ Đã hoàn thành (Completed)</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-slate-400 block">
                      Nội dung & Hướng dẫn chi tiết:
                    </span>
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                      {selectedTask.description || 'Chưa có ghi chú chi tiết cho công việc này.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() =>
                      updateStatus(selectedTask, selectedTask.status === 'done' ? 'todo' : 'done')
                    }
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
                  >
                    {selectedTask.status === 'done' ? '↩️ Mở lại To-Do' : '✓ Hoàn thành ngay'}
                  </button>
                  <button
                    onClick={() => deleteTask(selectedTask.id)}
                    className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          NHÁNH 2: TRUNG TÂM GIAO VIỆC RIÊNG (ASSIGN TO-DO CENTER)
      ===================================================================== */}
      {activeSection === 'assign_center' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Giao To-Do Mới */}
          <form
            onSubmit={handleAssignTask}
            className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 h-fit"
          >
            <div className="border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase text-blue-600">Phân công nhiệm vụ</span>
              <h2 className="text-lg font-bold text-slate-900">📤 Giao To-Do Mới Lên Lịch</h2>
              <p className="text-xs text-slate-500">
                Công việc sau khi giao sẽ tự động gắn trực tiếp lên ô ngày tương ứng trên Lịch Calendar.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên đầu việc (To-Do Title) *</label>
                <input
                  type="text"
                  required
                  value={assignTitle}
                  onChange={e => setAssignTitle(e.target.value)}
                  placeholder="VD: Kiểm tra định kỳ trạm biến áp số 2..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Giao cho nhân sự (Assignee)</label>
                <select
                  value={assignUserId}
                  onChange={e => setAssignUserId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                >
                  {members.length === 0 ? (
                    <option value="">{profile?.full_name || 'Quản trị viên (ADMIN-0001)'}</option>
                  ) : (
                    members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.employee_code || m.role || 'Thành viên'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày thực hiện trên Lịch *</label>
                  <input
                    type="date"
                    required
                    value={assignDate}
                    onChange={e => setAssignDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Độ ưu tiên</label>
                  <select
                    value={assignPriority}
                    onChange={e => setAssignPriority(e.target.value as TaskItem['priority'])}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="urgent">🔥 Khẩn cấp (Urgent)</option>
                    <option value="high">⚡ Cao (High)</option>
                    <option value="medium">📌 Trung bình (Medium)</option>
                    <option value="low">🌱 Thấp (Low)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả & Yêu cầu nghiệm thu</label>
                <textarea
                  rows={4}
                  value={assignDesc}
                  onChange={e => setAssignDesc(e.target.value)}
                  placeholder="Ghi rõ các bước cần thực hiện, tiêu chuẩn an toàn hoặc tài liệu tham khảo..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg transition"
            >
              {submitting ? 'Đang phân công...' : '✓ Giao việc & Ghim lên Lịch'}
            </button>
          </form>

          {/* Danh sách toàn bộ To-Do đã giao */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">📋 Danh sách To-Do đã phân công ({tasks.length})</h3>
                <p className="text-xs text-slate-500">Bấm vào bất kỳ công việc nào để mở xem ngay trên Lịch</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {tasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedDate(t.due_date);
                    setSelectedTask(t);
                    setActiveSection('calendar_todo');
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-900 transition cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${priorityStyle(t.priority)}`}>
                        {t.priority.toUpperCase()}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{t.title}</h4>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span>👤 Người nhận: <strong>{t.assignee_name || 'Quản trị viên'}</strong></span>
                      <span>•</span>
                      <span>📅 Hạn lịch: <strong>{t.due_date}</strong></span>
                    </div>
                  </div>

                  <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold shrink-0">
                    Xem trên Lịch →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          NHÁNH 3: DỰ ÁN RIÊNG BIỆT (PROJECTS BRANCH)
      ===================================================================== */}
      {activeSection === 'projects_branch' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-purple-600">Nhánh Quản lý Dự án độc lập</span>
              <h2 className="text-lg font-bold text-slate-900">📁 Danh mục Dự án Nhà máy (Projects)</h2>
            </div>
          </div>
          <ProjectsPage />
        </div>
      )}
    </div>
  );
}