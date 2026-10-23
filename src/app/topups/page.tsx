"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  ZoomIn,
  ZoomOut,
  X,
  RotateCcw,
  Check,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { TopUpRequest } from "@/lib/types";

export default function TopUpsPage() {
  const [topUps, setTopUps] = useState<TopUpRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [proofModalId, setProofModalId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Approve modal
  const [approveTarget, setApproveTarget] = useState<TopUpRequest | null>(null);
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [approveNote, setApproveNote] = useState<string>("");
  const [approving, setApproving] = useState(false);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<TopUpRequest | null>(null);
  const [rejectNote, setRejectNote] = useState<string>("");
  const [rejecting, setRejecting] = useState(false);

  const fetchTopUps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listTopUps({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      });
      setTopUps(data.topUps || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTopUps();
  }, [fetchTopUps]);

  // Duplicate reference detector
  const duplicateReferences = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of topUps) {
      if (t.transactionReference) {
        const ref = t.transactionReference.trim().toLowerCase();
        counts[ref] = (counts[ref] || 0) + 1;
      }
    }
    const duplicates = new Set<string>();
    for (const [ref, count] of Object.entries(counts)) {
      if (count > 1) duplicates.add(ref);
    }
    return duplicates;
  }, [topUps]);

  const filteredTopUps = useMemo(() => {
    if (!searchQuery) return topUps;
    const q = searchQuery.toLowerCase();
    return topUps.filter(
      (t) =>
        t.customerId?.name?.toLowerCase().includes(q) ||
        t.customerId?.phone?.includes(q) ||
        t.senderIdentifier?.toLowerCase().includes(q) ||
        t.transactionReference?.toLowerCase().includes(q) ||
        t.methodId?.label?.toLowerCase().includes(q),
    );
  }, [topUps, searchQuery]);

  const handleOpenApprove = (topUp: TopUpRequest) => {
    setApproveTarget(topUp);
    setApprovedAmount(topUp.amount);
    setApproveNote("");
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveTarget) return;

    setApproving(true);
    try {
      await adminApi.approveTopUp(approveTarget._id, {
        approvedAmount,
        note: approveNote || undefined,
      });
      setApproveTarget(null);
      await fetchTopUps();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل اعتماد طلب الشحن");
    } finally {
      setApproving(false);
    }
  };

  const handleOpenReject = (topUp: TopUpRequest) => {
    setRejectTarget(topUp);
    setRejectNote("");
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget || !rejectNote) {
      alert("يرجى كتابة سبب رفض الطلب");
      return;
    }

    setRejecting(true);
    try {
      await adminApi.rejectTopUp(rejectTarget._id, {
        note: rejectNote,
      });
      setRejectTarget(null);
      await fetchTopUps();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل رفض طلب الشحن");
    } finally {
      setRejecting(false);
    }
  };

  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    setNow(Date.now());
  }, [topUps]);

  const getSlaIndicator = (createdAt: string, status: string) => {
    if (!now || status !== "pending") return null;
    const diffHours = (now - new Date(createdAt).getTime()) / (1000 * 60 * 60);

    if (diffHours >= 24) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FDF2F0] text-[#A8452F] flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>تأخر &gt; 24 ساعة</span>
        </span>
      );
    }
    if (diffHours >= 2) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FBF4EC] text-[#B8752E] flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>تجاوز ساعتين</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] text-[#8A928D] flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>جديد ({Math.round(diffHours * 60)} د)</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1F2421]">طلبات شحن المحفظة (Top-ups)</h1>
          <p className="text-xs text-[#5C6460]">
            مراجعة وتدقيق إيصالات التحويل البنكي وإنستاباي، والتحقق من المبالغ واعتماد الإيداع الفوري في رصيد العميل
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTopUps}
            disabled={loading}
            className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث ({total})</span>
          </button>
        </div>
      </div>

      {/* Duplicate warning alert banner */}
      {duplicateReferences.size > 0 && (
        <div className="bg-[#FBF4EC] border border-[#B8752E]/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#B8752E] shrink-0 mt-0.5" />
          <div className="text-xs text-[#1F2421] leading-relaxed">
            <span className="font-bold text-[#B8752E] block mb-0.5">
              تنبيه رقابي: تم رصد أرقام مرجعية مكررة بين الطلبات المعروضة!
            </span>
            يُرجى فحص صورة الإيصال بدقة والتأكد من عدم استخدام نفس إيصال التحويل لأكثر من طلب شحن قبل الاعتماد.
          </div>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter("pending")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === "pending"
                ? "bg-[#1F2421] text-white"
                : "bg-[#FAF8F5] text-[#5C6460] hover:text-[#1F2421]"
            }`}
          >
            قيد المراجعة
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === "approved"
                ? "bg-[#1F2421] text-white"
                : "bg-[#FAF8F5] text-[#5C6460] hover:text-[#1F2421]"
            }`}
          >
            المعتمدة
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === "rejected"
                ? "bg-[#1F2421] text-white"
                : "bg-[#FAF8F5] text-[#5C6460] hover:text-[#1F2421]"
            }`}
          >
            المرفوضة
          </button>
          <button
            onClick={() => setStatusFilter("all")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === "all"
                ? "bg-[#1F2421] text-white"
                : "bg-[#FAF8F5] text-[#5C6460] hover:text-[#1F2421]"
            }`}
          >
            جميع الطلبات
          </button>
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
          <input
            type="text"
            placeholder="بحث بالعميل أو الهاتف أو الرقم المرجعي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] placeholder-[#8A928D] focus:outline-none focus:border-[#B8752E]"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5C6460] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
            <p>جاري تحميل طلبات الشحن...</p>
          </div>
        ) : filteredTopUps.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5C6460]">
            لا توجد طلبات شحن مطابقة للشروط المحددة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                <tr>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">وسيلة التحويل</th>
                  <th className="py-3 px-4">المبلغ</th>
                  <th className="py-3 px-4">حساب المرسل</th>
                  <th className="py-3 px-4">الرقم المرجعي</th>
                  <th className="py-3 px-4">الإيصال</th>
                  <th className="py-3 px-4">المهلة SLA</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEAE4]">
                {filteredTopUps.map((t) => {
                  const isDup =
                    t.transactionReference &&
                    duplicateReferences.has(t.transactionReference.trim().toLowerCase());

                  return (
                    <tr
                      key={t._id}
                      className={`hover:bg-[#FAF8F5]/80 transition-colors ${
                        isDup ? "bg-[#FFF9F5]" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#1F2421] block">
                          {t.customerId?.name || "عميل غير معروف"}
                        </span>
                        <span className="font-mono text-[11px] text-[#8A928D] block text-left" dir="ltr">
                          {t.customerId?.phone || "-"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#1F2421] block">
                          {t.methodId?.label || "طريقة دفع"}
                        </span>
                        <span className="text-[10px] text-[#8A928D] font-mono block text-left" dir="ltr">
                          {t.methodId?.accountHandle || "-"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-base text-[#1F2421] num-tabular block">
                          {t.amount} ج.م
                        </span>
                        {t.approvedAmount !== undefined && t.approvedAmount !== t.amount && (
                          <span className="text-[10px] text-[#3F6B58] font-bold block">
                            المعتمد: {t.approvedAmount} ج.م
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[#5C6460]" dir="ltr">
                        {t.senderIdentifier || "-"}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#1F2421]" dir="ltr">
                            {t.transactionReference}
                          </span>
                          {isDup && (
                            <span
                              className="px-1.5 py-0.2 bg-[#FDF2F0] text-[#A8452F] text-[9px] font-bold rounded"
                              title="الرقم المرجعي مكرر في طلب آخر!"
                            >
                              مكرر
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {t.proofUrl ? (
                          <button
                            onClick={() => {
                              setProofModalId(t._id);
                              setZoomLevel(1);
                            }}
                            className="py-1 px-2.5 bg-[#FAF8F5] border border-[#DFDCD5] hover:border-[#B8752E] rounded-lg text-[11px] font-bold text-[#1F2421] inline-flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#B8752E]" />
                            <span>معاينة</span>
                          </button>
                        ) : (
                          <span className="text-[#8A928D] text-[11px]">بدون إيصال</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {getSlaIndicator(t.createdAt, t.status)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === "approved"
                              ? "bg-[#EDF5F1] text-[#3F6B58]"
                              : t.status === "rejected"
                              ? "bg-[#FDF2F0] text-[#A8452F]"
                              : t.status === "expired"
                              ? "bg-[#FAF8F5] text-[#8A928D]"
                              : "bg-[#FBF4EC] text-[#B8752E]"
                          }`}
                        >
                          {t.status === "approved"
                            ? "تم الاعتماد"
                            : t.status === "rejected"
                            ? "مرفوض"
                            : t.status === "expired"
                            ? "منتهي الصلاحية"
                            : "قيد التدقيق"}
                        </span>
                        {t.reviewNote && (
                          <span className="text-[10px] text-[#8A928D] block max-w-xs truncate mt-0.5" title={t.reviewNote}>
                            ملاحظة: {t.reviewNote}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {t.status === "pending" ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenApprove(t)}
                              className="py-1 px-2.5 bg-[#3F6B58] hover:bg-[#325646] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>اعتماد</span>
                            </button>
                            <button
                              onClick={() => handleOpenReject(t)}
                              className="py-1 px-2.5 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-[#FDF2F0] hover:text-[#A8452F] text-[#5C6460] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>رفض</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#8A928D]">
                            {t.reviewedBy?.name || "مكتمل"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proof Image Viewer Modal with Zoom */}
      {proofModalId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-2xl rounded-2xl border border-[#DFDCD5] shadow-2xl p-4 space-y-3 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#1F2421]">معاينة صورة إيصال التحويل</span>
                <span className="text-xs text-[#8A928D] font-mono">#{proofModalId}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                  className="p-1.5 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white rounded-lg text-[#1F2421]"
                  title="تكبير"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                  className="p-1.5 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white rounded-lg text-[#1F2421]"
                  title="تصغير"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white rounded-lg text-[#1F2421]"
                  title="إعادة ضبط"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setProofModalId(null)}
                  className="p-1.5 text-[#8A928D] hover:text-[#1F2421] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image viewport */}
            <div className="flex-1 overflow-auto bg-[#1F2421]/5 rounded-xl border border-[#DFDCD5] p-2 flex items-center justify-center min-h-[350px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/backend/admin/topups/${proofModalId}/proof`}
                alt="إيصال التحويل"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                className="max-h-[60vh] object-contain transition-transform duration-150 rounded"
              />
            </div>

            <div className="text-center text-[11px] text-[#8A928D]">
              يمكنك استخدام زري التكبير والتصغير لفحص تفاصيل الحساب والتاريخ والرقم المرجعي على الإيصال.
            </div>
          </div>
        </div>
      )}

      {/* Approve TopUp Modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EDF5F1] flex items-center justify-center text-[#3F6B58]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F2421]">اعتماد طلب شحن الرصيد</h3>
                  <p className="text-xs text-[#5C6460]">
                    العميل: {approveTarget.customerId?.name} ({approveTarget.customerId?.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApproveTarget(null)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmApprove} className="space-y-4 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5] space-y-1.5">
                <div className="flex justify-between text-[#5C6460]">
                  <span>المبلغ المطالب به من العميل:</span>
                  <span className="font-bold text-[#1F2421] font-mono">{approveTarget.amount} ج.م</span>
                </div>
                <div className="flex justify-between text-[#5C6460]">
                  <span>الرقم المرجعي:</span>
                  <span className="font-bold text-[#B8752E] font-mono" dir="ltr">{approveTarget.transactionReference}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  المبلغ المعتمد للإيداع في المحفظة (ج.م) <span className="text-[#A8452F]">*</span>:
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl font-bold text-base text-[#1F2421] focus:outline-none focus:border-[#3F6B58]"
                />
                <span className="text-[10px] text-[#8A928D] block mt-1">
                  يمكن تعديل المبلغ إذا تبين من الإيصال تحويل مبلغ مختلف عن القيمة المطلوبة.
                </span>
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  ملاحظة الاعتماد (اختيارية):
                </label>
                <input
                  type="text"
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  placeholder="مثال: تم التأكد من الإيداع عبر InstaPay"
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#3F6B58]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#DFDCD5]">
                <button
                  type="button"
                  onClick={() => setApproveTarget(null)}
                  className="flex-1 py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white text-[#5C6460] font-semibold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={approving || approvedAmount <= 0}
                  className="flex-1 py-2 px-3 bg-[#3F6B58] hover:bg-[#325646] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  {approving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "تأكيد الإيداع الفوري"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject TopUp Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FDF2F0] flex items-center justify-center text-[#A8452F]">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F2421]">رفض طلب شحن الرصيد</h3>
                  <p className="text-xs text-[#5C6460]">
                    العميل: {rejectTarget.customerId?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectTarget(null)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  سبب الرفض (إلزامي للعميل والتدقيق) <span className="text-[#A8452F]">*</span>:
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="مثال: الإيصال غير واضح، أو لم يتم استلام التحويل في الحساب البنكي، أو رقم مرجعي مكرر..."
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#A8452F]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#DFDCD5]">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="flex-1 py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white text-[#5C6460] font-semibold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={rejecting || !rejectNote.trim()}
                  className="flex-1 py-2 px-3 bg-[#A8452F] hover:bg-[#8D3723] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  {rejecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "تأكيد رفض الطلب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
