import { AnalyticsProvider } from "@/lib/components/AnalyticsProvider";
import ConditionalLayout from "@/lib/components/ConditionalLayout";
import { ToastProviderWrapper } from "@/lib/components/ToastProviderWrapper";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "易知 - 实证易学平台",
  description: "专业的实证易学平台",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="antialiased min-h-screen h-full relative overflow-x-hidden">
        <ToastProviderWrapper>
          <AnalyticsProvider />
          {/* 背景遮罩层，确保内容可读性（新中式宣纸效果） */}
          <div className="fixed inset-0 -z-10" />
          
          {/* 条件渲染：登录页面不显示导航栏和侧边栏 */}
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </ToastProviderWrapper>
      </body>
    </html>
  );
}
