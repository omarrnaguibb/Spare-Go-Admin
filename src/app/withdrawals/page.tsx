"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  X,
  Send,
  Building,
  Smartphone,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { WithdrawalRequest } from "@/lib/types";

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Pay modal
  const [payTarget, setPayTarget] = useState<WithdrawalRequest | null>(null);
  const [payReference, setPayReference] = useState("");
  const [paying, setPaying] = useState(false);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<WithdrawalRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listWithdrawals({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      });
      setWithdrawals(data.withdrawals || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const filteredWithdrawals = useMemo(() => {
    if (!searchQuery) return withdrawals;
    const q = searchQuery.toLowerCase();
    return withdrawals.filter(
      (w) =>
        w.customerId?.name?.toLowerCase().includes(q) ||
        w.customerId?.phone?.includes(q) ||
        w.destinationHandle?.toLowerCase().includes(q) ||
        w.destinationAccountName?.toLowerCase().includes(q) ||
        w.reference?.toLowerCase().includes(q),
    );
  }, [withdrawals, searchQuery]);

  const handleOpenPay = (w: WithdrawalRequest) => {
    setPayTarget(w);
    setPayReference("");
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget || !payReference.trim()) {
      alert("الرقم المرجعي للتحويل مطلوب");
      return;
    }

    setPaying(true);
    try {
      await adminApi.payWithdrawal(payTarget._id, {
        reference: payReference.trim(),
      });
      setPayTarget(null);
      await fetchWithdrawals();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل تأكيد صرف طلب السحب");
    } finally {
      setPaying(false);
    }
  };

  const handleOpenReject = (w: WithdrawalRequest) => {
    setRejectTarget(w);
    setRejectNote("");
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget || !rejectNote.trim()) {
      alert("سبب الرفض مطلوب");
      return;
    }

    setRejecting(true);
    try {
      await adminApi.rejectWithdrawal(rejectTarget._id, {
        note: rejectNote.trim(),
      });
      setRejectTarget(null);
      await fetchWithdrawals();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل رفض طلب السحب");
    } finally {
      setRejecting(false);
    }
  };

  const getDestinationLabel = (type: string) => {
    switch (type) {
      case "instapay":
        return "إنستاباي IPA";
      case "vodafone_cash":
      case "orange_cash":
      case "etisalat_cash":
      case "we_pay":
        return "محفظة كاش";
      case "bank_account":
        return "حساب بنكي";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1F2421]">طلبات سحب واسترداد الرصيد</h1>
          <p className="text-xs text-[#5C6460]">
            مراجعة طلبات استرداد رصيد المحفظة المتاح للعملاء، وصرف التحويلات وتوثيق الأرقام المرجعية للبنك
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWithdrawals}
            disabled={loading}
            className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث ({total})</span>
          </button>
        </div>
      </div>

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
            قيد الانتظار
          </button>
          <button
            onClick={() => setStatusFilter("paid")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === "paid"
                ? "bg-[#1F2421] text-white"
                : "bg-[#FAF8F5] text-[#5C6460] hover:text-[#1F2421]"
            }`}
          >
            تم الصرف
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
            placeholder="بحث بالاسم أو الهاتف أو وجهة التحويل..."
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
            <p>جاري تحميل طلبات السحب...</p>
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5C6460]">
            لا توجد طلبات سحب مطابقة للشروط المحددة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                <tr>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">المبلغ المطلوب</th>
                  <th className="py-3 px-4">وجهة التحويل</th>
                  <th className="py-3 px-4">اسم المستلم والمعرف</th>
                  <th className="py-3 px-4">تاريخ الطلب</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">الرقم المرجعي للصرف</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEAE4]">
                {filteredWithdrawals.map((w) => (
                  <tr key={w._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#1F2421] block">
                        {w.customerId?.name || "عميل غير معروف"}
                      </span>
                      <span className="font-mono text-[11px] text-[#8A928D] block text-left" dir="ltr">
                        {w.customerId?.phone || "-"}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-bold text-base text-[#1F2421] num-tabular">
                      {w.amount} ج.م
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {w.destinationType === "bank_account" ? (
                          <Building className="w-3.5 h-3.5 text-[#B8752E]" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5 text-[#3F6B58]" />
                        )}
                        <span className="font-semibold text-[#1F2421]">
                          {getDestinationLabel(w.destinationType)}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {w.destinationAccountName && (
                        <span className="font-bold text-[#1F2421] block">
                          {w.destinationAccountName}
                        </span>
                      )}
                      <span className="font-mono text-[#B8752E] font-bold block text-left" dir="ltr">
                        {w.destinationHandle}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#8A928D] text-[11px]">
                      {new Date(w.createdAt).toLocaleDateString("ar-EG")}{" "}
                      <span className="text-[10px]">
                        {new Date(w.createdAt).toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          w.status === "paid"
                            ? "bg-[#EDF5F1] text-[#3F6B58]"
                            : w.status === "rejected"
                            ? "bg-[#FDF2F0] text-[#A8452F]"
                            : "bg-[#FBF4EC] text-[#B8752E]"
                        }`}
                      >
                        {w.status === "paid"
                          ? "تم الصرف بنجاح"
                          : w.status === "rejected"
                          ? "مرفوض"
                          : "قيد المراجعة والصرف"}
                      </span>
                      {w.reviewNote && (
                        <span className="text-[10px] text-[#8A928D] block max-w-xs truncate mt-0.5" title={w.reviewNote}>
                          سبب الرفض: {w.reviewNote}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[#5C6460]" dir="ltr">
                      {w.reference || "-"}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {w.status === "pending" ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenPay(w)}
                            className="py-1 px-2.5 bg-[#3F6B58] hover:bg-[#325646] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>تأكيد الصرف</span>
                          </button>
                          <button
                            onClick={() => handleOpenReject(w)}
                            className="py-1 px-2.5 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-[#FDF2F0] hover:text-[#A8452F] text-[#5C6460] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>رفض</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#8A928D]">
                          {w.reviewedBy?.name || "مكتمل"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay Modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EDF5F1] flex items-center justify-center text-[#3F6B58]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F2421]">تأكيد صرف وسداد طلب السحب</h3>
                  <p className="text-xs text-[#5C6460]">
                    العميل: {payTarget.customerId?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayTarget(null)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-4 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5] space-y-2">
                <div className="flex justify-between text-[#5C6460]">
                  <span>المبلغ المراد صرفه وخصمه:</span>
                  <span className="font-bold text-base text-[#1F2421] num-tabular">{payTarget.amount} ج.م</span>
                </div>
                <div className="flex justify-between text-[#5C6460]">
                  <span>جهة التحويل:</span>
                  <span className="font-bold text-[#1F2421]">{getDestinationLabel(payTarget.destinationType)}</span>
                </div>
                <div className="flex justify-between text-[#5C6460]">
                  <span>معرف الحساب / الرقم:</span>
                  <span className="font-mono font-bold text-[#B8752E]" dir="ltr">{payTarget.destinationHandle}</span>
                </div>
                {payTarget.destinationAccountName && (
                  <div className="flex justify-between text-[#5C6460]">
                    <span>اسم صاحب الحساب:</span>
                    <span className="font-bold text-[#1F2421]">{payTarget.destinationAccountName}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  الرقم المرجعي لعملية التحويل البنكي / إنستاباي <span className="text-[#A8452F]">*</span>:
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="مثال: REF-92837421"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl font-mono text-left text-sm text-[#1F2421] focus:outline-none focus:border-[#3F6B58]"
                />
                <span className="text-[10px] text-[#8A928D] block mt-1">
                  الرقم المرجعي إلزامي لتوثيق التحويل في سجلات الأستاذ العام وإرساله لإشعار العميل.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#DFDCD5]">
                <button
                  type="button"
                  onClick={() => setPayTarget(null)}
                  className="flex-1 py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white text-[#5C6460] font-semibold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={paying || !payReference.trim()}
                  className="flex-1 py-2 px-3 bg-[#3F6B58] hover:bg-[#325646] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  {paying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "تأكيد الصرف والخصم"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FDF2F0] flex items-center justify-center text-[#A8452F]">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F2421]">رفض طلب سحب الرصيد</h3>
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
                  سبب رفض طلب السحب <span className="text-[#A8452F]">*</span>:
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="مثال: رقم الحساب غير صحيح أو الحساب البنكي غير نشط..."
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
