"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Store,
  Wrench,
  User,
  Plus,
  RefreshCw,
  Search,
  X,
  KeyRound,
  Check,
  Copy,
  AlertTriangle,
  Sparkles,
  Percent,
  Shield,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { AdminVendor, AdminCraftsman, AdminCustomer } from "@/lib/types";

function generateTemporaryPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let randomStr = "";
  for (let i = 0; i < 4; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Sp@${randomStr}26`;
}

export default function UsersPage() {
  const { admin } = useAdmin();
  const [activeTab, setActiveTab] = useState<"vendors" | "craftsmen" | "customers" | "admins">("vendors");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [craftsmen, setCraftsmen] = useState<AdminCraftsman[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);

  // Create craftsman modal
  const [isCreateCraftsmanOpen, setIsCreateCraftsmanOpen] = useState(false);
  const [creatingCraftsman, setCreatingCraftsman] = useState(false);
  const [newCraftsman, setNewCraftsman] = useState({
    name: "",
    phone: "",
    password: generateTemporaryPassword(),
    specialty: "mechanic",
    workshopName: "",
    area: "بنها",
  });

  // Create vendor modal
  const [isCreateVendorOpen, setIsCreateVendorOpen] = useState(false);
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: "",
    phone: "",
    storeName: "",
    location: "بنها",
    temporaryPassword: generateTemporaryPassword(),
  });

  // Password reset modal
  const [resetTarget, setResetTarget] = useState<{
    id: string;
    name: string;
    role: "vendor" | "craftsman";
    phone: string;
  } | null>(null);
  const [tempPasswordInput, setTempPasswordInput] = useState("");
  const [resetting, setResetting] = useState(false);

  // Single-view copy modal
    // Commission override modal
  const [commissionTarget, setCommissionTarget] = useState<{
    id: string;
    name: string;
    role: "vendor" | "craftsman";
    currentRate?: number;
    source?: string;
    hasOverride: boolean;
    overrideRate?: number;
    overrideReason?: string;
    overrideExpiresAt?: string;
  } | null>(null);
  const [overrideRateInput, setOverrideRateInput] = useState<string>("");
  const [overrideReasonInput, setOverrideReasonInput] = useState("");
  const [overrideExpiryInput, setOverrideExpiryInput] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);

  const handleOpenCommissionModal = (target: {
    id: string;
    name: string;
    role: "vendor" | "craftsman";
    effectiveRate?: number;
    source?: string;
    override?: { rate: number; reason: string; expiresAt?: string } | null;
  }) => {
    setCommissionTarget({
      id: target.id,
      name: target.name,
      role: target.role,
      currentRate: target.effectiveRate,
      source: target.source,
      hasOverride: Boolean(target.override),
      overrideRate: target.override?.rate,
      overrideReason: target.override?.reason,
      overrideExpiresAt: target.override?.expiresAt,
    });
    setOverrideRateInput(target.override ? String(target.override.rate) : "");
    setOverrideReasonInput(target.override?.reason || "");
    setOverrideExpiryInput(
      target.override?.expiresAt
        ? new Date(target.override.expiresAt).toISOString().split("T")[0]
        : ""
    );
  };

  const handleSaveCommissionOverride = async () => {
    if (!commissionTarget) return;
    const rateNum = Number(overrideRateInput);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      alert("يرجى إدخال نسبة صحيحة بين 0 و 100%");
      return;
    }
    if (!overrideReasonInput.trim()) {
      alert("سبب التحديد إلزامي للتوثيق المحاسبي والإداري");
      return;
    }

    setSavingCommission(true);
    try {
      const dto = {
        rate: rateNum,
        reason: overrideReasonInput.trim(),
        expiresAt: overrideExpiryInput ? new Date(overrideExpiryInput).toISOString() : undefined,
      };
      if (commissionTarget.role === "vendor") {
        await adminApi.setVendorCommission(commissionTarget.id, dto);
      } else {
        await adminApi.setCraftsmanCommission(commissionTarget.id, dto);
      }
      setCommissionTarget(null);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل حفظ نسبة العمولة");
    } finally {
      setSavingCommission(false);
    }
  };

  const handleClearCommissionOverride = async () => {
    if (!commissionTarget) return;
    const reason = prompt("يرجى كتابة سبب إلغاء العمولة الخاصة والعودة للعامة:");
    if (!reason || !reason.trim()) return;

    setSavingCommission(true);
    try {
      const dto = { clear: true, reason: reason.trim() };
      if (commissionTarget.role === "vendor") {
        await adminApi.setVendorCommission(commissionTarget.id, dto);
      } else {
        await adminApi.setCraftsmanCommission(commissionTarget.id, dto);
      }
      setCommissionTarget(null);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل إلغاء العمولة الخاصة");
    } finally {
      setSavingCommission(false);
    }
  };

  const [copyModalData, setCopyModalData] = useState<{
    name: string;
    phone: string;
    role: string;
    temporaryPassword: string;
    isNewUser: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vData, cData, custData] = await Promise.all([
        adminApi.listVendors(),
        adminApi.listCraftsmen(),
        adminApi.listCustomers(),
      ]);
      setVendors(vData);
      setCraftsmen(cData);
      setCustomers(custData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCraftsman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCraftsman.name || !newCraftsman.phone || !newCraftsman.password) {
      alert("يرجى ملء جميع الحقول الإلزامية");
      return;
    }

    setCreatingCraftsman(true);
    try {
      await adminApi.createCraftsman(newCraftsman);
      const savedPassword = newCraftsman.password;
      const savedName = newCraftsman.name;
      const savedPhone = newCraftsman.phone;

      setIsCreateCraftsmanOpen(false);
      setNewCraftsman({
        name: "",
        phone: "",
        password: generateTemporaryPassword(),
        specialty: "mechanic",
        workshopName: "",
        area: "بنها",
      });
      await fetchData();
      setActiveTab("craftsmen");

      // Show copy modal
      setCopyModalData({
        name: savedName,
        phone: savedPhone,
        role: "فني تركيب",
        temporaryPassword: savedPassword,
        isNewUser: true,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل إنشاء حساب الفني");
    } finally {
      setCreatingCraftsman(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.name || !newVendor.phone || !newVendor.storeName || !newVendor.temporaryPassword) {
      alert("يرجى ملء جميع الحقول الإلزامية");
      return;
    }

    setCreatingVendor(true);
    try {
      await adminApi.createVendor(newVendor);
      const savedPassword = newVendor.temporaryPassword;
      const savedName = newVendor.storeName || newVendor.name;
      const savedPhone = newVendor.phone;

      setIsCreateVendorOpen(false);
      setNewVendor({
        name: "",
        phone: "",
        storeName: "",
        location: "بنها",
        temporaryPassword: generateTemporaryPassword(),
      });
      await fetchData();
      setActiveTab("vendors");

      // Show copy modal
      setCopyModalData({
        name: savedName,
        phone: savedPhone,
        role: "تاجر قطع غيار",
        temporaryPassword: savedPassword,
        isNewUser: true,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل إنشاء حساب التاجر");
    } finally {
      setCreatingVendor(false);
    }
  };

  const handleOpenResetModal = (
    id: string,
    name: string,
    phone: string,
    role: "vendor" | "craftsman",
  ) => {
    setResetTarget({ id, name, role, phone });
    setTempPasswordInput(generateTemporaryPassword());
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || !tempPasswordInput) return;

    setResetting(true);
    try {
      if (resetTarget.role === "vendor") {
        await adminApi.resetVendorPassword(resetTarget.id, tempPasswordInput);
      } else {
        await adminApi.resetCraftsmanPassword(resetTarget.id, tempPasswordInput);
      }

      const savedData = {
        name: resetTarget.name,
        phone: resetTarget.phone,
        role: resetTarget.role === "vendor" ? "تاجر" : "فني",
        temporaryPassword: tempPasswordInput,
        isNewUser: false,
      };

      setResetTarget(null);
      setTempPasswordInput("");
      await fetchData();

      // Show copy modal
      setCopyModalData(savedData);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل إعادة تعيين كلمة المرور");
    } finally {
      setResetting(false);
    }
  };

  const handleCopyPassword = () => {
    if (!copyModalData?.temporaryPassword) return;
    navigator.clipboard.writeText(copyModalData.temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredVendors = useMemo(() => {
    if (!searchQuery) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.storeName?.toLowerCase().includes(q) ||
        v.phone?.includes(q),
    );
  }, [vendors, searchQuery]);

  const filteredCraftsmen = useMemo(() => {
    if (!searchQuery) return craftsmen;
    const q = searchQuery.toLowerCase();
    return craftsmen.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.workshopName?.toLowerCase().includes(q) ||
        c.phone?.includes(q),
    );
  }, [craftsmen, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.phone?.includes(q),
    );
  }, [customers, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1F2421]">دليل الحسابات والمستخدمين</h1>
          <p className="text-xs text-[#5C6460]">
            إدارة حسابات شبكة سبير جو (التجار، فنيو التركيب، والعملاء) وإصدار الحسابات المعتمدة وإعادة تعيين كلمات المرور
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setNewVendor({
                name: "",
                phone: "",
                storeName: "",
                location: "بنها",
                temporaryPassword: generateTemporaryPassword(),
              });
              setIsCreateVendorOpen(true);
            }}
            className="py-2 px-3.5 bg-[#1F2421] hover:bg-[#2b332e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إنشاء تاجر جديد</span>
          </button>
          <button
            onClick={() => {
              setNewCraftsman({
                name: "",
                phone: "",
                password: generateTemporaryPassword(),
                specialty: "mechanic",
                workshopName: "",
                area: "بنها",
              });
              setIsCreateCraftsmanOpen(true);
            }}
            className="py-2 px-3.5 bg-[#B8752E] hover:bg-[#9E6122] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إنشاء فني معتمد</span>
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

      {/* Tabs & Search Bar */}
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
            <span>التجار ({vendors.length})</span>
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
            <span>فنيو التركيب ({craftsmen.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("admins")}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === "admins"
                ? "bg-[#1F2421] text-white"
                : "bg-[#FAF8F5] text-[#5C6460] hover:text-[#1F2421]"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>المشرفين (الإدارة)</span>
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === "customers"
                ? "bg-[#1F2421] text-white"
                : "bg-[#FAF8F5] text-[#5C6460] hover:text-[#1F2421]"
            }`}
          >
            <User className="w-4 h-4" />
            <span>العملاء ({customers.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف أو المحل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#1F2421] placeholder-[#8A928D] focus:outline-none focus:border-[#B8752E]"
          />
        </div>
      </div>

      {/* Main Content Table */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5C6460] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
            <p>جاري تحميل قائمة المستخدمين...</p>
          </div>
        ) : activeTab === "vendors" ? (
          /* Vendors List */
          filteredVendors.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#5C6460]">لا توجد حسابات تجار مطابقة.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                  <tr>
                    <th className="py-3 px-4">اسم المحل / التاجر</th>
                    <th className="py-3 px-4">رقم الهاتف</th>
                    <th className="py-3 px-4">المنطقة</th>
                    <th className="py-3 px-4">الإنذارات</th>
                    <th className="py-3 px-4">التقييم</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">نسبة العمولة</th>
                    <th className="py-3 px-4">تاريخ الانضمام</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4]">
                  {filteredVendors.map((v) => (
                    <tr key={v._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#1F2421] block">{v.storeName || v.name}</span>
                        <span className="text-[11px] text-[#8A928D] block">{v.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-left" dir="ltr">
                        {v.phone}
                      </td>
                      <td className="py-3 px-4 text-[#5C6460]">{v.area || "بنها"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            v.strikes > 0 ? "bg-[#FDF2F0] text-[#A8452F]" : "text-[#5C6460]"
                          }`}
                        >
                          {v.strikes || 0} من ٣
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#B8752E]">
                        {v.rating ? `★ ${v.rating}` : "جديد"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              v.status === "approved"
                                ? "bg-[#EDF5F1] text-[#3F6B58]"
                                : v.status === "suspended"
                                ? "bg-[#FDF2F0] text-[#A8452F]"
                                : "bg-[#FBF4EC] text-[#B8752E]"
                            }`}
                          >
                            {v.status === "approved" ? "معتمد" : v.status === "suspended" ? "معلق" : "قيد المراجعة"}
                          </span>
                          {v.mustChangePassword && (
                            <span className="px-1.5 py-0.2 text-[9px] bg-[#FDF2F0] text-[#A8452F] font-semibold rounded">
                              مطلوب تغيير المرور
                            </span>
                          )}
                        </div>
                      </td>
                                            <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#1F2421] num-tabular">
                            {v.effectiveCommissionRate !== undefined ? `${v.effectiveCommissionRate}%` : "2%"}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            v.commissionOverride
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : v.commissionSource === "free_window"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                          }`}>
                            {v.commissionOverride ? "خاصة" : v.commissionSource === "free_window" ? "فترة إعفاء" : "عامة"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#8A928D] text-[11px]">
                        {new Date(v.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() =>
                            handleOpenCommissionModal({
                              id: v._id,
                              name: v.storeName || v.name,
                              role: "vendor",
                              effectiveRate: v.effectiveCommissionRate,
                              source: v.commissionSource,
                              override: v.commissionOverride,
                            })
                          }
                          title="تحديد نسبة عمولة خاصة"
                          className="py-1 px-2.5 bg-[#FAF8F5] border border-[#DFDCD5] hover:border-[#B8752E] hover:text-[#B8752E] rounded-lg text-[11px] font-bold text-[#1F2421] inline-flex items-center gap-1 transition-colors ml-1.5"
                        >
                          <Percent className="w-3.5 h-3.5 text-[#B8752E]" />
                          <span>عمولة خاصة</span>
                        </button>
                        <button
                          onClick={() =>
                            handleOpenResetModal(
                              v._id,
                              v.storeName || v.name,
                              v.phone,
                              "vendor",
                            )
                          }
                          title="إعادة تعيين كلمة المرور"
                          className="py-1 px-2.5 bg-[#FAF8F5] border border-[#DFDCD5] hover:border-[#B8752E] hover:text-[#B8752E] rounded-lg text-[11px] font-bold text-[#1F2421] inline-flex items-center gap-1 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-[#B8752E]" />
                          <span>إعادة تعيين المرور</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === "craftsmen" ? (
          /* Craftsmen List */
          filteredCraftsmen.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#5C6460]">لا توجد حسابات فنيين مطابقة.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                  <tr>
                    <th className="py-3 px-4">اسم الفني والورشة</th>
                    <th className="py-3 px-4">التخصص</th>
                    <th className="py-3 px-4">الهاتف</th>
                    <th className="py-3 px-4">المنطقة</th>
                    <th className="py-3 px-4">المهام المنجزة</th>
                    <th className="py-3 px-4">العمولات المستحقة</th>
                    <th className="py-3 px-4">التقييم</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4]">
                  {filteredCraftsmen.map((c) => (
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
                          ? "عفشة وإطارات"
                          : c.specialty}
                      </td>
                      <td className="py-3 px-4 font-mono text-left" dir="ltr">
                        {c.phone}
                      </td>
                      <td className="py-3 px-4 text-[#5C6460]">{c.area || "بنها"}</td>
                      <td className="py-3 px-4 num-tabular font-bold">{c.totalJobs || 0}</td>
                                            <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#1F2421] num-tabular">
                            {c.effectiveCommissionRate !== undefined ? `${c.effectiveCommissionRate}%` : "10%"}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            c.commissionOverride
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : c.commissionSource === "free_window"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                          }`}>
                            {c.commissionOverride ? "خاصة" : c.commissionSource === "free_window" ? "فترة إعفاء" : "عامة"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 num-tabular font-bold text-[#A8452F]">
                        {c.commissionDues || 0} ج.م
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#B8752E]">
                        {c.rating ? `★ ${c.rating}` : "جديد"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === "approved"
                                ? "bg-[#EDF5F1] text-[#3F6B58]"
                                : c.status === "suspended"
                                ? "bg-[#FDF2F0] text-[#A8452F]"
                                : "bg-[#FBF4EC] text-[#B8752E]"
                            }`}
                          >
                            {c.status === "approved" ? "معتمد" : c.status === "suspended" ? "معلق" : "قيد المراجعة"}
                          </span>
                          {c.mustChangePassword && (
                            <span className="px-1.5 py-0.2 text-[9px] bg-[#FDF2F0] text-[#A8452F] font-semibold rounded">
                              مطلوب تغيير المرور
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() =>
                            handleOpenCommissionModal({
                              id: c._id,
                              name: c.name,
                              role: "craftsman",
                              effectiveRate: c.effectiveCommissionRate,
                              source: c.commissionSource,
                              override: c.commissionOverride,
                            })
                          }
                          title="تحديد نسبة عمولة خاصة"
                          className="py-1 px-2.5 bg-[#FAF8F5] border border-[#DFDCD5] hover:border-[#B8752E] hover:text-[#B8752E] rounded-lg text-[11px] font-bold text-[#1F2421] inline-flex items-center gap-1 transition-colors ml-1.5"
                        >
                          <Percent className="w-3.5 h-3.5 text-[#B8752E]" />
                          <span>عمولة خاصة</span>
                        </button>
                        <button
                          onClick={() =>
                            handleOpenResetModal(
                              c._id,
                              c.name,
                              c.phone,
                              "craftsman",
                            )
                          }
                          title="إعادة تعيين كلمة المرور"
                          className="py-1 px-2.5 bg-[#FAF8F5] border border-[#DFDCD5] hover:border-[#B8752E] hover:text-[#B8752E] rounded-lg text-[11px] font-bold text-[#1F2421] inline-flex items-center gap-1 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-[#B8752E]" />
                          <span>إعادة تعيين المرور</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          activeTab === "admins" ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#B8752E] shrink-0 mt-0.5" />
              <div className="text-xs text-[#5C6460] leading-relaxed">
                قائمة المشرفين المعتمدين على لوحة التحكم. المشرف الأساسي يمتلك تلقائياً صلاحية تعديل الإعدادات والسياسات المالية (canEditSettings=true)، وتُمنح الصلاحيات لإدارة المخاطر والسيولة.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                  <tr>
                    <th className="py-3 px-4">اسم المشرف</th>
                    <th className="py-3 px-4">رقم الهاتف</th>
                    <th className="py-3 px-4">الدور</th>
                    <th className="py-3 px-4">صلاحية تعديل الإعدادات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4]">
                  <tr className="hover:bg-[#FAF8F5]/80">
                    <td className="py-3 px-4 font-bold text-[#1F2421]">
                      {admin?.name || "المشرف الرئيسي"}
                    </td>
                    <td className="py-3 px-4 font-mono text-left" dir="ltr">
                      {admin?.phone || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1F2421] text-white">
                        {admin?.role || "admin"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        admin?.canEditSettings !== false
                          ? "bg-[#EDF5F1] text-[#3F6B58] border border-[#3F6B58]/30"
                          : "bg-[#FDF2F0] text-[#A8452F] border border-[#A8452F]/30"
                      }`}>
                        {admin?.canEditSettings !== false ? "✓ مصرح له بتعديل الإعدادات" : "✕ للعرض والتدقيق فقط"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : /* Customers List */
          filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#5C6460]">لا توجد حسابات عملاء مطابقة.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                  <tr>
                    <th className="py-3 px-4">اسم العميل</th>
                    <th className="py-3 px-4">رقم الهاتف</th>
                    <th className="py-3 px-4">المنطقة المسجلة</th>
                    <th className="py-3 px-4">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4]">
                  {filteredCustomers.map((cust) => (
                    <tr key={cust._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#1F2421]">{cust.name}</td>
                      <td className="py-3 px-4 font-mono text-left" dir="ltr">
                        {cust.phone}
                      </td>
                      <td className="py-3 px-4 text-[#5C6460]">{cust.area || "بنها"}</td>
                      <td className="py-3 px-4 font-mono text-[#8A928D] text-[11px]">
                        {new Date(cust.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Create Craftsman Modal */}
      {isCreateCraftsmanOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#1F2421]">إضافة فني تركيب معتمد جديد</h3>
                <p className="text-xs text-[#5C6460]">
                  إنشاء حساب موثق ومفعل مباشرة بدون الحاجة للتسجيل المفتوح
                </p>
              </div>
              <button
                onClick={() => setIsCreateCraftsmanOpen(false)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCraftsman} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  اسم الفني الكامل <span className="text-[#A8452F]">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newCraftsman.name}
                  onChange={(e) =>
                    setNewCraftsman((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="مثال: م. أحمد عبد الفتاح"
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1F2421] mb-1">
                    رقم الهاتف (مصري) <span className="text-[#A8452F]">*</span>:
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={newCraftsman.phone}
                    onChange={(e) =>
                      setNewCraftsman((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="010XXXXXXXX"
                    className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl font-mono text-left text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#1F2421]">
                      كلمة المرور المؤقتة <span className="text-[#A8452F]">*</span>:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewCraftsman((prev) => ({
                          ...prev,
                          password: generateTemporaryPassword(),
                        }))
                      }
                      className="text-[10px] text-[#B8752E] hover:underline flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" /> توليد
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newCraftsman.password}
                    onChange={(e) =>
                      setNewCraftsman((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="••••••••"
                    className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl font-mono text-left text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1F2421] mb-1">
                    التخصص الفني <span className="text-[#A8452F]">*</span>:
                  </label>
                  <select
                    value={newCraftsman.specialty}
                    onChange={(e) =>
                      setNewCraftsman((prev) => ({ ...prev, specialty: e.target.value }))
                    }
                    className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] font-semibold focus:outline-none focus:border-[#B8752E]"
                  >
                    <option value="mechanic">ميكانيكا عامة</option>
                    <option value="electrician">كهرباء سيارات وفحص</option>
                    <option value="tires">عفشة وإطارات وزوايا</option>
                    <option value="air_conditioner">تكييف وتبريد</option>
                    <option value="bodywork">سمكرة ودوكو</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1F2421] mb-1">
                    المنطقة الجغرافية:
                  </label>
                  <input
                    type="text"
                    value={newCraftsman.area}
                    onChange={(e) =>
                      setNewCraftsman((prev) => ({ ...prev, area: e.target.value }))
                    }
                    placeholder="بنها، طوخ..."
                    className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  اسم الورشة أو المركز الفني:
                </label>
                <input
                  type="text"
                  value={newCraftsman.workshopName}
                  onChange={(e) =>
                    setNewCraftsman((prev) => ({ ...prev, workshopName: e.target.value }))
                  }
                  placeholder="مثال: ورشة الأمانة الميكانيكية"
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#DFDCD5]">
                <button
                  type="button"
                  onClick={() => setIsCreateCraftsmanOpen(false)}
                  className="flex-1 py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white text-[#5C6460] font-semibold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingCraftsman}
                  className="flex-1 py-2 px-3 bg-[#B8752E] hover:bg-[#9E6122] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  {creatingCraftsman ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "إنشاء وتفعيل الحساب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Vendor Modal */}
      {isCreateVendorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#1F2421]">إضافة تاجر قطع غيار جديد</h3>
                <p className="text-xs text-[#5C6460]">
                  إنشاء حساب تاجر معتمد ومفعل مباشرة بدون تسجيل ذاتي
                </p>
              </div>
              <button
                onClick={() => setIsCreateVendorOpen(false)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  اسم صاحب المتجر / المدير المسؤول <span className="text-[#A8452F]">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newVendor.name}
                  onChange={(e) =>
                    setNewVendor((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="مثال: الحاج طارق النجار"
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  اسم المحل أو المتجر <span className="text-[#A8452F]">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={newVendor.storeName}
                  onChange={(e) =>
                    setNewVendor((prev) => ({ ...prev, storeName: e.target.value }))
                  }
                  placeholder="مثال: الأهرام لتجارة قطع غيار كيا وهيونداي"
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1F2421] mb-1">
                    رقم الهاتف (مصري) <span className="text-[#A8452F]">*</span>:
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={newVendor.phone}
                    onChange={(e) =>
                      setNewVendor((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="010XXXXXXXX"
                    className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl font-mono text-left text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#1F2421]">
                      كلمة المرور المؤقتة <span className="text-[#A8452F]">*</span>:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewVendor((prev) => ({
                          ...prev,
                          temporaryPassword: generateTemporaryPassword(),
                        }))
                      }
                      className="text-[10px] text-[#B8752E] hover:underline flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" /> توليد
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newVendor.temporaryPassword}
                    onChange={(e) =>
                      setNewVendor((prev) => ({
                        ...prev,
                        temporaryPassword: e.target.value,
                      }))
                    }
                    placeholder="••••••••"
                    className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl font-mono text-left text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  المنطقة أو العنوان:
                </label>
                <input
                  type="text"
                  value={newVendor.location}
                  onChange={(e) =>
                    setNewVendor((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="مثال: بنها - شارع سعد زغلول"
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#DFDCD5]">
                <button
                  type="button"
                  onClick={() => setIsCreateVendorOpen(false)}
                  className="flex-1 py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white text-[#5C6460] font-semibold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingVendor}
                  className="flex-1 py-2 px-3 bg-[#1F2421] hover:bg-[#2b332e] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  {creatingVendor ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "إنشاء وتفعيل التاجر"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FDF2F0] flex items-center justify-center text-[#A8452F]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F2421]">إعادة تعيين كلمة المرور</h3>
                  <p className="text-xs text-[#5C6460]">{resetTarget.name}</p>
                </div>
              </div>
              <button
                onClick={() => setResetTarget(null)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl flex items-start gap-2 text-xs text-[#5C6460]">
              <AlertTriangle className="w-4 h-4 text-[#B8752E] shrink-0 mt-0.5" />
              <div>
                سيتم إجبار المستخدم فور تسجيل دخوله على إدخال كلمة مرور جديدة خاصة به، وتأمين حسابه الشخصي.
              </div>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#1F2421]">
                    كلمة المرور المؤقتة الجديدة:
                  </label>
                  <button
                    type="button"
                    onClick={() => setTempPasswordInput(generateTemporaryPassword())}
                    className="text-[10px] text-[#B8752E] hover:underline flex items-center gap-0.5"
                  >
                    <Sparkles className="w-3 h-3" /> توليد عشوائي
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={tempPasswordInput}
                  onChange={(e) => setTempPasswordInput(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl font-mono text-left text-sm text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#DFDCD5]">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="flex-1 py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white text-[#5C6460] font-semibold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={resetting || !tempPasswordInput}
                  className="flex-1 py-2 px-3 bg-[#A8452F] hover:bg-[#8D3723] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  {resetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "تأكيد وتعيين كلمة المرور"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single-view Copy Modal */}
      {copyModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EDF5F1] flex items-center justify-center text-[#3F6B58]">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F2421]">
                    {copyModalData.isNewUser ? "تم إنشاء الحساب بنجاح" : "تمت إعادة تعيين كلمة المرور"}
                  </h3>
                  <p className="text-xs text-[#5C6460]">
                    بيانات تسجيل الدخول المؤقتة لـ {copyModalData.name} ({copyModalData.role})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCopyModalData(null)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#DFDCD5] space-y-2">
                <div className="flex justify-between items-center text-[#5C6460]">
                  <span>رقم الهاتف المعتمد:</span>
                  <span className="font-mono font-bold text-[#1F2421]" dir="ltr">
                    {copyModalData.phone}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#5C6460]">
                  <span>كلمة المرور المؤقتة:</span>
                  <span className="font-mono font-bold text-base text-[#B8752E] bg-white px-2.5 py-0.5 rounded border border-[#DFDCD5]" dir="ltr">
                    {copyModalData.temporaryPassword}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCopyPassword}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  copied
                    ? "bg-[#3F6B58] text-white shadow-xs"
                    : "bg-[#1F2421] hover:bg-[#2b332e] text-white shadow-xs"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>تم النسخ بنجاح للحافظة!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>نسخ كلمة المرور المؤقتة</span>
                  </>
                )}
              </button>

              <div className="text-[11px] text-[#8A928D] leading-relaxed text-center">
                يُرجى إرسال هذه البيانات للمستخدم. بمجرد تسجيل دخوله، سيُطلب منه إلزاميًا استبدالها بكلمة مرور جديدة.
              </div>
            </div>

            <div className="pt-2 border-t border-[#DFDCD5]">
              <button
                onClick={() => setCopyModalData(null)}
                className="w-full py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white text-[#1F2421] font-semibold rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Commission Override Modal */}
      {commissionTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#1F2421]">
                  نسبة عمولة خاصة ({commissionTarget.role === "vendor" ? "تاجر" : "فني"}): {commissionTarget.name}
                </h3>
                <p className="text-xs text-[#5C6460]">
                  تحديد نسبة عمولة حصرية تتفوق على الفترة المجانية والنسبة العامة للمنصة
                </p>
              </div>
              <button
                onClick={() => setCommissionTarget(null)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Status Box */}
            <div className="p-3 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-[#5C6460]">
                <span>النسبة المطبقة حالياً:</span>
                <span className="font-bold text-[#1F2421] num-tabular">
                  {commissionTarget.currentRate !== undefined ? `${commissionTarget.currentRate}%` : "العامة"}
                </span>
              </div>
              <div className="flex justify-between text-[#5C6460]">
                <span>مصدر النسبة:</span>
                <span className="font-bold text-[#B8752E]">
                  {commissionTarget.source === "override"
                    ? "نسبة خاصة مخصصة"
                    : commissionTarget.source === "free_window"
                    ? "فترة إعفاء مجانية"
                    : "النسبة العامة للمنصة"}
                </span>
              </div>
              {commissionTarget.overrideExpiresAt && (
                <div className="flex justify-between text-[#5C6460]">
                  <span>تاريخ انتهاء النسبة الخاصة:</span>
                  <span className="font-mono text-[#1F2421]">
                    {new Date(commissionTarget.overrideExpiresAt).toLocaleDateString("ar-EG")}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#1F2421] mb-1">
                  نسبة العمولة الخاصة (% من 0 إلى 100):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="مثال: 5 أو 0"
                    value={overrideRateInput}
                    onChange={(e) => setOverrideRateInput(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E] font-mono pl-8"
                  />
                  <span className="absolute left-3 top-2.5 font-bold text-[#8A928D]">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1F2421] mb-1">
                  تاريخ انتهاء السريان (اختياري، يترك فارغاً إذا كانت دائمة):
                </label>
                <input
                  type="date"
                  value={overrideExpiryInput}
                  onChange={(e) => setOverrideExpiryInput(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1F2421] mb-1">
                  سبب التحديد (إلزامي للتوثيق والرقابة):
                </label>
                <input
                  type="text"
                  placeholder="مثال: اتفاقية شراكة حصرية، عرض ترويجي، إلخ..."
                  value={overrideReasonInput}
                  onChange={(e) => setOverrideReasonInput(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#DFDCD5] flex items-center justify-between gap-2">
              {commissionTarget.hasOverride && (
                <button
                  type="button"
                  onClick={handleClearCommissionOverride}
                  disabled={savingCommission}
                  className="py-2 px-3 bg-[#FDF2F0] hover:bg-[#FBE5E1] text-[#A8452F] font-bold rounded-xl text-xs"
                >
                  إلغاء العمولة الخاصة
                </button>
              )}
              <div className="flex items-center gap-2 mr-auto">
                <button
                  type="button"
                  onClick={() => setCommissionTarget(null)}
                  className="py-2 px-3 text-xs font-bold text-[#5C6460] hover:text-[#1F2421]"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveCommissionOverride}
                  disabled={savingCommission || overrideRateInput === "" || !overrideReasonInput.trim()}
                  className="py-2.5 px-4 bg-[#B8752E] hover:bg-[#9E6122] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {savingCommission ? "جاري الحفظ..." : "حفظ العمولة الخاصة"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
