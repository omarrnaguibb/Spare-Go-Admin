import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "@/lib/admin-context";
import { AdminSidebar } from "@/components/sidebar";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "سبير جو — لوحة الإدارة والعمليات المركزية | Spare Go Admin",
  description: "لوحة التحكم الداخلية لإدارة الطلبات والاعتمادات والتسويات المالية والرقابة",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={ibmPlexSansArabic.variable}>
      <body className="min-h-screen bg-[#F3F1EC] text-[#1F2421] antialiased">
        <AdminProvider>
          <div className="flex min-h-screen">
            <AdminSidebar />
            <div className="flex-1 min-w-0 flex flex-col bg-[#F3F1EC] overflow-x-hidden">
              <main className="flex-1 p-6">{children}</main>
            </div>
          </div>
        </AdminProvider>
      </body>
    </html>
  );
}
