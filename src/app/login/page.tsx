"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Phone, Lock, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";

export default function AdminLoginPage() {
  const router = useRouter();
  const { refreshMe } = useAdmin();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await adminApi.login(phone, password);
      await refreshMe();
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول. تحقق من صلاحيات الإدارة.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F3F1EC]">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#DFDCD5] rounded-3xl p-8 shadow-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[#1F2421] text-[#B8752E] rounded-2xl mx-auto flex items-center justify-center shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#1F2421]">بوابة الإدارة المركزية</h1>
          <p className="text-xs text-[#5C6460]">منصة إدارة العمليات والرقابة — سبير جو</p>
        </div>

        {error && (
          <div className="p-3 bg-[#FDF2F0] border border-[#A8452F] text-[#A8452F] rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1F2421] mb-1.5">
              رقم هاتف المشرف
            </label>
            <div className="relative">
              <input
                type="tel"
                dir="ltr"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full h-11 px-4 pr-10 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-sm text-left focus:border-[#B8752E] focus:bg-white outline-none"
              />
              <Phone className="w-4 h-4 text-[#8A928D] absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F2421] mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-4 pr-10 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-sm focus:border-[#B8752E] focus:bg-white outline-none"
              />
              <Lock className="w-4 h-4 text-[#8A928D] absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#B8752E] hover:bg-[#9E6122] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-2 transition-colors mt-6"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>دخول لوحة الإدارة</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="p-3 bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl text-xs text-[#5C6460] text-center space-y-1">
          <p className="font-semibold text-[#1F2421]">بيانات الإدارة التجريبية:</p>
          <p dir="ltr" className="font-mono text-[#B8752E] font-bold">
            01011111111 / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
