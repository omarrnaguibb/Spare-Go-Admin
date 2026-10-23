"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Search,
  ExternalLink,
  Download,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { AuditLog } from "@/lib/types";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAuditLogs(200);
      setLogs(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actionLabels: Record<string, { label: string; bg: string; text: string }> = {
    cancel_order: {
      label: "إلغاء طلب",
      bg: "bg-[#FDF2F0]",
      text: "text-[#A8452F]",
    },
    reassign_vendor: {
      label: "إعادة توجيه لتاجر آخر",
      bg: "bg-[#FBF4EC]",
      text: "text-[#B8752E]",
    },
    unlock_completion: {
      label: "فك حظر محاولات الكود",
      bg: "bg-[#EDF5F1]",
      text: "text-[#3F6B58]",
    },
    add_order_note: {
      label: "إضافة ملاحظة إدارية",
      bg: "bg-[#FAF8F5] border border-[#DFDCD5]",
      text: "text-[#1F2421]",
    },
    update_deposit: {
      label: "تعديل حالة العربون",
      bg: "bg-[#FBF4EC]",
      text: "text-[#B8752E]",
    },
    resolve_ticket: {
      label: "حل تذكرة دعم",
      bg: "bg-[#EDF5F1]",
      text: "text-[#3F6B58]",
    },
    settle_vendor_orders: {
      label: "تسوية مستحقات تاجر",
      bg: "bg-[#EDF5F1]",
      text: "text-[#3F6B58]",
    },
    settle_craftsman_dues: {
      label: "تسوية عمولات فني",
      bg: "bg-[#EDF5F1]",
      text: "text-[#3F6B58]",
    },
    update_vendor_status: {
      label: "تعديل حالة تاجر",
      bg: "bg-[#FBF4EC]",
      text: "text-[#B8752E]",
    },
    update_craftsman_status: {
      label: "تعديل حالة فني",
      bg: "bg-[#FBF4EC]",
      text: "text-[#B8752E]",
    },
    create_craftsman: {
      label: "إنشاء حساب فني",
      bg: "bg-[#EDF5F1]",
      text: "text-[#3F6B58]",
    },
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (targetTypeFilter !== "all" && log.targetType !== targetTypeFilter) {
        return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        log.adminName?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.targetId?.toLowerCase().includes(q) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(q)
      );
    });
  }, [logs, targetTypeFilter, searchQuery]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert("لا توجد سجلات لتصديرها");
      return;
    }

    const headers = [
      "معرف السجل",
      "المسؤول المنفذ",
      "معرف المسؤول",
      "نوع الإجراء",
      "نوع الهدف",
      "معرف الهدف",
      "التفاصيل",
      "تاريخ الإجراء",
    ];

    const rows = filteredLogs.map((l) => [
      l._id,
      `"${l.adminName.replace(/"/g, '""')}"`,
      l.adminId,
      actionLabels[l.action]?.label || l.action,
      l.targetType,
      l.targetId,
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`,
      new Date(l.createdAt).toLocaleString("ar-EG"),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spare-go-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2421]">سجل الرقابة والتدقيق (Audit Logs)</h1>
          <p className="text-xs text-[#5C6460]">
            تتبع وتسجيل كامل لجميع الإجراءات الإدارية، التعديلات المالية، وتغييرات الحالات
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
            onClick={fetchLogs}
            disabled={loading}
            className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] font-semibold focus:outline-none focus:border-[#B8752E]"
          >
            <option value="all">جميع أنواع الأهداف</option>
            <option value="order">طلبات (Orders)</option>
            <option value="vendor">تجار (Vendors)</option>
            <option value="craftsman">فنيين (Craftsmen)</option>
            <option value="ticket">تذاكر دعم (Tickets)</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-80">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
          <input
            type="text"
            placeholder="بحث بالمسؤول أو معرف الهدف أو محتوى القرار..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] placeholder-[#8A928D] focus:outline-none focus:border-[#B8752E]"
          />
        </div>
      </div>

      {/* Dense Audit Table */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5C6460] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
            <p>جاري تحميل سجلات التدقيق...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5C6460]">
            لا توجد سجلات تدقيق تطابق معايير البحث.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                <tr>
                  <th className="py-2.5 px-3">معرف السجل</th>
                  <th className="py-2.5 px-3">المسؤول المنفذ</th>
                  <th className="py-2.5 px-3">الإجراء</th>
                  <th className="py-2.5 px-3">الهدف</th>
                  <th className="py-2.5 px-3">معرف الهدف</th>
                  <th className="py-2.5 px-3">تفاصيل الإجراء والملاحظات</th>
                  <th className="py-2.5 px-3">الوقت والتاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEAE4]">
                {filteredLogs.map((log) => {
                  const meta = actionLabels[log.action] || {
                    label: log.action,
                    bg: "bg-[#FAF8F5]",
                    text: "text-[#5C6460]",
                  };

                  return (
                    <tr key={log._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[#8A928D]">{log._id.slice(-8)}</td>
                      <td className="py-2.5 px-3 font-bold text-[#1F2421]">
                        {log.adminName || "مدير النظام"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.bg} ${meta.text}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#5C6460]">
                        {log.targetType === "order"
                          ? "طلب"
                          : log.targetType === "vendor"
                          ? "تاجر"
                          : log.targetType === "craftsman"
                          ? "فني"
                          : log.targetType === "ticket"
                          ? "تذكرة"
                          : log.targetType}
                      </td>
                      <td className="py-2.5 px-3">
                        {log.targetType === "order" ? (
                          <Link
                            href={`/orders/${log.targetId}`}
                            className="font-mono text-[#B8752E] hover:underline flex items-center gap-1 font-semibold"
                          >
                            <span>{log.targetId?.slice(-6)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="font-mono text-[#5C6460]">
                            {log.targetId ? log.targetId.slice(-6) : "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 max-w-md">
                        <div className="font-mono text-[10px] bg-[#FAF8F5] p-1.5 rounded border border-[#DFDCD5] truncate text-[#1F2421]">
                          {Object.entries(log.details || {}).map(([k, v]) => (
                            <span key={k} className="ml-2 inline-block">
                              <strong className="text-[#5C6460]">{k}:</strong>{" "}
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#8A928D] text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("ar-EG")}
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
