'use client'

import { BookOpen, PlusCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/lib/components/ui/button'

export interface EmptyStateProps {
  onCreateClick?: () => void
}

export const EmptyState = ({ onCreateClick }: EmptyStateProps) => {
  const router = useRouter()
  
  const handleCreate = () => {
    if (onCreateClick) {
      onCreateClick()
    } else {
      router.push('/6yao')
    }
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-dashed border-gray-200">
      <div className="w-20 h-20 bg-[#FDFBF7] rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-inner">
        <BookOpen className="text-gray-300 w-8 h-8" />
      </div>
      <h3 className="text-lg font-medium text-[#2C3E50] mb-2 font-serif">暂无笔记</h3>
      <p className="text-gray-400 text-sm max-w-xs text-center mb-6 font-serif">
        &ldquo;记性好不如烂笔头&rdquo;，每一次灵感和推演都值得被记录。
      </p>
      <Button 
        className="bg-[#2C3E50] hover:bg-[#1a252f] text-white gap-2 shadow-lg shadow-gray-200 font-serif px-6 py-2.5"
        onClick={handleCreate}
      >
        <PlusCircle className="w-4 h-4" /> 
        <span>开启第一卦</span>
      </Button>
    </div>
  )
}

