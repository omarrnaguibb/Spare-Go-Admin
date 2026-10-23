"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  AlertTriangle,
  Lock,
  RefreshCw,
  ChevronLeft,
  ShieldAlert,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { AdminOrder, AdminVendor } from "@/lib/types";
import { getDepositStatusMeta } from "@/lib/deposit-status";

export default function LiveOrdersBoard() {
  const [now, setNow] = useState(() => Date.now());
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [vendorFilter, setVendorFilter] = useState<string>("");
  const [flagFilter, setFlagFilter] = useState<boolean | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersData, vendorsData] = await Promise.all([
        adminApi.listOrders({
          status: statusFilter || undefined,
          vendorId: vendorFilter || undefined,
          isFlagged: flagFilter,
        }),
        adminApi.listVendors(),
      ]);
      setOrders(ordersData);
      setVendors(vendorsData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter, vendorFilter, flagFilter]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 20s for live monitoring
    const interval = setInterval(fetchData, 20000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(tick);
    };
  }, [fetchData]);

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const orderNum = (o.orderNumber || o._id).toLowerCase();
    const car = `${o.carBrand} ${o.carModel}`.toLowerCase();
    const customer = (o.customerName || o.customerPhone || "").toLowerCase();
    return orderNum.includes(q) || car.includes(q) || customer.includes(q);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_vendor":
        return <span className="px-2 py-0.5 bg-[#FAF8F5] text-[#5C6460] rounded text-[11px] font-bold">بانتظار المحل</span>;
      case "confirmed":
        return <span className="px-2 py-0.5 bg-[#FBF4EC] text-[#B8752E] rounded text-[11px] font-bold">تم تأكيد المحل</span>;
      case "pending_quotes":
        return <span className="px-2 py-0.5 bg-[#FBF4EC] text-[#B8752E] rounded text-[11px] font-bold">استقبال عروض الفنيين</span>;
      case "craftsman_assigned":
        return <span className="px-2 py-0.5 bg-[#EDF5F1] text-[#3F6B58] rounded text-[11px] font-bold">تم تعيين فني</span>;
      case "part_inspection":
        return <span className="px-2 py-0.5 bg-[#FBF4EC] text-[#B8752E] rounded text-[11px] font-bold">فحص القطعة بالمحل</span>;
      case "out_for_delivery":
        return <span className="px-2 py-0.5 bg-[#EDF5F1] text-[#3F6B58] rounded text-[11px] font-bold animate-pulse">قيد التوصيل والتركيب</span>;
      case "delivered":
        return <span className="px-2 py-0.5 bg-[#EDF5F1] text-[#3F6B58] rounded text-[11px] font-bold">مكتمل ومسلم</span>;
      case "awaiting_customer_approval":
        return <span className="px-2 py-0.5 bg-[#FDF2F0] text-[#A8452F] rounded text-[11px] font-bold">انتظار موافقة العميل</span>;
      case "cancelled":
        return <span className="px-2 py-0.5 bg-[#FDF2F0] text-[#A8452F] rounded text-[11px] font-bold">ملغي</span>;
      default:
        return <span className="px-2 py-0.5 bg-[#FAF8F5] text-[#5C6460] rounded text-[11px] font-bold">{status}</span>;
    }
  };

  const getDeadlineRemaining = (order: AdminOrder) => {
    let target: string | undefined;
    if (order.status === "pending_vendor") target = order.respondBy;
    else if (order.status === "pending_quotes") target = order.quotesDeadline;

    if (!target) return null;

    const diff = new Date(target).getTime() - now;
    if (diff <= 0) {
      return <span className="text-[#A8452F] font-bold text-[10px]">انتهت المهلة</span>;
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return (
      <span className="font-mono text-[11px] text-[#B8752E] font-bold num-tabular">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-[#3F6B58] animate-ping" />
          <div>
            <h1 className="text-xl font-bold text-[#1F2421]">لوحة متابعة الطلبات الحية (Live Board)</h1>
            <p className="text-xs text-[#5C6460]">
              رصد جميع مراحل تنفيذ الطلبات ومهل الاستجابة ومؤشرات التوقف والأخطاء فورياً
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث فوري</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="بحث برقم الطلب، السيارة، أو هاتف العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 px-3 pl-9 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs focus:bg-white focus:border-[#B8752E] outline-none"
            />
            <Search className="w-4 h-4 text-[#8A928D] absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] outline-none focus:border-[#B8752E]"
          >
            <option value="">كل الحالات</option>
            <option value="pending_vendor">بانتظار المحل</option>
            <option value="confirmed">تم تأكيد المحل</option>
            <option value="pending_quotes">عروض الفنيين</option>
            <option value="craftsman_assigned">تم تعيين فني</option>
            <option value="part_inspection">فحص القطعة</option>
            <option value="out_for_delivery">قيد التوصيل والتركيب</option>
            <option value="delivered">مكتمل</option>
            <option value="awaiting_customer_approval">بانتظار موافقة العميل</option>
            <option value="cancelled">ملغي</option>
          </select>

          {/* Vendor Select */}
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="h-10 px-3 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] outline-none focus:border-[#B8752E]"
          >
            <option value="">كل التجار</option>
            {vendors.map((v) => (
              <option key={v._id} value={v._id}>
                {v.storeName || v.name} ({v.area || "بنها"})
              </option>
            ))}
          </select>

          {/* Flags Toggle */}
          <button
            type="button"
            onClick={() => setFlagFilter(flagFilter ? undefined : true)}
            className={`h-10 px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
              flagFilter
                ? "bg-[#FDF2F0] border-[#A8452F] text-[#A8452F]"
                : "bg-[#FAF8F5] border-[#DFDCD5] text-[#5C6460] hover:text-[#1F2421]"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>طلبات بها بلاغات / متوقفة</span>
          </button>
        </div>
      </div>

      {/* Dense Table */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5C6460] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
            <p>جاري تحديث لوحة الطلبات...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5C6460]">
            لا توجد طلبات تطابق معايير التصفية المحددة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                <tr>
                  <th className="py-3 px-3">رقم الطلب</th>
                  <th className="py-3 px-3">السيارة</th>
                  <th className="py-3 px-3">القطعة والإجمالي</th>
                  <th className="py-3 px-3">المحل (التاجر)</th>
                  <th className="py-3 px-3">الفني</th>
                  <th className="py-3 px-3">الحالة والمهلة</th>
                  <th className="py-3 px-3">العربون</th>
                  <th className="py-3 px-3">علامات التحذير (Flags)</th>
                  <th className="py-3 px-3 text-center">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEAE4]">
                {filteredOrders.map((ord) => {
                  const hasPartIssue = ord.partIssues && ord.partIssues.length > 0;
                  const hasLockedCode = ord.completionLocked;
                  const isStuck = ord.isFlagged;
                  const isAwaitingApproval = ord.status === "awaiting_customer_approval";

                  return (
                    <tr
                      key={ord._id}
                      className={`hover:bg-[#FAF8F5]/80 transition-colors ${
                        isStuck || hasLockedCode || isAwaitingApproval ? "bg-[#FDF2F0]/30" : ""
                      }`}
                    >
                      {/* Order Number & Time */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[#1F2421] block">
                          #{ord.orderNumber || ord._id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-[10px] text-[#8A928D] block">
                          {new Date(ord.createdAt).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* Car */}
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-[#1F2421] block">
                          {ord.carBrand} {ord.carModel}
                        </span>
                        <span className="text-[10px] text-[#8A928D] block">{ord.carYear}</span>
                      </td>

                      {/* Part & Price */}
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-[#1F2421] block truncate max-w-[150px]">
                          {ord.items?.[0]?.title || "قطعة غيار"}
                        </span>
                        <span className="text-[11px] font-bold text-[#B8752E] num-tabular">
                          {ord.totalPrice} ج.م
                        </span>
                      </td>

                      {/* Shop */}
                      <td className="py-2.5 px-3 text-[#5C6460]">
                        <span className="font-semibold text-[#1F2421] block">
                          {ord.shop?.name || "المحل"}
                        </span>
                        <span className="text-[10px] text-[#8A928D] block">{ord.shop?.area || "بنها"}</span>
                      </td>

                      {/* Craftsman */}
                      <td className="py-2.5 px-3 text-[#5C6460]">
                        {ord.craftsmanId ? (
                          <span className="font-semibold text-[#3F6B58] block">معيّن</span>
                        ) : ord.orderType === "with_craftsman" ? (
                          <span className="text-[11px] text-[#B8752E]">
                            عروض: {ord.quotes?.length || 0}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#8A928D]">قطع فقط</span>
                        )}
                      </td>

                      {/* Status & Deadline countdown */}
                      <td className="py-2.5 px-3 space-y-1">
                        <div>{getStatusBadge(ord.status)}</div>
                        <div>{getDeadlineRemaining(ord)}</div>
                      </td>

                      {/* Order Deposit Status */}
                      <td className="py-2.5 px-3">
                        {(() => {
                          const meta = getDepositStatusMeta(ord.depositStatus);
                          if (!meta) return null;
                          return (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                            >
                              {meta.label}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Warning Flags */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {isStuck && (
                            <span className="px-1.5 py-0.5 bg-[#FDF2F0] text-[#A8452F] rounded text-[10px] font-bold flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              <span>متوقف</span>
                            </span>
                          )}
                          {hasLockedCode && (
                            <span className="px-1.5 py-0.5 bg-[#FDF2F0] text-[#A8452F] rounded text-[10px] font-bold flex items-center gap-0.5">
                              <Lock className="w-3 h-3" />
                              <span>كود مقفول</span>
                            </span>
                          )}
                          {hasPartIssue && (
                            <span className="px-1.5 py-0.5 bg-[#FBF4EC] text-[#B8752E] rounded text-[10px] font-bold flex items-center gap-0.5">
                              <ShieldAlert className="w-3 h-3" />
                              <span>عيب قطعة</span>
                            </span>
                          )}
                          {isAwaitingApproval && (
                            <span className="px-1.5 py-0.5 bg-[#FDF2F0] text-[#A8452F] rounded text-[10px] font-bold">
                              موافقة سعر
                            </span>
                          )}
                          {!isStuck && !hasLockedCode && !hasPartIssue && !isAwaitingApproval && (
                            <span className="text-[10px] text-[#8A928D]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <Link
                          href={`/orders/${ord._id}`}
                          className="px-2.5 py-1 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-lg text-xs font-bold text-[#1F2421] inline-flex items-center gap-1 shadow-xs"
                        >
                          <span>عرض</span>
                          <ChevronLeft className="w-3 h-3" />
                        </Link>
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
