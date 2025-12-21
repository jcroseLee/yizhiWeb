"use client"

import { ToastProvider } from "@/lib/contexts/toast-context"
import { Toaster } from "@/lib/components/ui/toaster"

export function ToastProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <Toaster />
    </ToastProvider>
  )
}

