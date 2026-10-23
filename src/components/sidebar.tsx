"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  UserCheck,
  LifeBuoy,
  BadgeDollarSign,
  BookOpen,
  Users,
  Settings,
  ShieldAlert,
  LogOut,
  Wrench,
  Wallet,
  CreditCard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Scale,
  Sliders,
  PackageSearch,
} from "lucide-react";
import { useAdmin } from "@/lib/admin-context";

export function AdminSidebar() {
  const pathname = usePathname();
  const { admin, pendingCounts, logout } = useAdmin();

  if (pathname === "/login" || !admin) {
    return null;
  }

  const navLinks = [
    {
      name: "الطلبات الحية",
      href: "/",
      icon: Activity,
      active: pathname === "/" || pathname.startsWith("/orders"),
    },
    {
      name: "طلبات الاعتماد",
      href: "/approvals",
      icon: UserCheck,
      badge: pendingCounts?.total && pendingCounts.total > 0 ? pendingCounts.total : undefined,
      active: pathname === "/approvals",
    },
    {
      name: "تذاكر الشكاوى",
      href: "/tickets",
      icon: LifeBuoy,
      active: pathname === "/tickets",
    },
    {
      name: "طرق الدفع",
      href: "/payment-methods",
      icon: CreditCard,
      active: pathname === "/payment-methods",
    },
    {
      name: "شحن المحفظة",
      href: "/topups",
      icon: ArrowDownToLine,
      active: pathname === "/topups",
    },
    {
      name: "طلبات السحب",
      href: "/withdrawals",
      icon: ArrowUpFromLine,
      active: pathname === "/withdrawals",
    },
    {
      name: "محافظ العملاء",
      href: "/wallets",
      icon: Wallet,
      active: pathname === "/wallets",
    },
    {
      name: "المطابقة المالية",
      href: "/reconciliation",
      icon: Scale,
      active: pathname === "/reconciliation",
    },
    {
      name: "التسويات المالية",
      href: "/settlements",
      icon: BadgeDollarSign,
      active: pathname === "/settlements",
    },
    {
      name: "دفتر الأستاذ (Ledger)",
      href: "/ledger",
      icon: BookOpen,
      active: pathname === "/ledger",
    },
    {
      name: "المستخدمين",
      href: "/users",
      icon: Users,
      active: pathname === "/users",
    },
    {
      name: "طلبات القطع الخاصة",
      href: "/part-requests",
      icon: PackageSearch,
      active: pathname === "/part-requests",
    },
    {
      name: "إعدادات المنظومة",
      href: "/settings",
      icon: Sliders,
      active: pathname === "/settings",
    },
    {
      name: "الإعدادات والسياسات",
      href: "/config",
      icon: Settings,
      active: pathname === "/config",
    },
    {
      name: "سجل الرقابة (Audit)",
      href: "/audit",
      icon: ShieldAlert,
      active: pathname === "/audit",
    },
  ];

  return (
    <aside className="w-64 bg-[#1F2421] text-white flex flex-col shrink-0 min-h-screen sticky top-0 h-screen border-l border-[#2e3631]">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#2e3631] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#B8752E] flex items-center justify-center font-bold text-white shadow-sm">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-sm tracking-wide block">سبير جو — الإدارة</span>
          <span className="text-[11px] text-[#8A928D] block">لوحة التحكم والعمليات</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                link.active
                  ? "bg-[#B8752E] text-white shadow-xs"
                  : "text-[#DFDCD5] hover:bg-[#2b332e] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.name}</span>
              </div>
              {link.badge !== undefined && (
                <span className="px-2 py-0.5 bg-[#A8452F] text-white text-[10px] rounded-full font-bold animate-pulse">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin User Footer */}
      <div className="p-3 border-t border-[#2e3631] bg-[#1a1e1b] flex items-center justify-between">
        <div className="truncate">
          <span className="font-bold text-xs text-white block truncate">{admin.name}</span>
          <span className="text-[10px] text-[#8A928D] block font-mono">{admin.phone}</span>
        </div>
        <button
          onClick={logout}
          title="تسجيل الخروج"
          className="p-2 text-[#8A928D] hover:text-[#A8452F] hover:bg-[#2b332e] rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
