'use client'

import {
  IconHulu,
  IconLuoPan
} from '@/lib/components/CustomIcons'
import { cn } from '@/lib/utils/cn'
import {
  Binary,
  ChevronRight,
  LayoutGrid,
  Orbit,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState } from 'react'

// --- 类型定义 ---
export interface NavItem {
  href: string
  label: string
  icon: React.ElementType<{ className?: string }>
  children?: NavItem[]
}

interface SidebarNavigationProps {
  items: NavItem[]
  collapsed?: boolean
}

// --- 样式补丁 ---
const styles = `
  /* AI 卡片流光背景 */
  .ai-card-bg {
    background: linear-gradient(135deg, #ffffff 0%, #fffbfb 100%);
    position: relative;
    overflow: hidden;
  }
  .ai-card-bg::before {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 50%; height: 100%;
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.8), transparent);
    transform: skewX(-25deg);
    transition: left 0.5s;
  }
  .ai-card-bg:hover::before {
    left: 200%;
    transition: left 1s;
  }
  
  /* 底部水墨云山底纹 */
  .sidebar-ink-bg {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 100 V 80 Q 30 75 60 85 T 120 80 T 200 90 V 100 Z' fill='%23e7e5e4' fill-opacity='0.4' /%3E%3Cpath d='M0 100 V 90 Q 40 85 90 95 T 200 90 V 100 Z' fill='%23d6d3d1' fill-opacity='0.3' /%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: bottom;
    background-size: 100% auto;
  }
  
  /* 隐藏滚动条 */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`

// --- 组件：AI 助手入口 ---
const AiToolItem = ({ isActive, collapsed }: { isActive: boolean; collapsed?: boolean }) => {
  // 折叠态：绝对居中
  if (collapsed) {
    return (
      <div className="w-full flex justify-center mb-4 relative z-10">
        <Link
          href="/ai-chat"
          title="易知小童"
          className={cn(
            "group relative flex h-10 w-10 items-center justify-center rounded-2xl p-0 transition-all duration-300",
            isActive 
              ? "bg-gradient-to-br from-[#C82E31] to-[#A93226] text-white shadow-md shadow-red-200" 
              : "bg-white border border-stone-100 text-stone-500 hover:border-[#C82E31]/30 hover:text-[#C82E31] hover:shadow-sm"
          )}
        >
          <IconHulu className="h-6 w-6" />
          {/* 小红点提示 */}
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        </Link>
      </div>
    )
  }

  // 展开态
  return (
    <div className="mx-3 mb-4 relative z-10">
      <Link
        href="/ai-chat"
        className={cn(
          "group relative flex items-center gap-4 rounded-2xl p-3.5 transition-all duration-300 border",
          isActive 
            ? "bg-[#fff5f5] border-[#C82E31]/20 shadow-sm" 
            : "ai-card-bg border-stone-100 hover:border-[#C82E31]/20 hover:shadow-md"
        )}
      >
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 shadow-sm",
          isActive 
            ? "bg-[#C82E31] text-white" 
            : "bg-gradient-to-br from-stone-50 to-white border border-stone-100 text-stone-500 group-hover:text-[#C82E31]"
        )}>
          <IconHulu className="h-5 w-5" />
        </div>
        
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between">
              <span className={cn(
                "text-[15px] font-bold transition-colors truncate tracking-tight",
                isActive ? "text-[#C82E31]" : "text-stone-800"
              )}>
                易知小童
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
          </div>
          <span className="text-[11px] text-stone-400 group-hover:text-stone-500 truncate font-medium mt-0.5">
            您的 AI 易学助手
          </span>
        </div>
      </Link>
    </div>
  )
}

// --- 组件：排盘工具组 ---
const ToolGroup = ({ isActive, collapsed }: { isActive: boolean; collapsed?: boolean }) => {
  const [userOpen, setUserOpen] = useState(false)
  const pathname = usePathname()
  const isForcedOpen = pathname.startsWith('/tools/')
  const isOpen = isForcedOpen || userOpen

  const subTools = [
    { name: '四柱八字', href: '/tools/bazi', icon: LayoutGrid },
    { name: '六爻起卦', href: '/tools/6yao', icon: Binary },
    { name: '奇门遁甲', href: '/tools/qimen', icon: Orbit },
  ]

  // 折叠态：绝对居中
  if (collapsed) {
    return (
      <div className="w-full flex justify-center mb-2 relative z-10" title="在线排盘">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 cursor-pointer",
          isActive 
            ? "bg-[#C82E31]/10 text-[#C82E31]" 
            : "text-stone-400 hover:bg-stone-50 hover:text-stone-600"
        )}>
          <IconLuoPan className="h-5 w-5" />
        </div>
      </div>
    )
  }

  // 展开态
  return (
    <div className="mx-3 mb-2 relative z-10">
      <div className={cn(
          "rounded-2xl border transition-all duration-300 overflow-hidden",
          isOpen 
            ? "bg-white border-stone-200 shadow-sm" 
            : "bg-stone-50/50 border-transparent hover:bg-stone-100/50 hover:border-stone-200/50"
      )}>
        <div 
          onClick={() => { if (!isForcedOpen) setUserOpen(prev => !prev) }}
          className="flex items-center gap-3 p-3.5 cursor-pointer group select-none"
        >
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300",
            isOpen ? "bg-[#C82E31]/10 text-[#C82E31]" : "bg-white border border-stone-100 text-stone-400 group-hover:text-stone-600"
          )}>
            <IconLuoPan className={cn("h-5 w-5 transition-transform duration-500", isOpen && "rotate-45")} />
          </div>
          
          <div className="flex flex-col flex-1 min-w-0">
            <span className={cn(
              "text-[14px] font-bold transition-colors",
              isOpen ? "text-[#C82E31]" : "text-stone-600"
            )}>
              在线排盘
            </span>
          </div>
          
          <ChevronRight className={cn(
              "h-4 w-4 text-stone-300 transition-transform duration-300",
              isOpen && "rotate-90 text-[#C82E31]"
          )} />
        </div>

        <div className={cn(
            "grid transition-all duration-300 ease-in-out",
            isOpen ? "grid-rows-[1fr] opacity-100 pb-2" : "grid-rows-[0fr] opacity-0 pb-0"
        )}>
          <div className="overflow-hidden space-y-1 px-2">
              {subTools.map(tool => {
                  const isToolActive = pathname === tool.href
                  return (
                      <Link 
                          key={tool.href}
                          href={tool.href}
                          className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 group/item",
                              isToolActive 
                                  ? "bg-[#C82E31]/5 text-[#C82E31] font-medium" 
                                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                          )}
                      >
                          <tool.icon className={cn(
                            "w-4 h-4 transition-colors", 
                            isToolActive ? "text-[#C82E31]" : "text-stone-400 group-hover/item:text-stone-600"
                          )} />
                          {tool.name}
                      </Link>
                  )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- 通用列表项 (Sidebar Item) ---
interface SidebarItemProps {
  item: NavItem
  pathname: string
  collapsed?: boolean
}

const SidebarItem = ({ item, pathname, collapsed }: SidebarItemProps) => {
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
  const IconComponent = item.icon
  
  // 折叠态：绝对居中 + 红色点指示
  if (collapsed) {
    return (
      <div className="w-full flex justify-center mb-2 relative z-10" title={item.label}>
        <Link
          href={item.href}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 relative",
            isActive 
              ? "bg-[#C82E31]/10 text-[#C82E31]" 
              : "text-stone-400 hover:bg-stone-50 hover:text-stone-600"
          )}
        >
          <IconComponent className="h-5 w-5" />
          {/* 左侧红色指示条 (折叠时) - 调整位置使其贴合边缘但好看 */}
          {isActive && (
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#C82E31] rounded-r-full" />
          )}
        </Link>
      </div>
    )
  }
  
  // 展开态：经典左侧红条
  return (
    <div className="px-3 mb-1 relative z-10">
      <Link
        href={item.href}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl py-3 px-3.5 text-[15px] transition-all duration-200 relative overflow-hidden",
          isActive 
            ? "bg-[#C82E31]/5 text-[#C82E31] font-bold" 
            : "text-stone-500 hover:bg-stone-50 hover:text-stone-800 font-medium"
        )}
      >
        {/* 左侧红色指示条 */}
        {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#C82E31] rounded-r-full shadow-[2px_0_8px_rgba(200,46,49,0.3)]" />
        )}

        <IconComponent className={cn(
          "h-5 w-5 transition-colors",
          isActive ? "text-[#C82E31]" : "text-stone-400 group-hover:text-stone-600"
        )} />

        <span className="tracking-wide">{item.label}</span>
      </Link>
    </div>
  )
}

export default function SidebarNavigation({ items, collapsed }: SidebarNavigationProps) {
  const pathname = usePathname()

  return (
    <>
      <style jsx global>{styles}</style>
      <nav className="h-full flex flex-col no-scrollbar overflow-y-auto pb-6 relative sidebar-ink-bg">
        
        {/* 顶部留白 */}
        <div className="h-6 shrink-0" />

        {/* 1. 核心导航区 */}
        <div className="flex-1 space-y-1 relative z-10">
          {items.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
            />
          ))}
        </div>
        
        {/* 2. 底部工具区 */}
        <div className="mt-auto pt-6 shrink-0 relative z-10">
            {!collapsed && (
              <div className="px-6 mb-4 flex items-center gap-2 opacity-60">
                  <span className="text-[10px] text-stone-300 font-serif tracking-[0.2em] uppercase">Tools</span>
                  <div className="h-px flex-1 bg-stone-100"></div>
              </div>
            )}

            <AiToolItem isActive={pathname === '/ai-chat'} collapsed={collapsed} />
            <ToolGroup isActive={pathname.startsWith('/tools')} collapsed={collapsed} />
        </div>
      </nav>
    </>
  )
}
