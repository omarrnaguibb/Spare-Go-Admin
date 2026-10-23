"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Store,
  Wrench,
  Check,
  RefreshCw,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { AdminVendor, AdminCraftsman } from "@/lib/types";
import { ConfirmModal } from "@/components/confirm-modal";

export default function ApprovalsPage() {
  const { refreshPendingCounts } = useAdmin();

  const [activeTab, setActiveTab] = useState<"vendors" | "craftsmen">("vendors");
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "suspended" | "all">("pending");
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [craftsmen, setCraftsmen] = useState<AdminCraftsman[]>([]);
  const [loading, setLoading] = useState(true);

  // Action Modal State
  const [selectedEntity, setSelectedEntity] = useState<{
    id: string;
    name: string;
    type: "vendor" | "craftsman";
    targetStatus: "approved" | "suspended";
  } | null>(null);
  const [actionNote, setActionNote] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter === "all" ? undefined : statusFilter;
      const [vData, cData] = await Promise.all([
        adminApi.listVendors(statusParam),
        adminApi.listCraftsmen(statusParam),
      ]);
      setVendors(vData);
      setCraftsmen(cData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExecuteStatusChange = async () => {
    if (!selectedEntity) return;

    try {
      if (selectedEntity.type === "vendor") {
        await adminApi.updateVendorStatus(
          selectedEntity.id,
          selectedEntity.targetStatus,
          actionNote || undefined,
        );
      } else {
        await adminApi.updateCraftsmanStatus(
          selectedEntity.id,
          selectedEntity.targetStatus,
          actionNote || undefined,
        );
      }
      await refreshPendingCounts();
      setSelectedEntity(null);
      setActionNote("");
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل تحديث الحالة");
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F2421]">طلبات الاعتماد وتراخيص الحسابات</h1>
          <p className="text-xs text-[#5C6460]">
            مراجعة وتدقيق بيانات التجار ومقدمي خدمات التركيب قبل تفعيلهم على المنصة
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("vendors")}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === "vendors"
                ? "bg-[#1F2421] text-white"
                : "bg-[#FAF8F5] text-[#5C6460] hover:text-[#1F2421]"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>التجار والمحلات ({vendors.length})</span>
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
            <span>الفنيين والورش ({craftsmen.length})</span>
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#8A928D] ml-1">تصفية حسب الحالة:</span>
          {(["pending", "approved", "suspended", "all"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusFilter === st
                  ? "bg-[#B8752E] text-white"
                  : "bg-[#FAF8F5] text-[#5C6460] hover:bg-[#DFDCD5]"
              }`}
            >
              {st === "pending"
                ? "قيد المراجعة"
                : st === "approved"
                ? "معتمد"
                : st === "suspended"
                ? "معلق"
                : "الكل"}
            </button>
          ))}
        </div>
      </div>

      {/* Dense Table */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5C6460] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
            <p>جاري تحميل البيانات...</p>
          </div>
        ) : activeTab === "vendors" ? (
          /* Vendors Table */
          vendors.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#5C6460]">
              لا توجد حسابات تجار في هذا القسم حالياً.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                  <tr>
                    <th className="py-3 px-4">اسم التاجر / المحل</th>
                    <th className="py-3 px-4">رقم الهاتف</th>
                    <th className="py-3 px-4">المنطقة والعنوان</th>
                    <th className="py-3 px-4">الإنذارات (Strikes)</th>
                    <th className="py-3 px-4">التقييم</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-center">إجراءات الاعتماد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4]">
                  {vendors.map((v) => (
                    <tr key={v._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#1F2421] block">{v.storeName || v.name}</span>
                        <span className="text-[11px] text-[#8A928D] block">{v.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-left" dir="ltr">
                        {v.phone}
                      </td>
                      <td className="py-3 px-4 text-[#5C6460]">
                        {v.area || "بنها"} {v.address ? `— ${v.address}` : ""}
                      </td>
                      <td className="py-3 px-4 num-tabular">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          v.strikes > 0 ? "bg-[#FDF2F0] text-[#A8452F]" : "text-[#5C6460]"
                        }`}>
                          {v.strikes || 0} من ٣
                        </span>
                      </td>
                      <td className="py-3 px-4 num-tabular">
                        {v.rating ? `★ ${v.rating}` : "جديد"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          v.status === "approved"
                            ? "bg-[#EDF5F1] text-[#3F6B58]"
                            : v.status === "suspended"
                            ? "bg-[#FDF2F0] text-[#A8452F]"
                            : "bg-[#FBF4EC] text-[#B8752E]"
                        }`}>
                          {v.status === "approved" ? "معتمد" : v.status === "suspended" ? "معلق" : "قيد المراجعة"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {v.status !== "approved" && (
                            <button
                              onClick={() =>
                                setSelectedEntity({
                                  id: v._id,
                                  name: v.storeName || v.name,
                                  type: "vendor",
                                  targetStatus: "approved",
                                })
                              }
                              className="px-2.5 py-1 bg-[#3F6B58] hover:bg-[#345949] text-white font-bold rounded-lg text-[11px] flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>اعتماد</span>
                            </button>
                          )}
                          {v.status !== "suspended" && (
                            <button
                              onClick={() =>
                                setSelectedEntity({
                                  id: v._id,
                                  name: v.storeName || v.name,
                                  type: "vendor",
                                  targetStatus: "suspended",
                                })
                              }
                              className="px-2.5 py-1 bg-white border border-[#A8452F] text-[#A8452F] hover:bg-[#FDF2F0] font-bold rounded-lg text-[11px]"
                            >
                              تعليق الحساب
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Craftsmen Table */
          craftsmen.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#5C6460]">
              لا توجد حسابات فنيين في هذا القسم حالياً.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                  <tr>
                    <th className="py-3 px-4">اسم الفني / الورشة</th>
                    <th className="py-3 px-4">التخصص</th>
                    <th className="py-3 px-4">الهاتف</th>
                    <th className="py-3 px-4">المنطقة</th>
                    <th className="py-3 px-4">المهام المنجزة</th>
                    <th className="py-3 px-4">العمولات المستحقة</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-center">إجراءات الاعتماد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4]">
                  {craftsmen.map((c) => (
                    <tr key={c._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#1F2421] block">{c.name}</span>
                        <span className="text-[11px] text-[#8A928D] block">{c.workshopName}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#B8752E]">
                        {c.specialty === "mechanic"
                          ? "ميكانيكا"
                          : c.specialty === "electrician"
                          ? "كهرباء"
                          : c.specialty === "tires"
                          ? "إطارات وعفشة"
                          : c.specialty}
                      </td>
                      <td className="py-3 px-4 font-mono text-left" dir="ltr">
                        {c.phone}
                      </td>
                      <td className="py-3 px-4 text-[#5C6460]">{c.area || "بنها"}</td>
                      <td className="py-3 px-4 num-tabular font-bold">{c.totalJobs || 0}</td>
                      <td className="py-3 px-4 num-tabular font-bold text-[#A8452F]">
                        {c.commissionDues || 0} ج.م
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          c.status === "approved"
                            ? "bg-[#EDF5F1] text-[#3F6B58]"
                            : c.status === "suspended"
                            ? "bg-[#FDF2F0] text-[#A8452F]"
                            : "bg-[#FBF4EC] text-[#B8752E]"
                        }`}>
                          {c.status === "approved" ? "معتمد" : c.status === "suspended" ? "معلق" : "قيد المراجعة"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {c.status !== "approved" && (
                            <button
                              onClick={() =>
                                setSelectedEntity({
                                  id: c._id,
                                  name: c.name,
                                  type: "craftsman",
                                  targetStatus: "approved",
                                })
                              }
                              className="px-2.5 py-1 bg-[#3F6B58] hover:bg-[#345949] text-white font-bold rounded-lg text-[11px] flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>اعتماد</span>
                            </button>
                          )}
                          {c.status !== "suspended" && (
                            <button
                              onClick={() =>
                                setSelectedEntity({
                                  id: c._id,
                                  name: c.name,
                                  type: "craftsman",
                                  targetStatus: "suspended",
                                })
                              }
                              className="px-2.5 py-1 bg-white border border-[#A8452F] text-[#A8452F] hover:bg-[#FDF2F0] font-bold rounded-lg text-[11px]"
                            >
                              تعليق الحساب
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Confirmation & Note Modal */}
      {selectedEntity && (
        <ConfirmModal
          isOpen={true}
          title={
            selectedEntity.targetStatus === "approved"
              ? `تأكيد اعتماد ${selectedEntity.name}`
              : `تأكيد تعليق حساب ${selectedEntity.name}`
          }
          message={`هل أنت متأكد من تغيير حالة حساب ${selectedEntity.name} إلى "${
            selectedEntity.targetStatus === "approved" ? "معتمد ومفعل" : "معلق ومحظور مؤقتاً"
          }"؟`}
          confirmText={selectedEntity.targetStatus === "approved" ? "اعتماد الحساب" : "تعليق الحساب"}
          isDestructive={selectedEntity.targetStatus === "suspended"}
          onConfirm={handleExecuteStatusChange}
          onCancel={() => setSelectedEntity(null)}
        />
      )}
    </div>
  );
}
