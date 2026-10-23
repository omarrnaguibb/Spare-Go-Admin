"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Scale,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { ReconciliationReport } from "@/lib/types";

export default function ReconciliationPage() {
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getReconciliation();
      setReport(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = () => {
    window.open("/api/backend/admin/wallet/reconciliation?format=csv", "_blank");
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1F2421]">المطابقة والتسوية المالية للمحفظة</h1>
          <p className="text-xs text-[#5C6460]">
            المطابقة اللحظية بين إجمالي التزامات أرصدة العملاء وسجل القيود المحاسبية لدفتر الأستاذ (Double-Entry Verification)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="py-2 px-3.5 bg-[#1F2421] hover:bg-[#2b332e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير تقرير المطابقة (CSV)</span>
          </button>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>إعادة المطابقة الآن</span>
          </button>
        </div>
      </div>

      {loading || !report ? (
        <div className="p-12 text-center text-xs text-[#5C6460] space-y-2 bg-white rounded-2xl border border-[#DFDCD5]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
          <p>جاري مطابقة وتدقيق قيود المحافظ والدفاتر المحاسبية...</p>
        </div>
      ) : (
        <>
          {/* Audit Verification Banner */}
          {report.hasDiscrepancies ? (
            <div className="bg-[#FDF2F0] border-2 border-[#A8452F] rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-[#A8452F] shrink-0 mt-0.5" />
              <div className="text-xs text-[#1F2421] leading-relaxed">
                <span className="font-bold text-sm text-[#A8452F] block mb-1">
                  تحذير مالي رقابي: تم رصد عدم تطابق في حسابات المحفظة ({report.discrepanciesCount} محفظة)!
                </span>
                يوجد فرق حسابي بين الرصيد المخزن في وثيقة المحفظة ومجموع قيود دفتر الأستاذ (Wallet Entries).
                يُرجى مراجعة الجدول التفصيلي أدناه والتحقق من الحركات اليدوية.
              </div>
            </div>
          ) : (
            <div className="bg-[#EDF5F1] border border-[#3F6B58]/30 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#3F6B58] shrink-0 mt-0.5" />
              <div className="text-xs text-[#1F2421] leading-relaxed">
                <span className="font-bold text-[#3F6B58] block mb-0.5">
                  المطابقة سليمة 100%: جميع المحافظ مطابقة تماماً لقيود دفتر الأستاذ
                </span>
                إجمالي التزامات العملاء (الأرصدة المتاحة + المحجوزة) مطابقة لحاصل حركات الشحن والسحب وحجوزات العربون.
                آخر فحص: {new Date(report.timestamp).toLocaleString("ar-EG")}.
              </div>
            </div>
          )}

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Liabilities */}
            <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-[#8A928D]">
                <span className="text-xs font-semibold">إجمالي التزامات المحفظة</span>
                <Scale className="w-4 h-4 text-[#B8752E]" />
              </div>
              <div className="text-xl font-bold text-[#1F2421] num-tabular">
                {report.summary.totalLiabilities} ج.م
              </div>
              <div className="text-[11px] text-[#5C6460]">
                عبر {report.summary.totalWallets} محفظة عملاء
              </div>
            </div>

            {/* Total Available */}
            <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-[#8A928D]">
                <span className="text-xs font-semibold">الرصيد المتاح حالياً</span>
                <DollarSign className="w-4 h-4 text-[#3F6B58]" />
              </div>
              <div className="text-xl font-bold text-[#3F6B58] num-tabular">
                {report.summary.totalAvailable} ج.م
              </div>
              <div className="text-[11px] text-[#5C6460]">
                متاح لطلبات الشراء أو السحب
              </div>
            </div>

            {/* Total Held */}
            <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-[#8A928D]">
                <span className="text-xs font-semibold">العربون المحجوز حالياً</span>
                <Lock className="w-4 h-4 text-[#B8752E]" />
              </div>
              <div className="text-xl font-bold text-[#B8752E] num-tabular">
                {report.summary.totalHeld} ج.م
              </div>
              <div className="text-[11px] text-[#5C6460]">
                محجوز لضمان جدية الطلبات الحية
              </div>
            </div>

            {/* Approved Top-ups */}
            <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-[#8A928D]">
                <span className="text-xs font-semibold">إجمالي الشحن المعتمد</span>
                <ArrowDownLeft className="w-4 h-4 text-[#3F6B58]" />
              </div>
              <div className="text-xl font-bold text-[#1F2421] num-tabular">
                {report.summary.approvedTopUps} ج.م
              </div>
              <div className="text-[11px] text-[#5C6460]">
                مجموع إيداعات العملاء الموثقة
              </div>
            </div>

            {/* Deposits Held Volume */}
            <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-[#8A928D]">
                <span className="text-xs font-semibold">حجوزات العربون التاريخية</span>
                <Layers className="w-4 h-4 text-[#B8752E]" />
              </div>
              <div className="text-xl font-bold text-[#1F2421] num-tabular">
                {report.summary.depositsHeld} ج.م
              </div>
              <div className="text-[11px] text-[#5C6460]">
                إجمالي المبالغ المجمدة كعربون
              </div>
            </div>

            {/* Deposits Released */}
            <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-[#8A928D]">
                <span className="text-xs font-semibold">العربون المفكوك / المرتجع</span>
                <CheckCircle2 className="w-4 h-4 text-[#3F6B58]" />
              </div>
              <div className="text-xl font-bold text-[#3F6B58] num-tabular">
                {report.summary.depositsReleased} ج.م
              </div>
              <div className="text-[11px] text-[#5C6460]">
                أُعيدت للرصيد المتاح بعد الإلغاء
              </div>
            </div>

            {/* Deposits Captured / Forfeited */}
            <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-[#8A928D]">
                <span className="text-xs font-semibold">عربين محصّلة / مصادرة</span>
                <ShieldAlert className="w-4 h-4 text-[#A8452F]" />
              </div>
              <div className="text-xl font-bold text-[#A8452F] num-tabular">
                {report.summary.depositsCaptured + report.summary.depositsForfeited} ج.م
              </div>
              <div className="text-[11px] text-[#5C6460]">
                تسوية مكتملة ({report.summary.depositsCaptured}) / تعويض ({report.summary.depositsForfeited})
              </div>
            </div>

            {/* Withdrawals Paid */}
            <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-[#8A928D]">
                <span className="text-xs font-semibold">إجمالي السحوبات المصروفة</span>
                <ArrowUpRight className="w-4 h-4 text-[#A8452F]" />
              </div>
              <div className="text-xl font-bold text-[#1F2421] num-tabular">
                {report.summary.withdrawalsPaid} ج.م
              </div>
              <div className="text-[11px] text-[#5C6460]">
                مبالغ سُددت بحسابات العملاء
              </div>
            </div>
          </div>

          {/* Discrepancies Table (if any) */}
          {report.mismatches.length > 0 && (
            <div className="bg-white border border-[#A8452F]/40 rounded-2xl shadow-xs overflow-hidden space-y-3 p-5">
              <div className="flex items-center gap-2 text-[#A8452F]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm">قائمة الحسابات التي وُجد بها عدم تطابق</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">معرف العميل</th>
                      <th className="py-2.5 px-3">المتاح (المخزن)</th>
                      <th className="py-2.5 px-3">المتاح (المحسوب من القيود)</th>
                      <th className="py-2.5 px-3">المحجوز (المخزن)</th>
                      <th className="py-2.5 px-3">المحجوز (المحسوب من القيود)</th>
                      <th className="py-2.5 px-3">الفرق الحسابي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEAE4]">
                    {report.mismatches.map((m) => {
                      const availDiff = m.storedAvailable - m.computedAvailable;
                      const heldDiff = m.storedHeld - m.computedHeld;

                      return (
                        <tr key={m.customerId} className="hover:bg-[#FDF2F0]/40">
                          <td className="py-2.5 px-3 font-mono font-bold">{m.customerId}</td>
                          <td className="py-2.5 px-3 num-tabular">{m.storedAvailable} ج.م</td>
                          <td className="py-2.5 px-3 num-tabular font-bold text-[#3F6B58]">{m.computedAvailable} ج.م</td>
                          <td className="py-2.5 px-3 num-tabular">{m.storedHeld} ج.م</td>
                          <td className="py-2.5 px-3 num-tabular font-bold text-[#B8752E]">{m.computedHeld} ج.م</td>
                          <td className="py-2.5 px-3 num-tabular font-bold text-[#A8452F]">
                            متاح: {availDiff} | محجوز: {heldDiff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Accounting Methodology Card */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#B8752E]" />
              <h3 className="font-bold text-sm text-[#1F2421]">منهجية القيد المزدوج والرقابة المحاسبية</h3>
            </div>
            <div className="text-xs text-[#5C6460] leading-relaxed space-y-2">
              <p>
                تعتمد محفظة سبير جو مبدأ القيد المزدوج الصارم (Append-only Ledger). كل حركة شحن، أو حجز عربون، أو فك حجز، أو
                تسوية، أو صرف سحب تنشئ قيداً غير قابل للتعديل أو الحذف في جدول <code className="text-[#B8752E] font-mono">WalletEntry</code> مع
                توثيق المعرف المرجعي وهوية المنفذ (System / Admin / Customer).
              </p>
              <p>
                يقوم محرك المطابقة بجمع كافة القيود التاريخية لكل محفظة عميل ويقارنها لحظياً بالرصيد الفعلي المخزن. عند اكتشاف
                أي انحراف حتى لو كان بقيمة 1 جنيه، يظهر تحذير فوري لمنع تسوية أي أرباح قبل تدقيق الفارق.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
