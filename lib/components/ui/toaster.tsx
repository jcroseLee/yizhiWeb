"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider as UIToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/lib/components/ui/toast"
import { useToastContext } from "@/lib/contexts/toast-context"

export function Toaster() {
  const { toasts, removeToast } = useToastContext()

  return (
    <UIToastProvider>
      <ToastViewport>
        {toasts.map(function ({ id, title, description, variant }) {
          return (
            <Toast key={id} variant={variant}>
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              <ToastClose onClick={() => removeToast(id)} />
            </Toast>
          )
        })}
      </ToastViewport>
    </UIToastProvider>
  )
}

