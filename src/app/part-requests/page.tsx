"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PackageSearch,
  Search,
  RefreshCw,
  X,
  ExternalLink,
  Car,
  User,
  Store,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { AdminPartRequest, PartRequestAnswer } from "@/lib/types";

export default function AdminPartRequestsPage() {
  const [requests, setRequests] = useState<AdminPartRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Selected Detail Drawer
  const [selectedRequest, setSelectedRequest] = useState<AdminPartRequest | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [savingDetail, setSavingDetail] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listPartRequests({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        page,
        limit: 25,
      });
      setRequests(res.partRequests || []);
      setTotal(res.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenDetail = (req: AdminPartRequest) => {
    setSelectedRequest(req);
    setEditingStatus(req.status);
    setEditingNotes(req.adminNotes || "");
  };

  const handleSaveDetail = async () => {
    if (!selectedRequest) return;
    setSavingDetail(true);
    try {
      const res = await adminApi.updatePartRequest(selectedRequest._id, {
        status: editingStatus,
        adminNotes: editingNotes,
      });
      setSelectedRequest(res.partRequest);
      await fetchRequests();
      alert("تم تحديث الطلب بنجاح");
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل حفظ التحديثات");
    } finally {
      setSavingDetail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            مفتوح
          </span>
        );
      case "answered":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            تم الرد
          </span>
        );
      case "closed":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            مغلق
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
            ملغي
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-[#B8752E]" />
            <h1 className="text-xl font-bold text-[#1F2421]">طلبات قطع الغيار الخاصة</h1>
          </div>
          <p className="text-xs text-[#5C6460] mt-1">
            إدارة ومتابعة طلبات العملاء للقطع غير المتوفرة بالكتالوج، وعروض أسعار التجار وتدقيق الجدية
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: "جميع الطلبات", val: "" },
            { label: "مفتوحة", val: "open" },
            { label: "تم الرد عليها", val: "answered" },
            { label: "مغلقة", val: "closed" },
            { label: "ملغاة", val: "cancelled" },
          ].map((t) => (
            <button
              key={t.val}
              onClick={() => {
                setStatusFilter(t.val);
                setPage(1);
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === t.val
                  ? "bg-[#1F2421] text-white"
                  : "bg-[#FAF8F5] text-[#5C6460] hover:text-[#1F2421]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
          <input
            type="text"
            placeholder="بحث بالعميل أو السيارة أو وصف القطعة..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-3 pr-8 py-1.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] placeholder-[#8A928D] focus:outline-none focus:border-[#B8752E]"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5C6460] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
            <p>جاري تحميل طلبات القطع...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5C6460]">
            لا توجد طلبات قطع غيار مطابقة للبحث أو الفلتر.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                <tr>
                  <th className="py-3 px-4">تاريخ الطلب</th>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">بيانات السيارة</th>
                  <th className="py-3 px-4">وصف القطعة المطلوبة</th>
                  <th className="py-3 px-4 text-center">الصورة</th>
                  <th className="py-3 px-4 text-center">عروض التجار</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEAE4]">
                {requests.map((req) => (
                  <tr key={req._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="py-3 px-4 text-[#8A928D] font-mono text-[11px]">
                      {new Date(req.createdAt).toLocaleString("ar-EG")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#1F2421] block">
                        {req.customerId?.name || "عميل"}
                      </span>
                      <span className="font-mono text-[#5C6460] text-[11px]" dir="ltr">
                        {req.customerId?.phone || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1F2421]">
                      {req.carBrand} {req.carModel} ({req.carYear})
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[#5C6460]" title={req.partDescription}>
                      {req.partDescription}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {req.photoUrl ? (
                        <a
                          href={req.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B8752E] hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#8A928D]">بدون صورة</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF8F5] border border-[#DFDCD5] num-tabular">
                        {req.answersCount || req.answers?.length || 0} عروض
                      </span>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(req.status)}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenDetail(req)}
                        className="py-1 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-lg text-xs font-bold text-[#1F2421] shadow-xs"
                      >
                        معاينة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail & Edit Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-2xl rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div className="flex items-center gap-2">
                <PackageSearch className="w-5 h-5 text-[#B8752E]" />
                <h3 className="font-bold text-base text-[#1F2421]">
                  طلب قطعة #{selectedRequest._id.slice(-6).toUpperCase()}
                </h3>
                {getStatusBadge(selectedRequest.status)}
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Car Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl space-y-1">
                <span className="font-bold text-[#1F2421] block flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#B8752E]" />
                  <span>بيانات العميل:</span>
                </span>
                <p className="font-semibold">{selectedRequest.customerId?.name}</p>
                <p className="font-mono text-[#5C6460]" dir="ltr">
                  {selectedRequest.customerId?.phone}
                </p>
              </div>

              <div className="p-3 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl space-y-1">
                <span className="font-bold text-[#1F2421] block flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-[#B8752E]" />
                  <span>السيارة المستهدفة:</span>
                </span>
                <p className="font-semibold">
                  {selectedRequest.carBrand} {selectedRequest.carModel} ({selectedRequest.carYear})
                </p>
                <p className="text-[11px] text-[#8A928D]">
                  {new Date(selectedRequest.createdAt).toLocaleString("ar-EG")}
                </p>
              </div>
            </div>

            {/* Part Description & Photo */}
            <div className="p-4 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl space-y-3 text-xs">
              <div>
                <span className="font-bold text-[#1F2421] block mb-1">وصف ومواصفات القطعة:</span>
                <p className="text-[#1F2421] whitespace-pre-wrap leading-relaxed">
                  {selectedRequest.partDescription}
                </p>
              </div>

              {selectedRequest.photoUrl && (
                <div className="pt-2 border-t border-[#DFDCD5]">
                  <span className="font-bold text-[#1F2421] block mb-1">الصورة المرفقة من العميل:</span>
                  <a
                    href={selectedRequest.photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block"
                  >
                    <img
                      src={selectedRequest.photoUrl}
                      alt="Part request"
                      className="max-h-48 rounded-lg border border-[#DFDCD5] object-cover hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              )}
            </div>

            {/* Vendor Answers */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-[#1F2421] flex items-center gap-1.5">
                <Store className="w-4 h-4 text-[#B8752E]" />
                <span>عروض الأسعار المقدمة من التجار ({selectedRequest.answers?.length || 0}):</span>
              </h4>

              {!selectedRequest.answers || selectedRequest.answers.length === 0 ? (
                <div className="p-4 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#8A928D] text-center">
                  لم يقدم أي تاجر عرض سعر على هذا الطلب حتى الآن.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRequest.answers.map((ans, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-[#DFDCD5] rounded-xl text-xs flex items-center justify-between shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#1F2421] block">
                          {ans.vendorName}
                        </span>
                        <span className="font-mono text-[11px] text-[#5C6460]" dir="ltr">
                          {ans.vendorPhone}
                        </span>
                        {ans.notes && <p className="text-[11px] text-[#5C6460] mt-1">{ans.notes}</p>}
                      </div>

                      <div className="text-left space-y-1">
                        <span className="text-sm font-bold text-[#3F6B58] block num-tabular">
                          {ans.price} ج.م
                        </span>
                        <span className="text-[10px] text-[#8A928D] font-mono block">
                          {new Date(ans.createdAt).toLocaleTimeString("ar-EG")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Controls: Status & Notes */}
            <div className="p-4 bg-white border border-[#DFDCD5] rounded-xl space-y-3 text-xs">
              <h4 className="font-bold text-xs text-[#1F2421] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#B8752E]" />
                <span>إجراءات الرقابة والمتابعة الإدارية:</span>
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F2421] mb-1">
                    حالة الطلب:
                  </label>
                  <select
                    value={editingStatus}
                    onChange={(e) => setEditingStatus(e.target.value)}
                    className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs outline-none focus:border-[#B8752E]"
                  >
                    <option value="open">مفتوح (بانتظار العروض)</option>
                    <option value="answered">تم الرد (توجد عروض تجار)</option>
                    <option value="closed">مغلق (تم توفير القطعة أو اكتمالها)</option>
                    <option value="cancelled">ملغي من الإدارة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1F2421] mb-1">
                    ملاحظات الإدارة:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="ملاحظات داخلية للمتابعة..."
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs outline-none focus:border-[#B8752E]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveDetail}
                  disabled={savingDetail}
                  className="py-2 px-4 bg-[#B8752E] hover:bg-[#9E6122] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {savingDetail ? "جاري الحفظ..." : "حفظ التغييرات الإدارية"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
