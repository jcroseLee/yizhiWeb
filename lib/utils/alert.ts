/**
 * 替代原生alert的工具函数
 * 使用toast来显示消息提示
 * 
 * 在React组件中使用此hook来替代原生alert
 * 注意：这个hook需要在React组件中使用，因为它依赖于toast context
 */

import { useToastContext } from '@/lib/contexts/toast-context'

/**
 * Hook to use alert functionality in React components
 * 在React组件中使用此hook来替代原生alert
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { alert } = useAlert()
 *   
 *   const handleClick = () => {
 *     alert('操作失败', 'destructive')
 *   }
 * }
 * ```
 */
export function useAlert() {
  const { toast } = useToastContext()
  
  return {
    /**
     * 显示提示消息（替代原生alert）
     * @param message 提示消息
     * @param variant 提示类型，默认为'destructive'（错误提示）
     */
    alert: (message: string, variant: 'default' | 'destructive' = 'destructive') => {
      toast({
        title: message,
        variant,
      })
    }
  }
}

