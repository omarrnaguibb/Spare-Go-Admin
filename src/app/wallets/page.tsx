"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Wallet,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Unlock,
  AlertTriangle,
  X,
  ExternalLink,
  History,
  ShieldCheck,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { WalletItem, WalletDetail } from "@/lib/types";

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [phoneSearch, setPhoneSearch] = useState("");

  // Detail drawer / modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WalletDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Manual Adjustment Modal
  const [adjustTargetCustomer, setAdjustTargetCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
    available: number;
  } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(50);
  const [adjustDirection, setAdjustDirection] = useState<"credit" | "debit">("credit");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.searchWallets({
        phone: phoneSearch ? phoneSearch.trim() : undefined,
        limit: 50,
      });
      setWallets(data.wallets || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [phoneSearch]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const fetchDetail = useCallback(async (customerId: string) => {
    setLoadingDetail(true);
    try {
      const data = await adminApi.getWalletDetails(customerId);
      setDetail(data);
    } catch {
      alert("فشل تحميل تفاصيل المحفظة");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    fetchDetail(customerId);
  };

  const handleOpenAdjust = (
    customerId: string,
    name: string,
    phone: string,
    available: number,
  ) => {
    setAdjustTargetCustomer({ id: customerId, name, phone, available });
    setAdjustAmount(50);
    setAdjustDirection("credit");
    setAdjustReason("");
  };

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetCustomer || !adjustReason.trim() || adjustAmount <= 0) {
      alert("يرجى ملء جميع الحقول المطلوبة ومبلغ موجب");
      return;
    }

    setAdjusting(true);
    try {
      await adminApi.adjustWallet(adjustTargetCustomer.id, {
        amount: adjustAmount,
        direction: adjustDirection,
        reason: adjustReason.trim(),
      });
      alert("تم تعديل رصيد المحفظة وتوثيق الحركة بنجاح");
      const currentId = adjustTargetCustomer.id;
      setAdjustTargetCustomer(null);
      await fetchWallets();
      if (selectedCustomerId === currentId) {
        await fetchDetail(currentId);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل تعديل رصيد المحفظة");
    } finally {
      setAdjusting(false);
    }
  };

  const getEntryBadge = (type: string, bucket: string, amount: number) => {
    switch (type) {
      case "topup_approved":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF5F1] text-[#3F6B58] inline-flex items-center gap-1">
            <ArrowDownLeft className="w-3 h-3" />
            <span>شحن معتمد</span>
          </span>
        );
      case "deposit_hold":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF4EC] text-[#B8752E] inline-flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>حجز عربون</span>
          </span>
        );
      case "deposit_release":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF5F1] text-[#3F6B58] inline-flex items-center gap-1">
            <Unlock className="w-3 h-3" />
            <span>فك حجز عربون</span>
          </span>
        );
      case "deposit_capture":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#5C6460] inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>تسوية عربون</span>
          </span>
        );
      case "deposit_forfeit":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF2F0] text-[#A8452F] inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>مصادرة كتعويض</span>
          </span>
        );
      case "withdrawal_paid":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF2F0] text-[#A8452F] inline-flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>سحب منصرف</span>
          </span>
        );
      case "admin_adjustment":
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
            amount >= 0 ? "bg-[#EDF5F1] text-[#3F6B58]" : "bg-[#FDF2F0] text-[#A8452F]"
          }`}>
            <SlidersHorizontal className="w-3 h-3" />
            <span>تعديل يدوي</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#5C6460]">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1F2421]">محافظ العملاء وحركات الأرصدة</h1>
          <p className="text-xs text-[#5C6460]">
            فحص محافظ العملاء المسجلين، الرصيد المتاح والمحجوز كعربون، وسجل الحركات المحاسبي لكل عميل
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWallets}
            disabled={loading}
            className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث ({total})</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-[#1F2421]">
          <Wallet className="w-4 h-4 text-[#B8752E]" />
          <span>إجمالي المحافظ النشطة: {total} محفظة</span>
        </div>

        {/* Search */}
        <div className="relative w-80">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
          <input
            type="text"
            placeholder="بحث برقم هاتف العميل (010XXXXXXXX)..."
            value={phoneSearch}
            onChange={(e) => setPhoneSearch(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] placeholder-[#8A928D] focus:outline-none focus:border-[#B8752E]"
          />
        </div>
      </div>

      {/* Main Grid: List + Detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Wallets Table */}
        <div className={`${selectedCustomerId ? "lg:col-span-7" : "lg:col-span-12"} bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden transition-all`}>
          {loading ? (
            <div className="p-12 text-center text-xs text-[#5C6460] space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
              <p>جاري تحميل محافظ العملاء...</p>
            </div>
          ) : wallets.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#5C6460]">
              لم يتم العثور على أي محافظ عملاء مطابقة للبحث.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                  <tr>
                    <th className="py-3 px-4">العميل</th>
                    <th className="py-3 px-4">الرصيد المتاح</th>
                    <th className="py-3 px-4">العربون المحجوز</th>
                    <th className="py-3 px-4">إجمالي الالتزام</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4]">
                  {wallets.map((w) => {
                    const custObj =
                      typeof w.customerId === "object" ? w.customerId : null;
                    const custId = custObj ? custObj._id : (w.customerId as string);
                    const custName = custObj?.name || "عميل مسجل";
                    const custPhone = custObj?.phone || "-";
                    const isSelected = selectedCustomerId === custId;

                    return (
                      <tr
                        key={w._id}
                        className={`hover:bg-[#FAF8F5]/80 transition-colors cursor-pointer ${
                          isSelected ? "bg-[#FAF8F5] border-r-4 border-r-[#B8752E]" : ""
                        }`}
                        onClick={() => handleSelectCustomer(custId)}
                      >
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#1F2421] block">
                            {custName}
                          </span>
                          <span className="font-mono text-[11px] text-[#8A928D] block text-left" dir="ltr">
                            {custPhone}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-bold text-sm text-[#3F6B58] num-tabular">
                          {w.available} ج.م
                        </td>

                        <td className="py-3 px-4 font-bold text-sm text-[#B8752E] num-tabular">
                          {w.held} ج.م
                        </td>

                        <td className="py-3 px-4 font-bold text-sm text-[#1F2421] num-tabular">
                          {w.available + w.held} ج.م
                        </td>

                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleSelectCustomer(custId)}
                              className="py-1 px-2.5 bg-[#FAF8F5] border border-[#DFDCD5] hover:border-[#B8752E] rounded-lg text-[11px] font-bold text-[#1F2421] inline-flex items-center gap-1 transition-colors"
                            >
                              <History className="w-3.5 h-3.5 text-[#B8752E]" />
                              <span>السجل</span>
                            </button>
                            <button
                              onClick={() =>
                                handleOpenAdjust(
                                  custId,
                                  custName,
                                  custPhone,
                                  w.available,
                                )
                              }
                              className="py-1 px-2.5 bg-[#1F2421] hover:bg-[#2b332e] text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors shadow-xs"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                              <span>تعديل يدوي</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Wallet Detail Panel */}
        {selectedCustomerId && (
          <div className="lg:col-span-5 bg-white border border-[#DFDCD5] rounded-2xl shadow-xs p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#DFDCD5] flex items-center justify-center text-[#B8752E]">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F2421]">تفاصيل المحفظة والسجل</h3>
                  <p className="text-xs text-[#5C6460]">
                    {detail?.customer.name || "جاري التحميل..."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDetail || !detail ? (
              <div className="p-8 text-center text-xs text-[#5C6460] space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#B8752E]" />
                <p>جاري تحميل سجل المعاملات...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Balance Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                    <span className="text-[11px] text-[#8A928D] block">الرصيد المتاح للصرف</span>
                    <span className="text-lg font-bold text-[#3F6B58] num-tabular">
                      {detail.wallet.available} ج.م
                    </span>
                  </div>
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                    <span className="text-[11px] text-[#8A928D] block">العربون المحجوز للطلبات</span>
                    <span className="text-lg font-bold text-[#B8752E] num-tabular">
                      {detail.wallet.held} ج.م
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-[#FAF8F5] p-3 rounded-xl border border-[#DFDCD5]">
                  <div>
                    <span className="text-[11px] text-[#8A928D] block">رقم هاتف العميل</span>
                    <span className="font-mono font-bold text-[#1F2421]" dir="ltr">
                      {detail.customer.phone}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleOpenAdjust(
                        detail.customer._id,
                        detail.customer.name,
                        detail.customer.phone,
                        detail.wallet.available,
                      )
                    }
                    className="py-1.5 px-3 bg-[#1F2421] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>تعديل يدوي</span>
                  </button>
                </div>

                {/* Ledger Entries List */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-[#1F2421] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#B8752E]" />
                    <span>سجل حركات المحفظة (أحدث 50 حركة)</span>
                  </h4>

                  {detail.entries.length === 0 ? (
                    <div className="p-6 text-center text-[#8A928D] bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                      لا توجد أي حركات مالية مسجلة لهذه المحفظة بعد.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detail.entries.map((entry) => (
                        <div
                          key={entry._id}
                          className="p-3 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl space-y-1.5 hover:border-[#B8752E]/50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            {getEntryBadge(entry.type, entry.bucket, entry.amount)}
                            <span
                              className={`font-mono font-bold text-sm num-tabular ${
                                entry.amount > 0
                                  ? "text-[#3F6B58]"
                                  : entry.amount < 0
                                  ? "text-[#A8452F]"
                                  : "text-[#1F2421]"
                              }`}
                              dir="ltr"
                            >
                              {entry.amount > 0 ? `+${entry.amount}` : entry.amount} ج.م
                            </span>
                          </div>

                          {entry.note && (
                            <p className="text-[11px] text-[#5C6460] leading-relaxed">
                              {entry.note}
                            </p>
                          )}

                          <div className="flex justify-between items-center text-[10px] text-[#8A928D] pt-1 border-t border-[#ECEAE4]">
                            <span>
                              {new Date(entry.createdAt).toLocaleDateString("ar-EG")}{" "}
                              {new Date(entry.createdAt).toLocaleTimeString("ar-EG", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            {entry.orderId && (
                              <Link
                                href={`/orders/${entry.orderId}`}
                                className="text-[#B8752E] hover:underline flex items-center gap-0.5 font-bold"
                              >
                                <span>عرض الطلب</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Adjustment Modal */}
      {adjustTargetCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#DFDCD5] flex items-center justify-center text-[#B8752E]">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F2421]">تعديل رصيد المحفظة يدوياً</h3>
                  <p className="text-xs text-[#5C6460]">
                    العميل: {adjustTargetCustomer.name} ({adjustTargetCustomer.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAdjustTargetCustomer(null)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#FBF4EC] border border-[#B8752E]/30 rounded-xl flex items-start gap-2 text-xs text-[#1F2421]">
              <AlertTriangle className="w-4 h-4 text-[#B8752E] shrink-0 mt-0.5" />
              <div>
                تنبيه: التعديلات اليدوية تُسجل في دفتر الأستاذ وسجل الرقابة (Audit Trail) وتؤثر مباشرة على
                المطابقة المالية للشركة.
              </div>
            </div>

            <form onSubmit={handleConfirmAdjust} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  نوع الحركة <span className="text-[#A8452F]">*</span>:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustDirection("credit")}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      adjustDirection === "credit"
                        ? "bg-[#3F6B58] text-white shadow-xs"
                        : "bg-[#FAF8F5] border border-[#DFDCD5] text-[#5C6460]"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>إيداع رصيد (Credit)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDirection("debit")}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      adjustDirection === "debit"
                        ? "bg-[#A8452F] text-white shadow-xs"
                        : "bg-[#FAF8F5] border border-[#DFDCD5] text-[#5C6460]"
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" />
                    <span>خصم رصيد (Debit)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  المبلغ (ج.م) <span className="text-[#A8452F]">*</span>:
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl font-bold text-base text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
                {adjustDirection === "debit" && (
                  <span className="text-[10px] text-[#8A928D] block mt-1">
                    الرصيد المتاح الحالي: {adjustTargetCustomer.available} ج.م (لا يمكن خصم مبلغ أكبر منه)
                  </span>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  سبب التعديل والتبرير المحاسبي <span className="text-[#A8452F]">*</span>:
                </label>
                <textarea
                  rows={3}
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="مثال: تعويض نقدي بموجب الشكوى رقم #123 أو تسوية بنكية مباشرة..."
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#DFDCD5]">
                <button
                  type="button"
                  onClick={() => setAdjustTargetCustomer(null)}
                  className="flex-1 py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white text-[#5C6460] font-semibold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={adjusting || !adjustReason.trim() || adjustAmount <= 0}
                  className="flex-1 py-2 px-3 bg-[#1F2421] hover:bg-[#2b332e] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  {adjusting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "تنفيذ التعديل المحاسبي"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
