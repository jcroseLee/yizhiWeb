import { Card, CardContent } from '@/lib/components/ui/card'
import React from 'react'

export interface StatCardProps {
  icon: React.ReactNode
  value: number
  label: string
  colorClass: string
  onClick?: () => void
  isEmpty?: boolean
  actionText?: string
}

export const StatCard = ({ 
  icon, 
  value, 
  label, 
  colorClass, 
  onClick, 
  isEmpty = false, 
  actionText 
}: StatCardProps) => {
  const isClickable = onClick !== undefined
  
  return (
    <Card 
      className={`bg-white/80 rounded-xl border-none shadow-sm transition-all duration-300 group ${
        isClickable ? 'hover:shadow-md cursor-pointer hover:-translate-y-1' : ''
      }`}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="p-5 flex flex-col items-center justify-center space-y-3">
        <div className={`p-3 rounded-full ${colorClass} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold text-[#2C3E50] font-mono ${isEmpty ? 'opacity-50' : ''}`}>
            {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
          </div>
          <div className="text-xs text-gray-500 mt-1">{label}</div>
          {isEmpty && isClickable && actionText && (
            <div className="text-[10px] text-[#C0392B] mt-2 opacity-0 group-hover:opacity-100 transition-opacity font-serif">
              {actionText} →
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

