'use client'

import { RotateCcw, Clock, Hash, Hand, Search, BookOpen, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  selectedMethod: number
  onMethodChange: (method: number) => void
}

const mainNavItems = [
  { icon: Search, label: '发现', href: '/' },
  { icon: BookOpen, label: '藏经阁', href: '/library' },
  { icon: User, label: '个人中心', href: '/profile' },
]

const methodIcons = [
  { icon: RotateCcw, label: '钢铁摇卦', subtitle: 'Coin Divination' },
  { icon: Clock, label: '时间摇卦', subtitle: 'Time Divination' },
  { icon: Hash, label: '数字摇卦', subtitle: 'Number Divination' },
  { icon: Hand, label: '手工摇定', subtitle: 'Manual Divination' },
]

export default function Sidebar({ selectedMethod, onMethodChange }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="w-full h-full space-y-6 p-4">
      {/* 主导航项 */}
      <div className="space-y-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-ink-100 text-ink-800'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-800'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-ink-200" />

      {/* 拼盘标题 */}
      <div className="flex items-center gap-2 px-4">
        <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
          <div className="w-1.5 h-1.5 bg-ink-800 rounded-sm" />
          <div className="w-1.5 h-1.5 bg-ink-800 rounded-sm" />
          <div className="w-1.5 h-1.5 bg-ink-800 rounded-sm" />
          <div className="w-1.5 h-1.5 bg-ink-800 rounded-sm" />
        </div>
        <div>
          <h3 className="text-sm font-serif font-semibold text-ink-800">拼盘</h3>
          <p className="text-xs text-ink-500">The Workbench</p>
        </div>
      </div>

      {/* 摇卦方式列表 */}
      <div className="space-y-1">
        {methodIcons.map((method, index) => {
          const Icon = method.icon
          const isSelected = selectedMethod === index
          
          return (
            <button
              key={index}
              onClick={() => onMethodChange(index)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                isSelected
                  ? 'bg-ink-800 text-white'
                  : 'text-ink-600 hover:bg-ink-50'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{method.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

