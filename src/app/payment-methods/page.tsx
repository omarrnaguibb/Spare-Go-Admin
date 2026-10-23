"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Smartphone,
  Info,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { PaymentMethod } from "@/lib/types";

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: "instapay" as PaymentMethod["type"],
    label: "",
    accountName: "",
    accountHandle: "",
    instructions: "",
    minAmount: 50,
    maxAmount: 1000,
    isActive: true,
    sortOrder: 0,
  });

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listPaymentMethods();
      setMethods(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const handleOpenAdd = () => {
    setEditingMethod(null);
    setForm({
      type: "instapay",
      label: "",
      accountName: "",
      accountHandle: "",
      instructions: "يرجى تحويل المبلغ والتقاط صورة واضحة لإيصال التحويل الناجح مع كتابة الرقم المرجعي",
      minAmount: 50,
      maxAmount: 1000,
      isActive: true,
      sortOrder: methods.length,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setForm({
      type: method.type,
      label: method.label,
      accountName: method.accountName,
      accountHandle: method.accountHandle,
      instructions: method.instructions,
      minAmount: method.minAmount || 50,
      maxAmount: method.maxAmount || 1000,
      isActive: method.isActive,
      sortOrder: method.sortOrder || 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || !form.accountName || !form.accountHandle || !form.instructions) {
      alert("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setSaving(true);
    try {
      if (editingMethod) {
        await adminApi.updatePaymentMethod(editingMethod._id, form);
      } else {
        await adminApi.createPaymentMethod(form);
      }
      setIsModalOpen(false);
      await fetchMethods();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل حفظ وسيلة الدفع");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      await adminApi.updatePaymentMethod(method._id, {
        isActive: !method.isActive,
      });
      await fetchMethods();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل تعديل حالة التفعيل");
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`هل أنت متأكد من حذف وسيلة الدفع "${label}"؟`)) return;
    try {
      await adminApi.deletePaymentMethod(id);
      await fetchMethods();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "فشل حذف وسيلة الدفع");
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "instapay":
        return "إنستاباي (InstaPay IPA)";
      case "vodafone_cash":
        return "فودافون كاش";
      case "orange_cash":
        return "أورنج كاش";
      case "etisalat_cash":
        return "اتصالات كاش";
      case "we_pay":
        return "وي باي (WE Pay)";
      default:
        return "محفظة إلكترونية أخرى";
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1F2421]">إدارة طرق الدفع وشحن المحفظة</h1>
          <p className="text-xs text-[#5C6460]">
            تحديد حسابات الإيداع المعتمدة لسبير جو (عناوين InstaPay الحقيقية ومحافظ الكاش) وتعليمات التحويل للعملاء
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="py-2 px-3.5 bg-[#B8752E] hover:bg-[#9E6122] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة وسيلة دفع جديدة</span>
          </button>
          <button
            onClick={fetchMethods}
            disabled={loading}
            className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Notice Card */}
      <div className="bg-[#FAF8F5] border border-[#DFDCD5] rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#B8752E] shrink-0 mt-0.5" />
        <div className="text-xs text-[#5C6460] leading-relaxed">
          هذه الحسابات تظهر للعملاء في موقع وتطبيق سبير جو عند طلب شحن المحفظة أو إيداع العربون. تأكد من دقة أرقام الهواتف
          وعناوين إنستاباي لتفادي أخطاء التحويل من قبل العملاء.
        </div>
      </div>

      {/* Methods List */}
      <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#5C6460] space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
            <p>جاري تحميل وسائل الدفع...</p>
          </div>
        ) : methods.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5C6460] space-y-3">
            <p>لا توجد طرق دفع مسجلة حالياً.</p>
            <button
              onClick={handleOpenAdd}
              className="py-2 px-3.5 bg-[#B8752E] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة أول وسيلة دفع</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460] font-bold">
                <tr>
                  <th className="py-3 px-4">وسيلة الدفع</th>
                  <th className="py-3 px-4">النوع</th>
                  <th className="py-3 px-4">اسم صاحب الحساب</th>
                  <th className="py-3 px-4">رقم الحساب / IPA</th>
                  <th className="py-3 px-4">الحد الأدنى والأقصى</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEAE4]">
                {methods.map((m) => (
                  <tr key={m._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#DFDCD5] flex items-center justify-center text-[#B8752E]">
                          {m.type === "instapay" ? (
                            <CreditCard className="w-4 h-4" />
                          ) : (
                            <Smartphone className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-[#1F2421] block">{m.label}</span>
                          <span className="text-[10px] text-[#8A928D] block max-w-xs truncate" title={m.instructions}>
                            {m.instructions}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#5C6460]">
                      {getTypeLabel(m.type)}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#1F2421]">
                      {m.accountName}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-left text-sm text-[#B8752E]" dir="ltr">
                      {m.accountHandle}
                    </td>
                    <td className="py-3 px-4 num-tabular text-[#5C6460]">
                      {m.minAmount || 0} - {m.maxAmount || 0} ج.م
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(m)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors ${
                          m.isActive
                            ? "bg-[#EDF5F1] text-[#3F6B58] hover:bg-[#d8ece1]"
                            : "bg-[#FDF2F0] text-[#A8452F] hover:bg-[#fadbd7]"
                        }`}
                        title="انقر للتبديل بين التفعيل والتعطيل"
                      >
                        {m.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>مفعلة</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>معطلة</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 text-[#5C6460] hover:text-[#B8752E] hover:bg-[#FAF8F5] rounded-lg transition-colors"
                          title="تعديل وسيلة الدفع"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m._id, m.label)}
                          className="p-1.5 text-[#8A928D] hover:text-[#A8452F] hover:bg-[#FAF8F5] rounded-lg transition-colors"
                          title="حذف وسيلة الدفع"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl border border-[#DFDCD5] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#1F2421]">
                  {editingMethod ? "تعديل وسيلة الدفع" : "إضافة وسيلة دفع جديدة"}
                </h3>
                <p className="text-xs text-[#5C6460]">
                  حسابات التحويل المعتمدة في منصة سبير جو
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  نوع وسيلة الدفع <span className="text-[#A8452F]">*</span>:
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, type: e.target.value as PaymentMethod["type"] }))
                  }
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] font-semibold focus:outline-none focus:border-[#B8752E]"
                >
                  <option value="instapay">إنستاباي (InstaPay)</option>
                  <option value="vodafone_cash">فودافون كاش</option>
                  <option value="orange_cash">أورنج كاش</option>
                  <option value="etisalat_cash">اتصالات كاش</option>
                  <option value="we_pay">وي باي (WE Pay)</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  الاسم الظاهر للعملاء <span className="text-[#A8452F]">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={form.label}
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                  placeholder="مثال: إنستاباي - حساب سبير جو الرسمي"
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  اسم صاحب الحساب <span className="text-[#A8452F]">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={form.accountName}
                  onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))}
                  placeholder="مثال: شركة سبير جو لخدمات السيارات"
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  معرف الحساب أو رقم الهاتف <span className="text-[#A8452F]">*</span>:
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={form.accountHandle}
                  onChange={(e) => setForm((p) => ({ ...p, accountHandle: e.target.value }))}
                  placeholder="sparego@instapay أو 010XXXXXXXX"
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl font-mono text-left text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1F2421] mb-1">
                    الحد الأدنى للعملية (ج.م):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.minAmount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, minAmount: Number(e.target.value) }))
                    }
                    className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1F2421] mb-1">
                    الحد الأقصى للعملية (ج.م):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxAmount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, maxAmount: Number(e.target.value) }))
                    }
                    className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1F2421] mb-1">
                  تعليمات التحويل للعميل <span className="text-[#A8452F]">*</span>:
                </label>
                <textarea
                  rows={3}
                  required
                  value={form.instructions}
                  onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                  placeholder="تعليمات تظهر للعميل عند اختيار هذه الوسيلة..."
                  className="w-full p-2 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-[#1F2421] focus:outline-none focus:border-[#B8752E]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="rounded text-[#B8752E] focus:ring-[#B8752E]"
                />
                <label htmlFor="isActiveToggle" className="font-bold text-[#1F2421] cursor-pointer">
                  تفعيل وسيلة الدفع واستقبال إيداعات عبرها
                </label>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#DFDCD5]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white text-[#5C6460] font-semibold rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-3 bg-[#B8752E] hover:bg-[#9E6122] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "حفظ وسيلة الدفع"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
