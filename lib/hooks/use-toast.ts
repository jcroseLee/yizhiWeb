import { useToastContext } from '@/lib/contexts/toast-context'

export function useToast() {
  const { toast, toasts } = useToastContext()
  return { toast, toasts }
}

