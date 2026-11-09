import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ReportsPage() {
  const [period, setPeriod] = useState('Tuần này');
  const [department, setDepartment] = useState('Tất cả phòng ban');
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    totalTickets: 0,
    resolvedTickets: 0,
    totalDocuments: 0
  });
  const [generatedMarkdown, setGeneratedMarkdown] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemMetrics();
  }, [period, department]);

  async function loadSystemMetrics() {
    setLoading(true);

    // Lấy thống kê Tasks (Kanban)
    const { data: tasksData } = await supabase.from('tasks').select('*');
    const allTasks = tasksData || [];
    const doneTasks = allTasks.filter(
      (t: Record<string, unknown>) => t.status === 'done' || t.status === 'completed'
    );
    const doingTasks = allTasks.filter(
      (t: Record<string, unknown>) => t.status === 'in_progress' || t.status === 'doing'
    );

    // Lấy thống kê Tickets Hỗ trợ
    const { data: ticketsData } = await supabase.from('support_tickets').select('*');
    const allTickets = ticketsData || [];
    const doneTickets = allTickets.filter((t: Record<string, unknown>) => t.status === 'resolved');

    // Lấy thống kê Tài liệu
    const { data: docsData } = await supabase.from('documents').select('id');
    const allDocs = docsData || [];

    const newStats = {
      totalTasks: allTasks.length,
      completedTasks: doneTasks.length,
      inProgressTasks: doingTasks.length,
      totalTickets: allTickets.length,
      resolvedTickets: doneTickets.length,
      totalDocuments: allDocs.length
    };

    setStats(newStats);
    buildAutoReportText(newStats, period, department);
    setLoading(false);
  }

  function buildAutoReportText(
    currentStats: typeof stats,
    selectedPeriod: string,
    selectedDept: string
  ) {
    const completionRate =
      currentStats.totalTasks > 0
        ? Math.round((currentStats.completedTasks / currentStats.totalTasks) * 100)
        : 100;

    const todayStr = new Date().toLocaleDateString('vi-VN');

    const report = `# BÁO CÁO TỔNG KẾT VẬN HÀNH NHÀ MÁY AURORA OS
- **Ngày xuất báo cáo:** ${todayStr}
- **Kỳ báo cáo:** ${selectedPeriod}
- **Phạm vi phòng ban:** ${selectedDept}

---

## 1. TỔNG QUAN TIẾN ĐỘ CÔNG VIỆC (KANBAN)
- **Tổng số nhiệm vụ ghi nhận:** ${currentStats.totalTasks} công việc
- **Đã hoàn thành:** ${currentStats.completedTasks} công việc (Đạt tỷ lệ ${completionRate}%)
- **Đang triển khai:** ${currentStats.inProgressTasks} công việc
- **Tài liệu kỹ thuật lưu trữ:** ${currentStats.totalDocuments} tài liệu

## 2. CÔNG TÁC HỖ TRỢ & XỬ LÝ SỰ CỐ (HELPDESK TICKETS)
- **Tổng số phiếu yêu cầu hỗ trợ (Tickets):** ${currentStats.totalTickets} phiếu
- **Đã giải quyết triệt để:** ${currentStats.resolvedTickets} phiếu
- **Đang chờ / Đang xử lý:** ${currentStats.totalTickets - currentStats.resolvedTickets} phiếu

## 3. ĐÁNH GIÁ CHUNG & ĐỀ XUẤT
- Hệ thống Web OS và các phòng ban (${selectedDept}) duy trì nhịp độ phối hợp ổn định.
- Đề xuất ưu tiên giải quyết dứt điểm ${
      currentStats.totalTickets - currentStats.resolvedTickets
    } phiếu hỗ trợ còn tồn đọng và đẩy nhanh ${
      currentStats.inProgressTasks
    } tác vụ đang thực hiện trên bảng Kanban để nâng cao tiến độ toàn nhà máy.`;

    setGeneratedMarkdown(report);
  }

  function handleCopyReport() {
    navigator.clipboard.writeText(generatedMarkdown);
    alert('Đã copy toàn bộ nội dung Báo cáo vào bộ nhớ tạm!');
  }

  function handleDownloadMarkdown() {
    const blob = new Blob([generatedMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_Aurora_OS_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📊 Trình Tạo Báo Cáo Công Việc Tự Động</h1>
          <p className="text-sm text-slate-500">
            Tự động tổng hợp số liệu thời gian thực từ Kanban, Kho Tài liệu và Hệ thống Hỗ trợ Ticket
          </p>
        </div>

        <div className="flex gap-3">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="Hôm nay">Kỳ: Hôm nay</option>
            <option value="Tuần này">Kỳ: Tuần này</option>
            <option value="Tháng này">Kỳ: Tháng này</option>
          </select>

          <select
            value={department}
            onChange={e => setDepartment(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="Tất cả phòng ban">Tất cả 6 phòng ban</option>
            <option value="Phòng Sản xuất">#phong-san-xuat</option>
            <option value="Phòng QC">#phong-qc</option>
            <option value="Phòng R&D">#phong-rd</option>
            <option value="Phòng EHS">#phong-ehs</option>
            <option value="Phòng HR">#phong-hr</option>
            <option value="Phòng Tài chính">#phong-tai-chinh</option>
          </select>
        </div>
      </div>

      {/* Thẻ chỉ số nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Tổng công việc (Kanban)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalTasks}</p>
          <p className="text-xs text-emerald-600 mt-1">Đã hoàn thành: {stats.completedTasks}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Đang thực hiện</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgressTasks}</p>
          <p className="text-xs text-slate-500 mt-1">Tác vụ trên dây chuyền</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Ticket Hỗ trợ</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{stats.totalTickets}</p>
          <p className="text-xs text-emerald-600 mt-1">Đã xử lý: {stats.resolvedTickets}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Tài liệu lưu trữ</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalDocuments}</p>
          <p className="text-xs text-slate-500 mt-1">Quy trình & biểu mẫu</p>
        </div>
      </div>

      {/* Khung văn bản báo cáo tự động */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-800">
            📝 Bản thảo Báo cáo được tạo tự động (Có thể chỉnh sửa trực tiếp trước khi xuất)
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadSystemMetrics}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 hover:bg-slate-100"
            >
              🔄 Làm mới số liệu
            </button>
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            >
              📋 Copy Báo Cáo
            </button>
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700"
            >
              ⬇️ Tải file .MD
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Đang tổng hợp dữ liệu báo cáo...</div>
        ) : (
          <textarea
            rows={16}
            value={generatedMarkdown}
            onChange={e => setGeneratedMarkdown(e.target.value)}
            className="w-full p-4 rounded-lg border border-slate-300 font-mono text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        )}
      </div>
    </div>
  );
}