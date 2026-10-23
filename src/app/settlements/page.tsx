"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  DollarSign,
  Download,
  RefreshCw,
  Store,
  Wrench,
  History,
  CreditCard,
  CheckSquare,
  Square,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { AdminVendor, AdminCraftsman, AdminOrder, LedgerEntry } from "@/lib/types";
import { getDepositStatusMeta } from "@/lib/deposit-status";
import { ConfirmModal } from "@/components/confirm-modal";

export default function SettlementsPage() {
  const [activeTab, setActiveTab] = useState<"vendors" | "craftsmen" | "history">("vendors");
  const [loading, setLoading] = useState(true);

  // Data states
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [craftsmen, setCraftsmen] = useState<AdminCraftsman[]>([]);
  const [allOrders, setAllOrders] = useState<AdminOrder[]>([]);
  const [historyEntries, setHistoryEntries] = useState<LedgerEntry[]>([]);

  // Vendor settlement tab state
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [vendorRef, setVendorRef] = useState<string>("");

  // Craftsman settlement tab state
  const [selectedCraftsman, setSelectedCraftsman] = useState<AdminCraftsman | null>(null);
  const [craftsmanAmount, setCraftsmanAmount] = useState<number>(0);
  const [craftsmanRef, setCraftsmanRef] = useState<string>("");

  // Confirmation state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: async () => {},
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vList, cList, ordersList, ledgerData] = await Promise.all([
        adminApi.listVendors(),
        adminApi.listCraftsmen(),
        adminApi.listOrders({ status: "completed" }),
        adminApi.getLedgerEntries({ type: "settlement_paid", limit: 200 }),
      ]);
      setVendors(vList);
      setCraftsmen(cList);
      setAllOrders(ordersList);
      setHistoryEntries(ledgerData);

      if (!selectedVendorId && vList.length > 0) {
        setSelectedVendorId(vList[0]._id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedVendorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Orders eligible for selected vendor
  const vendorOrders = useMemo(() => {
    if (!selectedVendorId) return [];
    return allOrders.filter(
      (o) => o.vendorId === selectedVendorId && (o.status === "completed" || o.status === "delivered"),
    );
  }, [allOrders, selectedVendorId]);

  const selectedTotal = useMemo(() => {
    return vendorOrders
      .filter((o) => selectedOrderIds.includes(o._id))
      .reduce((sum, o) => sum + (o.vendorPayout || o.partPrice || 0), 0);
  }, [vendorOrders, selectedOrderIds]);

  const handleToggleOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAllOrders = () => {
    if (selectedOrderIds.length === vendorOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(vendorOrders.map((o) => o._id));
    }
  };

  const executeVendorSettlement = async () => {
    if (!selectedVendorId || selectedOrderIds.length === 0) return;
    try {
      await adminApi.settleVendorOrders(
        selectedVendorId,
        selectedOrderIds,
        vendorRef || `تحويل بنكي / فودافون كاش - ${new Date().toLocaleDateString("ar-EG")}`,
      );
      setSelectedOrderIds([]);
      setVendorRef("");
      setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشلت عملية التسوية");
    }
  };

  const handlePromptVendorSettlement = () => {
    if (selectedOrderIds.length === 0) {
      alert("يرجى اختيار طلب واحد على الأقل للتسوية");
      return;
    }
    const currentVendor = vendors.find((v) => v._id === selectedVendorId);
    setConfirmConfig({
      isOpen: true,
      title: "تأكيد صرف مستحقات التاجر",
      message: `هل أنت متأكد من تسجيل سداد مبلغ ${selectedTotal} ج.م لـ "${
        currentVendor?.storeName || currentVendor?.name
      }" عن عدد (${selectedOrderIds.length}) طلبات؟ هذا الإجراء سيقيد في دفتر الأستاذ وسجل التدقيق.`,
      onConfirm: executeVendorSettlement,
    });
  };

  const executeCraftsmanSettlement = async () => {
    if (!selectedCraftsman || craftsmanAmount <= 0) return;
    try {
      await adminApi.settleCraftsmanDues(
        selectedCraftsman._id,
        craftsmanAmount,
        craftsmanRef || `سداد عمولات - ${new Date().toLocaleDateString("ar-EG")}`,
      );
      setSelectedCraftsman(null);
      setCraftsmanAmount(0);
      setCraftsmanRef("");
      setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشلت عملية التسوية");
    }
  };

  const handlePromptCraftsmanSettlement = () => {
    if (!selectedCraftsman || craftsmanAmount <= 0) return;
    setConfirmConfig({
      isOpen: true,
      title: "تأكيد تسجيل تحصيل عمولات الفني",
      message: `هل أنت متأكد من تسجيل تسوية عمولة بمبلغ ${craftsmanAmount} ج.م من الفني "${selectedCraftsman.name}"؟`,
      onConfirm: executeCraftsmanSettlement,
    });
  };

  // CSV export function
  const handleExportCSV = () => {
    if (historyEntries.length === 0) {
      alert("لا توجد سجلات تسوية لتصديرها");
      return;
    }

    const headers = ["معرف العملية", "الطرف المستفيد", "معرف الطرف", "نوع العملية", "المبلغ (ج.م)", "رقم الطلب", "البيان / المرجع", "التاريخ والوقت"];
    const rows = historyEntries.map((e) => [
      e._id,
      e.partyType === "vendor" ? "تاجر" : e.partyType === "craftsman" ? "فني" : e.partyType,
      e.partyId || "-",
      "سداد تسوية",
      e.amount,
      e.orderId || "-",
      `"${(e.reference || "").replace(/"/g, '""')}"`,
      new Date(e.createdAt).toLocaleString("ar-EG"),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spare-go-settlements-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2421]">التسويات المالية والمدفوعات</h1>
          <p className="text-xs text-[#5C6460]">
            صرف مستحقات التجار عن مبيعات القطع وتحصيل وتصفية عمولات الفنيين وتصدير الكشوفات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#B8752E]" />
            <span>تصدير كشف أسبوعي (CSV)</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl p-2.5 flex items-center gap-2 shadow-xs">
        <button
          onClick={() => setActiveTab("vendors")}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === "vendors"
              ? "bg-[#1F2421] text-white"
              : "bg-[#FAF8F5] text-[#5C6460] hover:text-[#1F2421]"
          }`}
        >
          <Store className="w-4 h-4" />
          <span>مستحقات التجار ({vendors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("craftsmen")}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === "craftsmen"
              ? "bg-[#1F2421] text-white"
              : "bg-[#FAF8F5] text-[#5C6460] hover:text-[#1F2421]"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>عمولات الفنيين ({craftsmen.filter((c) => (c.commissionDues || 0) > 0).length})</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            activeTab === "history"
              ? "bg-[#1F2421] text-white"
              : "bg-[#FAF8F5] text-[#5C6460] hover:text-[#1F2421]"
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل التسويات والتحويلات ({historyEntries.length})</span>
        </button>
      </div>

      {/* TAB 1: VENDORS SETTLEMENT */}
      {activeTab === "vendors" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Vendors Selector List */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs p-4 space-y-3 lg:col-span-1">
            <h3 className="font-bold text-xs text-[#1F2421] flex items-center gap-1.5 pb-2 border-b border-[#DFDCD5]">
              <Store className="w-4 h-4 text-[#B8752E]" />
              <span>قائمة التجار</span>
            </h3>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {vendors.map((v) => {
                const count = allOrders.filter(
                  (o) => o.vendorId === v._id && (o.status === "completed" || o.status === "delivered"),
                ).length;
                return (
                  <button
                    key={v._id}
                    onClick={() => {
                      setSelectedVendorId(v._id);
                      setSelectedOrderIds([]);
                    }}
                    className={`w-full text-right p-2.5 rounded-xl text-xs transition-colors border flex items-center justify-between ${
                      selectedVendorId === v._id
                        ? "bg-[#FAF8F5] border-[#B8752E] font-bold text-[#1F2421]"
                        : "border-transparent hover:bg-[#FAF8F5] text-[#5C6460]"
                    }`}
                  >
                    <div className="truncate">
                      <span className="block truncate">{v.storeName || v.name}</span>
                      <span className="text-[10px] text-[#8A928D] block">{v.area || "بنها"}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#ECEAE4] text-[#1F2421] font-bold">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Orders for selected vendor */}
          <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs p-5 space-y-4 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DFDCD5]">
              <div>
                <h3 className="font-bold text-sm text-[#1F2421]">
                  الطلبات الجاهزة للتسوية للتاجر:{" "}
                  <span className="text-[#B8752E]">
                    {vendors.find((v) => v._id === selectedVendorId)?.storeName ||
                      vendors.find((v) => v._id === selectedVendorId)?.name}
                  </span>
                </h3>
                <p className="text-xs text-[#5C6460]">
                  حدد الطلبات لتسجيل دفع مبالغها وإغلاق استحقاقها في السجلات
                </p>
              </div>

              {vendorOrders.length > 0 && (
                <button
                  onClick={handleSelectAllOrders}
                  className="text-xs text-[#B8752E] hover:underline flex items-center gap-1 font-semibold"
                >
                  {selectedOrderIds.length === vendorOrders.length ? (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>إلغاء تحديد الكل</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>تحديد الكل ({vendorOrders.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {vendorOrders.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#5C6460]">
                لا توجد طلبات مكتملة معلقة للتسوية لهذا التاجر حالياً.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                      <tr>
                        <th className="py-2.5 px-3 w-8"></th>
                        <th className="py-2.5 px-3">رقم الطلب</th>
                        <th className="py-2.5 px-3">السيارة والقطع</th>
                        <th className="py-2.5 px-3">سعر القطعة</th>
                        <th className="py-2.5 px-3">مستحق التاجر</th>
                        <th className="py-2.5 px-3">حالة العربون</th>
                        <th className="py-2.5 px-3">تاريخ الاكتمال</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECEAE4]">
                      {vendorOrders.map((o) => {
                        const isSelected = selectedOrderIds.includes(o._id);
                        const payout = o.vendorPayout || o.partPrice || 0;
                        return (
                          <tr
                            key={o._id}
                            onClick={() => handleToggleOrder(o._id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? "bg-[#FBF4EC]/60" : "hover:bg-[#FAF8F5]/80"
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded text-[#B8752E] focus:ring-0"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#1F2421]">
                              <Link
                                href={`/orders/${o._id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-[#B8752E]"
                              >
                                {o._id.slice(-6)}
                              </Link>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-[#1F2421] block">
                                {o.carBrand} {o.carModel} ({o.carYear})
                              </span>
                              <span className="text-[11px] text-[#5C6460] block truncate max-w-xs">
                                {o.items?.[0]?.title || "قطعة غيار"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 num-tabular text-[#5C6460]">
                              {o.partPrice} ج.م
                            </td>
                            <td className="py-2.5 px-3 num-tabular font-bold text-[#3F6B58]">
                              {payout} ج.م
                            </td>
                            <td className="py-2.5 px-3">
                              {(() => {
                                const meta = getDepositStatusMeta(o.depositStatus);
                                if (!meta) return null;
                                return (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}>
                                    {meta.label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-2.5 px-3 text-[#8A928D] font-mono text-[11px]">
                              {new Date(o.updatedAt).toLocaleDateString("ar-EG")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Settle Action Bar */}
                <div className="bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[11px] text-[#8A928D] block">الطلبات المحددة:</span>
                      <span className="text-sm font-bold text-[#1F2421]">
                        {selectedOrderIds.length} طلب
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#8A928D] block">إجمالي المستحق للصرف:</span>
                      <span className="text-base font-bold text-[#3F6B58] num-tabular">
                        {selectedTotal} ج.م
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="رقم مرجع التحويل / البنك (اختياري)..."
                      value={vendorRef}
                      onChange={(e) => setVendorRef(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] placeholder-[#8A928D] focus:outline-none focus:border-[#B8752E]"
                    />
                    <button
                      onClick={handlePromptVendorSettlement}
                      disabled={selectedOrderIds.length === 0}
                      className="px-4 py-2 bg-[#3F6B58] hover:bg-[#345949] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-xs"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>تسجيل السداد</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CRAFTSMEN COMMISSION DUES */}
      {activeTab === "craftsmen" && (
        <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden p-5 space-y-4">
          <div>
            <h3 className="font-bold text-sm text-[#1F2421]">
              مستحقات العمولات على الفنيين المعتمدين
            </h3>
            <p className="text-xs text-[#5C6460]">
              عمولات المنصة المستحقة عن عمليات التركيب المنجزة نقدياً عند الاستلام
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                <tr>
                  <th className="py-3 px-4">اسم الفني</th>
                  <th className="py-3 px-4">الورشة / التخصص</th>
                  <th className="py-3 px-4">رقم الهاتف</th>
                  <th className="py-3 px-4">المنطقة</th>
                  <th className="py-3 px-4">المهام المكتملة</th>
                  <th className="py-3 px-4">إجمالي العمولة المستحقة</th>
                  <th className="py-3 px-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEAE4]">
                {craftsmen.map((c) => (
                  <tr key={c._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#1F2421]">{c.name}</td>
                    <td className="py-3 px-4">
                      <span className="text-[#1F2421] block">{c.workshopName}</span>
                      <span className="text-[11px] text-[#8A928D] block">{c.specialty}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-left" dir="ltr">
                      {c.phone}
                    </td>
                    <td className="py-3 px-4 text-[#5C6460]">{c.area || "بنها"}</td>
                    <td className="py-3 px-4 num-tabular font-bold">{c.totalJobs || 0}</td>
                    <td className="py-3 px-4 num-tabular font-bold text-sm">
                      <span
                        className={
                          (c.commissionDues || 0) > 0 ? "text-[#A8452F]" : "text-[#3F6B58]"
                        }
                      >
                        {c.commissionDues || 0} ج.م
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(c.commissionDues || 0) > 0 ? (
                        <button
                          onClick={() => {
                            setSelectedCraftsman(c);
                            setCraftsmanAmount(c.commissionDues || 0);
                            setCraftsmanRef("");
                          }}
                          className="px-3 py-1 bg-[#B8752E] hover:bg-[#9E6122] text-white font-bold rounded-lg text-[11px] flex items-center gap-1 mx-auto"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>تسجيل تحصيل</span>
                        </button>
                      ) : (
                        <span className="text-[#3F6B58] text-[11px] font-bold">خالص المستحقات</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SETTLEMENT HISTORY */}
      {activeTab === "history" && (
        <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#DFDCD5]">
            <h3 className="font-bold text-sm text-[#1F2421]">سجل التحويلات والتسويات الصادرة</h3>
            <p className="text-xs text-[#5C6460]">
              قيود دفتر الأستاذ لحركات التسوية مع التجار والفنيين
            </p>
          </div>

          {historyEntries.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#5C6460]">
              لا توجد سجلات تسوية مسجلة في دفتر الأستاذ حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                  <tr>
                    <th className="py-3 px-4">معرف القيد</th>
                    <th className="py-3 px-4">الطرف المستفيد</th>
                    <th className="py-3 px-4">المبلغ</th>
                    <th className="py-3 px-4">رقم الطلب المرتبط</th>
                    <th className="py-3 px-4">البيان / مرجع التحويل</th>
                    <th className="py-3 px-4">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4]">
                  {historyEntries.map((e) => (
                    <tr key={e._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[#8A928D]">{e._id.slice(-8)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            e.partyType === "vendor"
                              ? "bg-[#FBF4EC] text-[#B8752E]"
                              : "bg-[#EDF5F1] text-[#3F6B58]"
                          }`}
                        >
                          {e.partyType === "vendor" ? "تاجر" : "فني"}
                        </span>
                        <span className="mr-2 font-mono text-[11px] text-[#5C6460]">
                          {e.partyId?.slice(-6)}
                        </span>
                      </td>
                      <td className="py-3 px-4 num-tabular font-bold text-[#3F6B58]">
                        {e.amount} ج.م
                      </td>
                      <td className="py-3 px-4">
                        {e.orderId ? (
                          <Link
                            href={`/orders/${e.orderId}`}
                            className="font-mono text-[#B8752E] hover:underline"
                          >
                            {e.orderId.slice(-6)}
                          </Link>
                        ) : (
                          <span className="text-[#8A928D]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#5C6460]">{e.reference || "تسوية مستحقات"}</td>
                      <td className="py-3 px-4 font-mono text-[#8A928D] text-[11px]">
                        {new Date(e.createdAt).toLocaleString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Craftsman Settlement Modal */}
      {selectedCraftsman && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-sm rounded-2xl border border-[#DFDCD5] shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-[#1F2421]">
              تسجيل تحصيل عمولة من: {selectedCraftsman.name}
            </h3>
            <p className="text-xs text-[#5C6460]">
              إجمالي العمولة المستحقة في حسابه: {selectedCraftsman.commissionDues || 0} ج.م
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  المبلغ المحصل (ج.م):
                </label>
                <input
                  type="number"
                  value={craftsmanAmount}
                  onChange={(e) => setCraftsmanAmount(Number(e.target.value))}
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl font-bold font-mono text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  المرجع / ملاحظة التحصيل:
                </label>
                <input
                  type="text"
                  placeholder="مثال: نقداً بالمقر، أو محفظة إلكترونية..."
                  value={craftsmanRef}
                  onChange={(e) => setCraftsmanRef(e.target.value)}
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#DFDCD5]">
              <button
                type="button"
                onClick={() => setSelectedCraftsman(null)}
                className="flex-1 py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white text-[#5C6460] font-semibold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handlePromptCraftsmanSettlement}
                disabled={craftsmanAmount <= 0}
                className="flex-1 py-2 px-3 bg-[#B8752E] hover:bg-[#9E6122] disabled:opacity-50 text-white font-bold rounded-xl text-xs"
              >
                تأكيد التحصيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
