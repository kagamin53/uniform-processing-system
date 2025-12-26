import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "園児服加工管理システム",
  description: "園児服の二次加工（刺繍・ワッペン等）を管理するシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <nav className="bg-white border-b border-gray-200 shadow-sm mb-2 px-4 py-0.5 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center">
            <Image
              src="/logo.png?v=2"
              alt="二次加工計画システム"
              width={400}
              height={100}
              className="h-[48px] w-auto object-contain"
              priority
              unoptimized
            />
          </div>
          <div className="flex gap-6 text-sm font-medium">
            <a href="/" className="text-slate-600 hover:text-orange-500 transition-colors">ダッシュボード</a>
            <a href="/orders-list" className="text-slate-600 hover:text-orange-500 transition-colors">受注一覧</a>
            <a href="/planning" className="text-slate-600 hover:text-orange-500 transition-colors">計画表</a>
            <a href="/planning/timeline" className="text-slate-600 hover:text-orange-500 transition-colors">タイムライン</a>
            <a href="/calendar" className="text-slate-600 hover:text-orange-500 transition-colors">📅 休日設定</a>
            <a href="/picking" className="text-slate-600 hover:text-orange-500 transition-colors">ピッキング</a>
            <a href="/codes" className="text-slate-600 hover:text-orange-500 transition-colors">加工コード</a>
            <a href="/reports" className="text-slate-600 hover:text-orange-500 transition-colors">月次計算書</a>
          </div>
        </nav>
        <main className="px-6 pb-8 max-w-[1920px] mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
