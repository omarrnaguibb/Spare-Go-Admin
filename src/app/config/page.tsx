"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign,
  Percent,
  Clock,
  MapPin,
  ShieldCheck,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  Wallet,
  AlertTriangle,
  Sliders,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { SystemConfig } from "@/lib/types";

export default function ConfigPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getConfig();
      setConfig(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2421]">إعدادات وسياسات المنصة (للقراءة فقط)</h1>
          <p className="text-xs text-[#5C6460]">
            استعراض متغيرات المنظومة المحملة من الخادم المركزي (العربون، العمولات، المهل الزمنية، والمناطق)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="py-2 px-3 bg-[#B8752E] hover:bg-[#9E6122] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>تعديل الإعدادات والسياسات</span>
          </Link>
          <button
            onClick={fetchConfig}
            disabled={loading}
            className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث المتغيرات</span>
          </button>
        </div>
      </div>

      {/* Warning banner when DEPOSIT_ENABLED is true but WALLET_ENABLED is false */}
      {config && config.depositEnabled && !config.walletEnabled && (
        <div className="bg-[#FDF2F0] border border-[#A8452F]/40 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#A8452F] shrink-0 mt-0.5" />
          <div className="text-xs text-[#A8452F] leading-relaxed">
            <strong className="block mb-0.5">تحذير مالي وتشغيلي:</strong>
            سياسة العربون مفعلة حالياً (<code className="font-mono">depositEnabled=true</code>) ولكن المحفظة الرقمية معطلة (<code className="font-mono">walletEnabled=false</code>).
            بناءً على القواعد المالية للمنصة، لن يتم حجز أي عربون للطلبات لأن حجز العربون يتطلب محفظة نشطة.
          </div>
        </div>
      )}

      {/* Info notice */}
      <div className="bg-[#FAF8F5] border border-[#DFDCD5] rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#B8752E] shrink-0 mt-0.5" />
        <div className="text-xs text-[#5C6460] leading-relaxed">
          هذه الصفحة للعرض والتدقيق والرقابة المحاسبية فقط. يتم التحكم في هذه المعاملات وتحديثها عبر
          صفحة <Link href="/settings" className="font-bold text-[#B8752E] hover:underline">إعدادات المنظومة</Link> وملفات البيئة لبيئة الإنتاج بخادم سبير جو.
        </div>
      </div>

      {loading || !config ? (
        <div className="p-12 text-center text-xs text-[#5C6460] space-y-2 bg-white rounded-2xl border border-[#DFDCD5]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
          <p>جاري قراءة إعدادات الخادم...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Section 1: Deposit Policy */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFDCD5]">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#B8752E]" />
                <h3 className="font-bold text-sm text-[#1F2421]">سياسة العربون والجدية</h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                  config.depositEnabled
                    ? "bg-[#EDF5F1] text-[#3F6B58]"
                    : "bg-[#FDF2F0] text-[#A8452F]"
                }`}
              >
                {config.depositEnabled ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>مفعل</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" />
                    <span>معطل</span>
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">نسبة العربون الافتراضية</span>
                <span className="text-base font-bold text-[#1F2421] num-tabular">
                  {config.depositRate || 10}%
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">العربون الثابت المبدئي</span>
                <span className="text-base font-bold text-[#1F2421] num-tabular">
                  {config.depositAmount || 50} ج.م
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">الحد الأدنى للعربون</span>
                <span className="text-base font-bold text-[#1F2421] num-tabular">
                  {config.minDeposit || 20} ج.م
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">الحد الأقصى للعربون</span>
                <span className="text-base font-bold text-[#1F2421] num-tabular">
                  {config.maxDeposit || 500} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* Section: Customer Wallet Policy */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFDCD5]">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#B8752E]" />
                <h3 className="font-bold text-sm text-[#1F2421]">إعدادات محفظة العملاء</h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                  config.walletEnabled
                    ? "bg-[#EDF5F1] text-[#3F6B58]"
                    : "bg-[#FDF2F0] text-[#A8452F]"
                }`}
              >
                {config.walletEnabled ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>مفعلة</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" />
                    <span>معطلة</span>
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">الحد الأدنى للشحن</span>
                <span className="text-base font-bold text-[#1F2421] num-tabular">
                  {config.walletMinTopup ?? 50} ج.م
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">الحد الأقصى للشحن / عملية</span>
                <span className="text-base font-bold text-[#1F2421] num-tabular">
                  {config.walletMaxTopup ?? 1000} ج.م
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">سقف رصيد المحفظة الأقصى</span>
                <span className="text-base font-bold text-[#3F6B58] num-tabular">
                  {config.walletMaxBalance ?? 2000} ج.م
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">صلاحية طلب الشحن</span>
                <span className="text-base font-bold text-[#1F2421] num-tabular">
                  {config.walletTopupExpiryHours ?? 48} ساعة
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">الطلبات المعلقة المسموحة</span>
                <span className="text-base font-bold text-[#1F2421] num-tabular">
                  {config.walletMaxPendingTopups ?? 3} طلبات
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">سحب واسترداد الرصيد</span>
                <span className={`text-base font-bold ${config.walletWithdrawalsEnabled !== false ? "text-[#3F6B58]" : "text-[#A8452F]"}`}>
                  {config.walletWithdrawalsEnabled !== false ? "متاح للعملاء" : "معطل"}
                </span>
              </div>
            </div>

            {config.walletTermsText && (
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5] text-[11px] text-[#5C6460] leading-relaxed">
                <span className="font-bold text-[#1F2421] block mb-0.5">شروط وأحكام المحفظة:</span>
                {config.walletTermsText}
              </div>
            )}
          </div>

          {/* Section 2: Commission Rates */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DFDCD5]">
              <Percent className="w-4 h-4 text-[#B8752E]" />
              <h3 className="font-bold text-sm text-[#1F2421]">نسب العمولات ونموذج الإيرادات</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">عمولة مبيعات التجار</span>
                <span className="text-base font-bold text-[#B8752E] num-tabular">
                  {(config.vendorCommissionRate ? config.vendorCommissionRate * 100 : 5)}%
                </span>
                <span className="text-[10px] text-[#5C6460] block mt-1">تخصم عند تسوية الطلب</span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">عمولة خدمات الفنيين</span>
                <span className="text-base font-bold text-[#3F6B58] num-tabular">
                  {(config.craftsmanCommissionRate ? config.craftsmanCommissionRate * 100 : 10)}%
                </span>
                <span className="text-[10px] text-[#5C6460] block mt-1">تضاف لمستحقات المنصة</span>
              </div>
            </div>
          </div>

          {/* Section 3: Operational Time Windows */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DFDCD5]">
              <Clock className="w-4 h-4 text-[#B8752E]" />
              <h3 className="font-bold text-sm text-[#1F2421]">المهل الزمنية ودورات العمل</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">مهلة رد التاجر وتأكيد القطعة</span>
                <span className="text-base font-bold text-[#1F2421] num-tabular">
                  {config.responseWindowMinutes || 15} دقيقة
                </span>
                <span className="text-[10px] text-[#5C6460] block mt-1">
                  يحول للتالي أو يلغى تلقائياً
                </span>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5]">
                <span className="text-[11px] text-[#8A928D] block">مهلة ساحة عروض الفنيين</span>
                <span className="text-base font-bold text-[#1F2421] num-tabular">
                  {config.quotesWindowMinutes || 30} دقيقة
                </span>
                <span className="text-[10px] text-[#5C6460] block mt-1">
                  فترة استقبال عروض التركيب
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Service Areas */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DFDCD5]">
              <MapPin className="w-4 h-4 text-[#B8752E]" />
              <h3 className="font-bold text-sm text-[#1F2421]">النطاقات الجغرافية المفعلة</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {(config.serviceAreas && config.serviceAreas.length > 0
                ? config.serviceAreas
                : ["بنها", "طوخ", "قها", "كفر شكر", "شبين القناطر", "قليوب"]
              ).map((area) => (
                <span
                  key={area}
                  className="px-3 py-1 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs font-bold text-[#1F2421]"
                >
                  📍 {area}
                </span>
              ))}
            </div>
          </div>

          {/* Section 5: Warranty Policy */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-3 md:col-span-2">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DFDCD5]">
              <ShieldCheck className="w-4 h-4 text-[#3F6B58]" />
              <h3 className="font-bold text-sm text-[#1F2421]">وثيقة وسياسة الضمان للعملاء</h3>
            </div>
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5] text-xs text-[#5C6460] leading-relaxed">
              {config.warrantyText ||
                "ضمان سبير جو يسري لمدة 14 يوماً ضد عيوب الصناعة أو عدم مطابقة القطعة لمواصفات السيارة المسجلة، بشرط التركيب لدى فني معتمد من المنصة وعدم إتلاف باركود أو ملصق الفحص."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
