import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登录 - 易经摇卦",
  description: "登录您的账户，继续探索易学智慧",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}

