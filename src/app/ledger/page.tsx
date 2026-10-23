"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Download,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { LedgerEntry } from "@/lib/types";

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [partyTypeFilter, setPartyTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getLedgerEntries({
        type: typeFilter === "all" ? undefined : typeFilter,
        partyType: partyTypeFilter === "all" ? undefined : partyTypeFilter,
        limit: 500,
      });
      setEntries(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [typeFilter, partyTypeFilter]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e._id.toLowerCase().includes(q) ||
        e.orderId?.toLowerCase().includes(q) ||
        e.partyId?.toLowerCase().includes(q) ||
        e.reference?.toLowerCase().includes(q),
    );
  }, [entries, searchQuery]);

  // Financial summary aggregates
  const stats = useMemo(() => {
    let totalDeposits = 0;
    let totalPayables = 0;
    let totalSettlements = 0;
    let totalCompensations = 0;

    filteredEntries.forEach((e) => {
      const amt = Number(e.amount) || 0;
      if (e.type === "deposit_received") totalDeposits += amt;
      else if (e.type === "vendor_payable") totalPayables += amt;
      else if (e.type === "settlement_paid") totalSettlements += amt;
      else if (e.type === "craftsman_compensation") totalCompensations += amt;
    });

    return { totalDeposits, totalPayables, totalSettlements, totalCompensations };
  }, [filteredEntries]);

  const typeLabels: Record<string, { label: string; bg: string; text: string }> = {
    deposit_received: {
      label: "عربون مستلم",
      bg: "bg-[#EDF5F1]",
      text: "text-[#3F6B58]",
    },
    deposit_refunded: {
      label: "عربون مسترد",
      bg: "bg-[#FDF2F0]",
      text: "text-[#A8452F]",
    },
    vendor_payable: {
      label: "مستحق تاجر",
      bg: "bg-[#FBF4EC]",
      text: "text-[#B8752E]",
    },
    settlement_paid: {
      label: "سداد تسوية",
      bg: "bg-[#FAF8F5] border border-[#DFDCD5]",
      text: "text-[#1F2421]",
    },
    craftsman_compensation: {
      label: "تعويض فني",
      bg: "bg-[#FDF2F0]",
      text: "text-[#A8452F]",
    },
    platform_commission: {
      label: "عمولة منصة",
      bg: "bg-[#ECEAE4]",
      text: "text-[#1F2421]",
    },
  };

  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      alert("لا توجد قيود لتصديرها");
      return;
    }

    const headers = [
      "معرف القيد",
      "نوع الحركة",
      "نوع الطرف",
      "معرف الطرف",
      "رقم الطلب",
      "المبلغ (ج.م)",
      "البيان / المرجع",
      "تاريخ القيد",
    ];

    const rows = filteredEntries.map((e) => [
      e._id,
      typeLabels[e.type]?.label || e.type,
      e.partyType === "vendor" ? "تاجر" : e.partyType === "craftsman" ? "فني" : e.partyType === "customer" ? "عميل" : "المنصة",
      e.partyId || "-",
      e.orderId || "-",
      e.amount,
      `"${(e.reference || "").replace(/"/g, '""')}"`,
      new Date(e.createdAt).toLocaleString("ar-EG"),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spare-go-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2421]">دفتر الأستاذ العام (Ledger)</h1>
          <p className="text-xs text-[#5C6460]">
            سجل مالي ثابت للقيد المزدوج لجميع التدفقات النقدية والعربونات والعمولات والتسويات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#B8752E]" />
            <span>تصدير السجل (CSV)</span>
          </button>
          <button
            onClick={fetchLedger}
            disabled={loading}
            className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث القيود</span>
          </button>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[#8A928D] block">العربونات المستلمة</span>
          <div className="text-lg font-bold text-[#3F6B58] num-tabular mt-1">
            {stats.totalDeposits} ج.م
          </div>
        </div>

        <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[#8A928D] block">مستحقات التجار المقيدة</span>
          <div className="text-lg font-bold text-[#B8752E] num-tabular mt-1">
            {stats.totalPayables} ج.م
          </div>
        </div>

        <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[#8A928D] block">إجمالي التسويات المصروفة</span>
          <div className="text-lg font-bold text-[#1F2421] num-tabular mt-1">
            {stats.totalSettlements} ج.م
          </div>
        </div>

        <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[#8A928D] block">تعويضات الفنيين</span>
          <div className="text-lg font-bold text-[#A8452F] num-tabular mt-1">
            {stats.totalCompensations} ج.م
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] font-semibold focus:outline-none focus:border-[#B8752E]"
          >
            <option value="all">كل أنواع الحركات</option>
            <option value="deposit_received">عربون مستلم</option>
            <option value="deposit_refunded">عربون مسترد</option>
            <option value="vendor_payable">مستحق تاجر</option>
            <option value="settlement_paid">سداد تسوية</option>
            <option value="craftsman_compensation">تعويض فني</option>
            <option value="platform_commission">عمولة المنصة</option>
          </select>

          {/* Party Type Filter */}
          <select
            value={partyTypeFilter}
            onChange={(e) => setPartyTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] font-semibold focus:outline-none focus:border-[#B8752E]"
          >
            <option value="all">كل أطراف الحركة</option>
            <option value="vendor">تاجر</option>
            <option value="craftsman">فني تركيب</option>
            <option value="customer">عميل</option>
            <option value="platform">المنصة</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
          <input
            type="text"
            placeholder="بحث بالقيد أو رقم الطلب أو الطرف أو المرجع..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] placeholder-[#8A928D] focus:outline-none focus:border-[#B8752E]"
          />
        </div>
      </div>

      {/* Dense Ledger Table */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5C6460] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
            <p>جاري تحميل قيود دفتر الأستاذ...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5C6460]">
            لا توجد قيود تطابق شروط التصفية والبحث الحالية.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                <tr>
                  <th className="py-2.5 px-3">معرف القيد</th>
                  <th className="py-2.5 px-3">نوع الحركة</th>
                  <th className="py-2.5 px-3">الطرف</th>
                  <th className="py-2.5 px-3">معرف الطرف</th>
                  <th className="py-2.5 px-3">رقم الطلب المرتبط</th>
                  <th className="py-2.5 px-3">المبلغ</th>
                  <th className="py-2.5 px-3">البيان / مرجع القيد</th>
                  <th className="py-2.5 px-3">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEAE4]">
                {filteredEntries.map((e) => {
                  const meta = typeLabels[e.type] || {
                    label: e.type,
                    bg: "bg-[#FAF8F5]",
                    text: "text-[#5C6460]",
                  };
                  return (
                    <tr key={e._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[#8A928D]">{e._id.slice(-8)}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.bg} ${meta.text}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#1F2421]">
                        {e.partyType === "vendor"
                          ? "تاجر"
                          : e.partyType === "craftsman"
                          ? "فني تركيب"
                          : e.partyType === "customer"
                          ? "عميل"
                          : "المنصة"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#5C6460]">
                        {e.partyId ? e.partyId.slice(-6) : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        {e.orderId ? (
                          <Link
                            href={`/orders/${e.orderId}`}
                            className="font-mono text-[#B8752E] hover:underline flex items-center gap-1 font-semibold"
                          >
                            <span>{e.orderId.slice(-6)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-[#8A928D]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-sm text-[#1F2421]">
                        {e.amount} ج.م
                      </td>
                      <td className="py-2.5 px-3 text-[#5C6460] max-w-sm truncate">
                        {e.reference || "قيد محاسبي"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#8A928D] text-[11px]">
                        {new Date(e.createdAt).toLocaleString("ar-EG")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
