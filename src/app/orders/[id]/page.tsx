"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Car,
  Store,
  Wrench,
  User,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Unlock,
  DollarSign,
  Receipt,
  FileText,
  RefreshCw,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { AdminOrder, LedgerEntry, AdminVendor } from "@/lib/types";
import { getDepositStatusMeta } from "@/lib/deposit-status";
import { ConfirmModal } from "@/components/confirm-modal";

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin Action States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState("");

  const [showDepositModal, setShowDepositModal] = useState<"mark_paid" | "mark_refunded" | null>(null);
  const [depositReference, setDepositReference] = useState("");

  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderRes, vendorsRes] = await Promise.all([
        adminApi.getOrderDetails(id),
        adminApi.listVendors("approved"),
      ]);
      setOrder(orderRes.order);
      setLedgerEntries(orderRes.ledgerEntries || []);
      setVendors(vendorsRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل تحميل تفاصيل الطلب.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Action Handlers
  const handleCancelOrder = async () => {
    if (!cancelReason) return;
    try {
      await adminApi.cancelOrder(id, cancelReason);
      setShowCancelModal(false);
      setCancelReason("");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل إلغاء الطلب");
    }
  };

  const handleReassignVendor = async () => {
    if (!selectedVendorId) return;
    try {
      await adminApi.reassignOrderVendor(id, selectedVendorId);
      setShowReassignModal(false);
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل إعادة تعيين التاجر");
    }
  };

  const handleUnlockCompletion = async () => {
    try {
      await adminApi.unlockOrderCompletion(id);
      setShowUnlockModal(false);
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل فتح قفل الرمز");
    }
  };

  const handleUpdateDeposit = async () => {
    if (!showDepositModal) return;
    try {
      await adminApi.updateOrderDeposit(id, showDepositModal, undefined, depositReference);
      setShowDepositModal(null);
      setDepositReference("");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل تحديث العربون");
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await adminApi.addOrderNote(id, noteText);
      setNoteText("");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل إضافة الملاحظة");
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[#5C6460] space-y-2">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#B8752E]" />
        <p>جاري تحميل تفاصيل الطلب والقيود المالية...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 bg-white border border-[#DFDCD5] rounded-2xl text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-[#A8452F] mx-auto" />
        <h2 className="font-bold text-sm text-[#1F2421]">{error || "الطلب غير موجود"}</h2>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#B8752E] text-white rounded-xl text-xs font-bold"
        >
          <span>العودة للوحة الطلبات</span>
        </Link>
      </div>
    );
  }

  const primaryItem = order.items?.[0];

  return (
    <div className="space-y-5 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-[#5C6460] hover:text-[#1F2421]"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#1F2421]">
                طلب #{order.orderNumber || order._id.slice(-6).toUpperCase()}
              </h1>
              <span className="px-2.5 py-1 bg-[#FAF8F5] border border-[#DFDCD5] text-xs font-bold rounded-lg">
                {order.status}
              </span>
              {order.isFlagged && (
                <span className="px-2.5 py-1 bg-[#FDF2F0] text-[#A8452F] text-xs font-bold rounded-lg border border-[#A8452F]/30 animate-pulse">
                  طلب متوقف
                </span>
              )}
              {order.completionLocked && (
                <span className="px-2.5 py-1 bg-[#FDF2F0] text-[#A8452F] text-xs font-bold rounded-lg border border-[#A8452F]/30 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>رمز مغلق (٦ محاولات)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#5C6460] mt-0.5">
              تاريخ الإنشاء: {new Date(order.createdAt).toLocaleString("ar-EG")}
            </p>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center gap-2">
          {order.completionLocked && (
            <button
              onClick={() => setShowUnlockModal(true)}
              className="py-2 px-3 bg-[#3F6B58] text-white hover:bg-[#345949] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>فك قفل الرمز</span>
            </button>
          )}

          <button
            onClick={() => setShowReassignModal(true)}
            className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
          >
            <Store className="w-3.5 h-3.5 text-[#B8752E]" />
            <span>إعادة تعيين تاجر</span>
          </button>

          {order.status !== "cancelled" && order.status !== "delivered" && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="py-2 px-3 bg-white border border-[#A8452F] hover:bg-[#FDF2F0] text-[#A8452F] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>إلغاء الطلب</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Info + Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Details (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Car & Part Card */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-[#1F2421] border-b border-[#DFDCD5] pb-2 flex items-center gap-2">
              <Car className="w-4 h-4 text-[#B8752E]" />
              <span>بيانات السيارة والقطعة</span>
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#8A928D] block">السيارة:</span>
                <span className="font-bold text-[#1F2421] text-sm">
                  {order.carBrand} {order.carModel} ({order.carYear})
                </span>
              </div>
              <div>
                <span className="text-[#8A928D] block">نوع الطلب:</span>
                <span className="font-bold text-[#1F2421]">
                  {order.orderType === "with_craftsman"
                    ? `مع فني تركيب (${order.craftsmanType || "ميكانيكي"})`
                    : "قطع غيار فقط (استلام من المحل)"}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[#1F2421]">{primaryItem?.title}</p>
                <p className="text-[#5C6460] mt-0.5">
                  الكمية: {primaryItem?.quantity || 1} {primaryItem?.partNumber ? `| كود: ${primaryItem.partNumber}` : ""}
                </p>
              </div>
              <div className="text-left font-bold text-[#B8752E] text-sm num-tabular">
                سعر القطعة: {order.partPrice} ج.م
              </div>
            </div>
          </div>

          {/* Parties: Customer, Vendor, Craftsman */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-[#1F2421] border-b border-[#DFDCD5] pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-[#B8752E]" />
              <span>الأطراف المشاركة في الطلب</span>
            </h2>

            <div className="grid grid-cols-3 gap-4 text-xs">
              {/* Customer */}
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5] space-y-1">
                <span className="font-bold text-[#1F2421] block">العميل:</span>
                <p className="font-semibold text-[#1F2421]">{order.customerName || "عميل سبير جو"}</p>
                <p className="font-mono text-[11px] text-[#5C6460]" dir="ltr">{order.customerPhone}</p>
                <p className="text-[11px] text-[#8A928D]">{order.deliveryAddress || order.deliveryArea || "بنها"}</p>
              </div>

              {/* Vendor */}
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5] space-y-1">
                <span className="font-bold text-[#1F2421] block">التاجر / المحل:</span>
                <p className="font-semibold text-[#1F2421]">{order.shop?.name || "المحل"}</p>
                <p className="font-mono text-[11px] text-[#5C6460]" dir="ltr">{order.shop?.phone || "—"}</p>
                <p className="text-[11px] text-[#8A928D]">{order.shop?.area || "بنها"}</p>
                <p className="text-[10px] text-[#3F6B58] font-bold">
                  {order.handoverConfirmedAt ? "✓ تأكد تسليم القطعة" : "لم يؤكد التسليم بعد"}
                </p>
              </div>

              {/* Craftsman */}
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5] space-y-1">
                <span className="font-bold text-[#1F2421] block">فني التركيب:</span>
                <p className="font-semibold text-[#1F2421]">
                  {order.craftsmanId ? "تم تعيين فني معتمد" : "لم يعيّن بعد"}
                </p>
                <p className="text-[11px] text-[#5C6460]">
                  أجر التركيب: <strong className="text-[#3F6B58] num-tabular">{order.laborPrice || 0} ج.م</strong>
                </p>
                <p className="text-[10px] text-[#8A928D]">
                  عروض مقدمة: {order.quotes?.length || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Craftsman Quotes Table */}
          {order.quotes && order.quotes.length > 0 && (
            <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-3">
              <h2 className="font-bold text-sm text-[#1F2421] flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#B8752E]" />
                <span>عروض الأسعار المقدمة من الفنيين ({order.quotes.length})</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460]">
                    <tr>
                      <th className="py-2.5 px-3">اسم الفني / الورشة</th>
                      <th className="py-2.5 px-3">التقييم</th>
                      <th className="py-2.5 px-3">أجر التركيب</th>
                      <th className="py-2.5 px-3">وقت الوصول</th>
                      <th className="py-2.5 px-3">ملاحظة الفني</th>
                      <th className="py-2.5 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEAE4]">
                    {order.quotes.map((q, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-semibold text-[#1F2421]">
                          {q.craftsmanName} ({q.workshopName})
                        </td>
                        <td className="py-2.5 px-3 num-tabular">
                          {q.rating ? `★ ${q.rating}` : "جديد"}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#B8752E] num-tabular">
                          {q.laborPrice} ج.م
                        </td>
                        <td className="py-2.5 px-3 text-[#5C6460]">{q.estimatedArrival}</td>
                        <td className="py-2.5 px-3 text-[#5C6460]">{q.note || "—"}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              q.status === "accepted"
                                ? "bg-[#EDF5F1] text-[#3F6B58]"
                                : q.status === "rejected"
                                ? "bg-[#FDF2F0] text-[#A8452F]"
                                : "bg-[#FAF8F5] text-[#5C6460]"
                            }`}
                          >
                            {q.status === "accepted" ? "مقبول" : q.status === "rejected" ? "مرفوض" : "بانتظار الاختيار"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Part Defect / Mismatch Reports */}
          {order.partIssues && order.partIssues.length > 0 && (
            <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-3">
              <h2 className="font-bold text-sm text-[#A8452F] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#A8452F]" />
                <span>تقارير عدم مطابقة أو عيوب القطعة ({order.partIssues.length})</span>
              </h2>

              <div className="space-y-3">
                {order.partIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#FDF2F0]/50 border border-[#A8452F]/30 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-[#A8452F]">
                      <span>السبب: {issue.reason}</span>
                      <span className="text-[11px] text-[#5C6460]">
                        {new Date(issue.reportedAt).toLocaleString("ar-EG")}
                      </span>
                    </div>
                    {issue.notes && <p className="text-[#1F2421]">{issue.notes}</p>}
                    {issue.photoUrl && (
                      <div className="pt-2">
                        <a
                          href={issue.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#DFDCD5] rounded-lg text-xs font-bold text-[#B8752E] hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>عرض صورة الفحص المرفوعة</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ledger Entries for Order */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-3">
            <h2 className="font-bold text-sm text-[#1F2421] flex items-center gap-2 border-b border-[#DFDCD5] pb-2">
              <Receipt className="w-4 h-4 text-[#B8752E]" />
              <span>القيود المالية في دفتر الأستاذ للطلب ({ledgerEntries.length})</span>
            </h2>

            {ledgerEntries.length === 0 ? (
              <p className="text-xs text-[#8A928D]">لا توجد قيود مسجلة بعد لهذا الطلب.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460]">
                    <tr>
                      <th className="py-2 px-3">نوع القيد</th>
                      <th className="py-2 px-3">الطرف</th>
                      <th className="py-2 px-3">المبلغ</th>
                      <th className="py-2 px-3">المرجع والتفاصيل</th>
                      <th className="py-2 px-3">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEAE4]">
                    {ledgerEntries.map((e) => (
                      <tr key={e._id}>
                        <td className="py-2 px-3 font-semibold text-[#1F2421]">{e.type}</td>
                        <td className="py-2 px-3 text-[#5C6460]">{e.partyType}</td>
                        <td className="py-2 px-3 font-bold text-[#B8752E] num-tabular">
                          {e.amount} ج.م
                        </td>
                        <td className="py-2 px-3 text-[#5C6460]">{e.reference || "—"}</td>
                        <td className="py-2 px-3 text-[11px] text-[#8A928D]">
                          {new Date(e.createdAt).toLocaleTimeString("ar-EG")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Financials & Admin Notes (1 Col) */}
        <div className="space-y-5">
          {/* Financial Breakdown Card */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-sm text-[#1F2421] border-b border-[#DFDCD5] pb-2 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#3F6B58]" />
              <span>التوزيع المالي للطلب</span>
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-[#5C6460]">
                <span>سعر القطعة (المحل):</span>
                <span className="font-bold num-tabular">{order.partPrice} ج.م</span>
              </div>
              <div className="flex justify-between text-[#5C6460]">
                <span>أجر التركيب:</span>
                <span className="font-bold num-tabular">+{order.laborPrice || 0} ج.م</span>
              </div>
              <div className="flex justify-between font-bold text-[#1F2421] pt-1 border-t border-[#DFDCD5]">
                <span>إجمالي الطلب:</span>
                <span className="num-tabular text-sm text-[#B8752E]">{order.totalPrice} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-[#5C6460]">
                <span>العربون المطلوب:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold num-tabular">{order.depositAmount} ج.م</span>
                  {(() => {
                    const meta = getDepositStatusMeta(order.depositStatus);
                    if (!meta) return null;
                    return (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}>
                        {meta.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className="flex justify-between font-bold text-[#3F6B58] bg-[#EDF5F1] p-2 rounded-lg">
                <span>المتبقي كاش عند التسليم:</span>
                <span className="num-tabular text-sm">{order.cashOnDelivery} ج.م</span>
              </div>
            </div>

            {/* Deposit Actions */}
            <div className="pt-2 border-t border-[#DFDCD5] space-y-2">
              <span className="text-[11px] text-[#8A928D] block">إدارة العربون:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal("mark_paid")}
                  className="py-1.5 px-2 bg-white border border-[#3F6B58] text-[#3F6B58] hover:bg-[#EDF5F1] rounded-lg text-xs font-bold"
                >
                  تأكيد سداد العربون
                </button>
                <button
                  type="button"
                  onClick={() => setShowDepositModal("mark_refunded")}
                  className="py-1.5 px-2 bg-white border border-[#A8452F] text-[#A8452F] hover:bg-[#FDF2F0] rounded-lg text-xs font-bold"
                >
                  تسجيل استرداد
                </button>
              </div>
            </div>
          </div>

          {/* Admin Notes Section */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-sm text-[#1F2421] border-b border-[#DFDCD5] pb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#B8752E]" />
              <span>ملاحظات المشرفين والرقابة</span>
            </h3>

            {order.adminNotes ? (
              <div className="p-3 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl font-mono text-[11px] text-[#1F2421] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {order.adminNotes}
              </div>
            ) : (
              <p className="text-[#8A928D] text-[11px]">لا توجد ملاحظات إدارية مدونة حتى الآن.</p>
            )}

            <form onSubmit={handleAddNote} className="space-y-2 pt-2">
              <textarea
                rows={2}
                placeholder="أضف ملاحظة إدارية موثقة بسجل الرقابة..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full p-2.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs outline-none focus:border-[#B8752E]"
              />
              <button
                type="submit"
                disabled={addingNote || !noteText.trim()}
                className="w-full py-2 bg-[#B8752E] hover:bg-[#9E6122] disabled:opacity-50 text-white font-bold rounded-xl text-xs"
              >
                {addingNote ? "جاري الإضافة..." : "تسجيل ملاحظة في الطلب"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      {/* 1. Cancel Modal */}
      {showCancelModal && (
        <ConfirmModal
          isOpen={true}
          title="تأكيد إلغاء الطلب من الإدارة"
          message={`هل أنت متأكد من إلغاء الطلب #${order.orderNumber || order._id}؟ إذا كان العربون مدفوعًا فسيتم توجيه استرداده تلقائيًا.`}
          confirmText="إلغاء الطلب فوراً"
          isDestructive={true}
          onConfirm={handleCancelOrder}
          onCancel={() => setShowCancelModal(false)}
        />
      )}

      {/* 2. Reassign Vendor Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-[#DFDCD5] p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-[#1F2421]">إعادة تعيين تاجر بديل للطلب</h3>
            <p className="text-xs text-[#5C6460]">اختر التاجر المعتمد الجديد لتوجيه الطلب إليه:</p>

            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full p-2.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs font-semibold"
            >
              <option value="">اختر التاجر...</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.storeName || v.name} ({v.area || "بنها"})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 pt-2 border-t border-[#DFDCD5]">
              <button
                onClick={() => setShowReassignModal(false)}
                className="flex-1 py-2 bg-[#FAF8F5] text-[#5C6460] font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                disabled={!selectedVendorId}
                onClick={handleReassignVendor}
                className="flex-1 py-2 bg-[#B8752E] text-white font-bold rounded-xl text-xs"
              >
                تأكيد التعيين
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Unlock Code Modal */}
      {showUnlockModal && (
        <ConfirmModal
          isOpen={true}
          title="فك قفل رمز التأكيد"
          message="هل تريد تصفير عداد المحاولات الخاطئة وفتح القفل للسماح للفني بإدخال رمز التأكيد مجدداً؟"
          confirmText="فك القفل الآن"
          onConfirm={handleUnlockCompletion}
          onCancel={() => setShowUnlockModal(false)}
        />
      )}

      {/* 4. Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-[#DFDCD5] p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-[#1F2421]">
              {showDepositModal === "mark_paid" ? "تأكيد سداد العربون يدوياً" : "تسجيل استرداد العربون"}
            </h3>
            <p className="text-xs text-[#5C6460]">
              المبلغ: <strong className="text-[#B8752E]">{order.depositAmount} ج.م</strong>
            </p>

            <div>
              <label className="block text-xs text-[#5C6460] mb-1">الرقم المرجعي أو إيصال التحويل:</label>
              <input
                type="text"
                placeholder="مثال: تحويل محفظة فودافون كاش #1234"
                value={depositReference}
                onChange={(e) => setDepositReference(e.target.value)}
                className="w-full p-2.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#DFDCD5]">
              <button
                onClick={() => setShowDepositModal(null)}
                className="flex-1 py-2 bg-[#FAF8F5] text-[#5C6460] font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleUpdateDeposit}
                className="flex-1 py-2 bg-[#3F6B58] text-white font-bold rounded-xl text-xs"
              >
                تأكيد العملية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
