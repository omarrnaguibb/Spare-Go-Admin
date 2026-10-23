"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  DollarSign,
  ShieldAlert,
  Wrench,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { SupportTicket } from "@/lib/types";
import { ConfirmModal } from "@/components/confirm-modal";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [searchQuery, setSearchQuery] = useState("");

  // Resolving ticket state
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [selectedAction, setSelectedAction] = useState<
    "refund_deposit" | "compensate_craftsman" | "strike_vendor" | "close"
  >("close");
  const [adminNotes, setAdminNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter === "all" ? undefined : statusFilter;
      const data = await adminApi.listTickets(statusParam);
      setTickets(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticketNumber?.toLowerCase().includes(q) ||
      t.reason?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.orderId?.toLowerCase().includes(q)
    );
  });

  const handleOpenResolve = (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    setSelectedAction("close");
    setAdminNotes("");
  };

  const handleConfirmResolve = async () => {
    if (!activeTicket || !adminNotes.trim()) {
      alert("يرجى كتابة ملاحظات القرار والحل");
      return;
    }

    try {
      await adminApi.resolveTicket(activeTicket._id, selectedAction, adminNotes.trim());
      setShowConfirm(false);
      setActiveTicket(null);
      setAdminNotes("");
      fetchTickets();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل حل التذكرة");
    }
  };

  const actionLabels = {
    refund_deposit: "استرداد العربون للعميل وتسجيل حركة بالمحفظة",
    compensate_craftsman: "صرف تعويض مالي للفني (30 ج.م) في دفتر الأستاذ",
    strike_vendor: "تسجيل مخالفة وإنذار رسمي (Strike) ضد التاجر",
    close: "إغلاق التذكرة بدون إجراءات مالية إضافية",
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2421]">تذاكر الدعم والشكاوى الفنية</h1>
          <p className="text-xs text-[#5C6460]">
            إدارة البلاغات ومشاكل التركيب أو تسليم القطع والقرارات المالية والتأديبية
          </p>
        </div>
        <button
          onClick={fetchTickets}
          disabled={loading}
          className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث التذاكر</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#8A928D] ml-1">حالة التذكرة:</span>
          {[
            { id: "open", label: "مفتوحة" },
            { id: "in_progress", label: "قيد المتابعة" },
            { id: "resolved", label: "تم الحل" },
            { id: "closed", label: "مغلقة" },
            { id: "all", label: "جميع التذاكر" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === st.id
                  ? "bg-[#B8752E] text-white"
                  : "bg-[#FAF8F5] text-[#5C6460] hover:bg-[#DFDCD5]"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
          <input
            type="text"
            placeholder="بحث برقم التذكرة أو الطلب أو السبب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] placeholder-[#8A928D] focus:outline-none focus:border-[#B8752E]"
          />
        </div>
      </div>

      {/* Dense Tickets Table */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5C6460] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
            <p>جاري تحميل تذاكر الدعم...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5C6460]">
            لا توجد تذاكر تطابق معايير البحث الحالية.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                <tr>
                  <th className="py-3 px-4">رقم التذكرة</th>
                  <th className="py-3 px-4">مقدم البلاغ</th>
                  <th className="py-3 px-4">رقم الطلب المرتبط</th>
                  <th className="py-3 px-4">السبب والتفاصيل</th>
                  <th className="py-3 px-4">المرفقات</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">تاريخ الإنشاء</th>
                  <th className="py-3 px-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEAE4]">
                {filteredTickets.map((t) => (
                  <tr key={t._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#1F2421]">
                      {t.ticketNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#1F2421] block">
                        {t.userRole === "customer"
                          ? "عميل"
                          : t.userRole === "craftsman"
                          ? "فني تركيب"
                          : "تاجر قطع"}
                      </span>
                      <span className="text-[11px] text-[#8A928D] font-mono block">
                        {t.userId?.slice(-6)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {t.orderId ? (
                        <Link
                          href={`/orders/${t.orderId}`}
                          className="font-mono text-[#B8752E] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>{t.orderId.slice(-6)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-[#8A928D]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-bold text-[#1F2421] block truncate">{t.reason}</span>
                      <span className="text-[11px] text-[#5C6460] block line-clamp-1">
                        {t.description}
                      </span>
                      {t.adminNotes && (
                        <div className="mt-1 p-1 bg-[#FAF8F5] border border-[#DFDCD5] rounded text-[10px] text-[#3F6B58]">
                          <strong>ملاحظة الإدارة:</strong> {t.adminNotes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {t.photoUrl ? (
                        <button
                          onClick={() => setPreviewPhoto(t.photoUrl!)}
                          className="text-[#B8752E] hover:underline flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>معاينة الصورة</span>
                        </button>
                      ) : (
                        <span className="text-[#8A928D] text-[11px]">بدون</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          t.status === "resolved" || t.status === "closed"
                            ? "bg-[#EDF5F1] text-[#3F6B58]"
                            : t.status === "in_progress"
                            ? "bg-[#FBF4EC] text-[#B8752E]"
                            : "bg-[#FDF2F0] text-[#A8452F]"
                        }`}
                      >
                        {t.status === "open"
                          ? "جديدة"
                          : t.status === "in_progress"
                          ? "قيد المتابعة"
                          : t.status === "resolved"
                          ? "تم الحل"
                          : "مغلقة"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#8A928D] font-mono text-[11px]">
                      {new Date(t.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {t.status === "open" || t.status === "in_progress" ? (
                        <button
                          onClick={() => handleOpenResolve(t)}
                          className="px-2.5 py-1 bg-[#B8752E] hover:bg-[#9E6122] text-white font-bold rounded-lg text-[11px] flex items-center gap-1 mx-auto"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>اتخاذ قرار</span>
                        </button>
                      ) : (
                        <span className="text-[#8A928D] text-[11px]">مكتملة</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#1F2421]">
                  اتخاذ قرار بشأن التذكرة {activeTicket.ticketNumber}
                </h3>
                <p className="text-xs text-[#5C6460]">
                  السبب: {activeTicket.reason}
                </p>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5] text-xs space-y-1">
              <div className="text-[#5C6460]">
                <strong>وصف الشكوى:</strong> {activeTicket.description}
              </div>
              {activeTicket.orderId && (
                <div className="text-[#5C6460] font-mono">
                  <strong>الطلب المرتبط:</strong> {activeTicket.orderId}
                </div>
              )}
            </div>

            {/* Decision Action Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#1F2421]">
                نوع الإجراء المطلوب تنفيذه:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    id: "refund_deposit",
                    title: "استرداد العربون للعميل",
                    desc: "تحويل قيمة العربون إلى حساب العميل مع قيد المحفظة",
                    icon: DollarSign,
                    color: "text-[#3F6B58]",
                  },
                  {
                    id: "compensate_craftsman",
                    title: "تعويض الفني مالياً (30 ج.م)",
                    desc: "إضافة قيد تعويض للفني في دفتر الأستاذ لتغطية تكلفة الانتقال",
                    icon: Wrench,
                    color: "text-[#B8752E]",
                  },
                  {
                    id: "strike_vendor",
                    title: "تسجيل إنذار (Strike) على التاجر",
                    desc: "زيادة عداد المخالفات ضد التاجر بسبب قطعة غير مطابقة أو إخلال",
                    icon: ShieldAlert,
                    color: "text-[#A8452F]",
                  },
                  {
                    id: "close",
                    title: "إغلاق التذكرة بدون إجراءات مالية",
                    desc: "اعتبار المشكلة محلولة ودية أو غير مستحقة لأثر مالي",
                    icon: CheckCircle2,
                    color: "text-[#5C6460]",
                  },
                ].map((act) => {
                  const Icon = act.icon;
                  return (
                    <label
                      key={act.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedAction === act.id
                          ? "bg-[#FAF8F5] border-[#B8752E]"
                          : "border-[#DFDCD5] hover:bg-[#FAF8F5]/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="resolutionAction"
                        checked={selectedAction === act.id}
                        onChange={() => setSelectedAction(act.id as "refund_deposit" | "compensate_craftsman" | "strike_vendor" | "close")}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#1F2421]">
                          <Icon className={`w-3.5 h-3.5 ${act.color}`} />
                          <span>{act.title}</span>
                        </div>
                        <p className="text-[11px] text-[#5C6460] mt-0.5">{act.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Admin Resolution Note */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1F2421]">
                ملاحظات وتفاصيل القرار الإداري <span className="text-[#A8452F]">*</span>:
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="وضح أسباب القرار وتفاصيل الاتفاق مع الأطراف..."
                className="w-full p-2.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] placeholder-[#8A928D] focus:outline-none focus:border-[#B8752E]"
              />
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#DFDCD5]">
              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                className="flex-1 py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white text-[#5C6460] font-semibold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!adminNotes.trim()}
                onClick={() => setShowConfirm(true)}
                className="flex-1 py-2 px-3 bg-[#B8752E] hover:bg-[#9E6122] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                تنفيذ القرار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Dialog */}
      {showConfirm && activeTicket && (
        <ConfirmModal
          isOpen={true}
          title="تأكيد تنفيذ قرار التذكرة"
          message={`أنت على وشك تنفيذ: "${actionLabels[selectedAction]}". هل ترغب في المتابعة وكتابة السجل في سجل التدقيق؟`}
          confirmText="تأكيد التنفيذ"
          isDestructive={selectedAction === "strike_vendor" || selectedAction === "refund_deposit"}
          onConfirm={handleConfirmResolve}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden p-2">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 left-4 p-1.5 bg-black/60 hover:bg-black text-white rounded-full z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto}
              alt="صورة مرفقة بالبلاغ"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
