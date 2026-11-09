import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Ticket {
  id: string;
  user_email: string;
  title: string;
  category: string;
  priority: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  admin_reply?: string;
  created_at: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const COPILOT_SYSTEM_PROMPT = `Bạn là 'Aurora Copilot', trợ lý AI chuyên nghiệp trực thuộc hệ điều hành vận hành nhà máy Aurora OS.
Nhiệm vụ của bạn là hỗ trợ cán bộ nhân viên giải đáp các thắc mắc về quy trình vận hành (Kanban, Báo cáo, Kho tài liệu, Quy định 6 phòng ban, Hệ thống Điểm thưởng Credits và hướng dẫn tạo Phiếu hỗ trợ).
Hãy giao tiếp với văn phong công sở lịch sự, chuyên nghiệp, rõ ràng, luôn hỗ trợ tận tâm, xưng hô nhã nhặn (Anh/Chị/Bạn) và trình bày các ý ngắn gọn, súc tích bằng gạch đầu dòng khi cần thiết.`;

const FAQ_LIST = [
  {
    q: '1. Làm sao để tích lũy điểm thưởng (Credits) trên hệ thống?',
    a: 'Bạn có thể tích lũy Credits thông qua việc hoàn thành các công việc được giao trên bảng Kanban, tham gia trả lời câu hỏi Quiz định kỳ, hoặc hoàn thành ca làm việc giả lập nghiệp vụ tại 6 phòng ban.'
  },
  {
    q: '2. Quy trình xử lý khi gặp sự cố vận hành hoặc lỗi hệ thống?',
    a: 'Bạn có thể trao đổi trực tiếp với trợ lý AI Aurora Copilot ở khung bên phải để được hướng dẫn xử lý nhanh, hoặc điền thông tin vào form "Tạo Phiếu Hỗ Trợ (Raise Ticket)" ở bên trái để bộ phận IT/Admin tiếp nhận và xử lý.'
  },
  {
    q: '3. Khi nào nên chọn mức độ ưu tiên "Khẩn cấp" cho Ticket?',
    a: 'Chỉ chọn mức "Khẩn cấp" khi sự cố ảnh hưởng trực tiếp đến dây chuyền sản xuất, gián đoạn hoàn toàn quyền truy cập hệ thống cốt lõi hoặc mất mát dữ liệu quan trọng.'
  },
  {
    q: '4. Làm thế nào để cấp tài khoản hoặc mã mời cho nhân sự mới?',
    a: 'Hệ thống quản lý tài khoản thông qua mã mời nội bộ. Vui lòng liên hệ bộ phận Nhân sự (HR) hoặc tạo Ticket thuộc danh mục "Tài khoản" để được cấp phép.'
  },
  {
    q: '5. Theo dõi tiến độ xử lý Ticket đã gửi ở đâu?',
    a: 'Toàn bộ phiếu bạn gửi được hiển thị tại mục "Danh sách Phiếu hỗ trợ". Trạng thái và phản hồi chi tiết từ Quản trị viên sẽ được cập nhật trực tiếp tại từng thẻ phiếu.'
  }
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Kỹ thuật');
  const [priority, setPriority] = useState('Trung bình');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('Cán bộ nhân viên');

  // Chatbot State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: COPILOT_SYSTEM_PROMPT },
    {
      role: 'assistant',
      content: '👋 Xin chào! Tôi là **Aurora Copilot**, trợ lý AI hỗ trợ vận hành nhà máy. Tôi có thể hỗ trợ giải đáp quy trình hoặc hướng dẫn bạn tạo phiếu hỗ trợ hôm nay như thế nào?'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [modelOption, setModelOption] = useState('llama-3.3-70b-versatile');
  const [temperature, setTemperature] = useState(0.3); // Giảm temperature xuống 0.3 để AI trả lời chuẩn mực, ít sáng tạo lan man
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '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';

  useEffect(() => {
    fetchUserAndTickets();
  }, []);

  async function fetchUserAndTickets() {
    setLoadingTickets(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.email) {
      setCurrentUserEmail(userData.user.email);
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTickets(data as Ticket[]);
    }
    setLoadingTickets(false);
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);

    const { data: userData } = await supabase.auth.getUser();
    const newTicket = {
      user_id: userData?.user?.id || null,
      user_email: userData?.user?.email || currentUserEmail,
      title: title.trim(),
      category,
      priority,
      description: description.trim(),
      status: 'open'
    };

    const { error } = await supabase.from('support_tickets').insert([newTicket]);
    setSubmitting(false);

    if (!error) {
      setTitle('');
      setDescription('');
      fetchUserAndTickets();
    } else {
      alert('Không thể tạo Ticket. Vui lòng kiểm tra lại kết nối cơ sở dữ liệu Supabase.');
    }
  }

  async function handleUpdateTicket(ticketId: string, newStatus: string) {
    const reply = replyText[ticketId];
    const updatePayload: Record<string, unknown> = { status: newStatus };
    if (reply && reply.trim() !== '') {
      updatePayload.admin_reply = reply.trim();
      updatePayload.replied_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updatePayload)
      .eq('id', ticketId);

    if (!error) {
      fetchUserAndTickets();
    }
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || isAiTyping) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setChatInput('');
    setIsAiTyping(true);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: modelOption,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          temperature: temperature,
          max_tokens: 1024
        })
      });

      const data = await response.json();
      const replyContent =
        data?.choices?.[0]?.message?.content ||
        'Hệ thống đang tạm thời bận. Anh/Chị vui lòng thử lại sau hoặc gửi phiếu hỗ trợ trực tiếp cho Quản trị viên.';

      setMessages([...updatedMessages, { role: 'assistant', content: replyContent }]);
    } catch {
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: 'Không thể kết nối tới dịch vụ AI. Anh/Chị có thể sử dụng biểu mẫu gửi Phiếu hỗ trợ bên trái để được xử lý.'
        }
      ]);
    } finally {
      setIsAiTyping(false);
    }
  }

  function convertChatToTicket(text: string) {
    setTitle(`Yêu cầu hỗ trợ từ Copilot Chat: ${text.slice(0, 45)}...`);
    setDescription(text);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const filteredTickets = tickets.filter(t => (filterStatus === 'all' ? true : t.status === filterStatus));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trung tâm Hỗ trợ & Vận hành (Helpdesk)</h1>
          <p className="text-sm text-slate-500">
            Gửi yêu cầu hỗ trợ tới Quản trị viên hoặc trao đổi trực tiếp cùng Trợ lý AI Aurora Copilot
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">
            Chờ xử lý: {tickets.filter(t => t.status === 'open').length}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
            Đang xử lý: {tickets.filter(t => t.status === 'in_progress').length}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
            Đã giải quyết: {tickets.filter(t => t.status === 'resolved').length}
          </span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI: FORM TẠO TICKET & DANH SÁCH */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">🎫 Tạo Phiếu Hỗ Trợ (Raise Ticket)</h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Tiêu đề yêu cầu / Vấn đề gặp phải *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Lỗi đồng bộ điểm thưởng Credits sau khi hoàn thành nhiệm vụ..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Danh mục</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="Kỹ thuật">Lỗi Hệ thống / Kỹ thuật</option>
                    <option value="Nghiệp vụ phòng ban">Nghiệp vụ phòng ban</option>
                    <option value="Tài khoản & Mã mời">Tài khoản & Phân quyền</option>
                    <option value="Kanban & Tài liệu">Kanban & Tài liệu</option>
                    <option value="Khác">Đề xuất cải tiến / Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Mức độ ưu tiên</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="Thấp">Thấp (Góp ý / Hỏi thông tin)</option>
                    <option value="Trung bình">Trung bình (Cần hỗ trợ trong ngày)</option>
                    <option value="Cao">Cao (Ảnh hưởng tiến độ)</option>
                    <option value="Khẩn cấp">Khẩn cấp (Đình trệ vận hành)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Mô tả chi tiết *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Cung cấp chi tiết các bước hoặc nội dung cần hỗ trợ..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg transition disabled:opacity-50"
              >
                {submitting ? 'Đang gửi phiếu...' : 'Gửi Phiếu Hỗ Trợ'}
              </button>
            </form>
          </div>

          {/* Danh sách Ticket */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">📋 Danh sách Phiếu Hỗ Trợ</h2>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="all">Tất cả trạng thái ({tickets.length})</option>
                <option value="open">Chờ xử lý</option>
                <option value="in_progress">Đang xử lý</option>
                <option value="resolved">Đã giải quyết</option>
              </select>
            </div>

            {loadingTickets ? (
              <p className="text-sm text-slate-500 py-4 text-center">Đang tải danh sách phiếu...</p>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p className="text-sm text-slate-500">Chưa có phiếu hỗ trợ nào trong hệ thống.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {filteredTickets.map(ticket => (
                  <div key={ticket.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 mr-2">
                          {ticket.category}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            ticket.priority === 'Khẩn cấp'
                              ? 'bg-red-100 text-red-700'
                              : ticket.priority === 'Cao'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Ưu tiên: {ticket.priority}
                        </span>
                        <h3 className="font-semibold text-slate-900 mt-1 text-sm">{ticket.title}</h3>
                      </div>

                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                          ticket.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ticket.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ticket.status === 'resolved'
                          ? 'Đã giải quyết'
                          : ticket.status === 'in_progress'
                          ? 'Đang xử lý'
                          : 'Chờ xử lý'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 whitespace-pre-line">{ticket.description}</p>
                    <div className="text-xs text-slate-400">
                      Người gửi: {ticket.user_email} • {new Date(ticket.created_at).toLocaleString('vi-VN')}
                    </div>

                    {ticket.admin_reply && (
                      <div className="mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
                        <strong className="block text-xs uppercase text-emerald-700 mb-0.5">
                          Phản hồi từ Quản trị viên:
                        </strong>
                        {ticket.admin_reply}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Nhập phản hồi xử lý của quản trị viên..."
                        value={replyText[ticket.id] || ''}
                        onChange={e => setReplyText({ ...replyText, [ticket.id]: e.target.value })}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                      />
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateTicket(ticket.id, 'in_progress')}
                          className="px-2.5 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Đang xử lý
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateTicket(ticket.id, 'resolved')}
                          className="px-2.5 py-1.5 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Hoàn tất
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: TRỢ LÝ AI COPILOT (VĂN HÓA CÔNG SỞ CHUYÊN NGHIỆP) */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[760px]">
          <div className="p-4 bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🤖</span>
                <div>
                  <h3 className="font-bold text-sm">Aurora Copilot</h3>
                  <p className="text-xs text-slate-300">Trợ lý AI Hỗ trợ Vận hành Nhà máy</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Mô hình:</label>
                <select
                  value={modelOption}
                  onChange={e => setModelOption(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-800 text-white border border-slate-600 text-xs"
                >
                  <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                  <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Sáng tạo: {temperature}</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-slate-400 mt-1"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
            {messages
              .filter(m => m.role !== 'system')
              .map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="font-semibold text-xs text-slate-500 mb-1">Aurora Copilot</div>
                    )}
                    <div className="whitespace-pre-line">{msg.content}</div>
                  </div>

                  {msg.role === 'user' && (
                    <button
                      type="button"
                      onClick={() => convertChatToTicket(msg.content)}
                      className="text-[11px] text-slate-600 hover:underline mt-1"
                    >
                      ↳ Chuyển nội dung này thành Phiếu Hỗ Trợ
                    </button>
                  )}
                </div>
              ))}
            {isAiTyping && (
              <div className="text-xs text-slate-500 italic">Aurora Copilot đang xử lý yêu cầu...</div>
            )}
          </div>

          <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Nhập câu hỏi hoặc yêu cầu cần hỗ trợ..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              type="submit"
              disabled={isAiTyping}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition"
            >
              Gửi
            </button>
          </form>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">❓ Câu hỏi thường gặp (FAQ)</h2>
        <p className="text-xs text-slate-500 mb-4">
          Hướng dẫn và quy chuẩn vận hành chung trên hệ thống Aurora OS
        </p>

        <div className="divide-y divide-slate-200 border-t border-slate-200">
          {FAQ_LIST.map((item, idx) => (
            <div key={idx} className="py-3">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between text-left font-medium text-sm text-slate-800 hover:text-slate-900"
              >
                <span>{item.q}</span>
                <span className="text-slate-400 text-lg">{openFaq === idx ? '−' : '+'}</span>
              </button>
              {openFaq === idx && (
                <p className="mt-2 text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
