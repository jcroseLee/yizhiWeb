'use client'

import { cn } from '@/lib/utils/cn'
import {
  Binary,
  ChevronRight,
  LayoutGrid, // 示例排盘子图标
  Orbit,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

// --- 自定义图标 ---
const IconLuoPan = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <rect x="7.5" y="7.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
    <path d="M12 3V5M12 19V21M3 12H5M19 12H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 10L13.5 14H10.5L12 10Z" fill="currentColor" />
  </svg>
)

const IconHulu = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.5C10.6 2.5 9.5 3.6 9.5 5C9.5 6.1 10.1 7 11 7.6C9.6 8.4 8.5 9.9 8.5 12C8.5 16 12 21 12 21C12 21 15.5 16 15.5 12C15.5 9.9 14.4 8.4 13 7.6C13.9 7 14.5 6.1 14.5 5C14.5 3.6 13.4 2.5 12 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M12 10.5L12.4 11.6L13.5 12L12.4 12.4L12 13.5L11.6 12.4L10.5 12L11.6 11.6L12 10.5Z" fill="currentColor" />
  </svg>
)

// --- 类型定义 ---
export interface NavItem {
  href: string
  label: string
  icon: any
  children?: NavItem[]
}

interface SidebarNavigationProps {
  items: NavItem[]
  bottomItems?: NavItem[]
}

// 判断激活逻辑
const checkIsActive = (href: string, item: NavItem): boolean => {
  if (href === item.href) return true
  if (href.startsWith(item.href + '/')) return true
  if (item.children) {
    return item.children.some(child => checkIsActive(href, child))
  }
  return false
}

// --- 样式补丁 ---
const styles = `
  /* 导航项激活态 */
  .nav-item-active {
    background-color: rgba(200, 46, 49, 0.04);
    color: #9D2933;
    font-weight: 600;
  }
  .nav-item-active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 16px;
    background-color: #C82E31;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
  }
  
  /* AI 卡片流光背景 */
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .ai-card-bg {
    background: linear-gradient(110deg, #fff 0%, #fff5f5 30%, #fff 60%); 
    background-size: 200% 100%;
    animation: shimmer 6s infinite linear;
  }
  .ai-card-bg:hover {
    background: linear-gradient(110deg, #fff5f5 0%, #ffeaeadd 30%, #fff5f5 60%); 
    border-color: rgba(200, 46, 49, 0.3);
  }
  
  /* NEW 徽章脉冲 */
  @keyframes pulse-red {
    0% { box-shadow: 0 0 0 0 rgba(200, 46, 49, 0.4); }
    70% { box-shadow: 0 0 0 4px rgba(200, 46, 49, 0); }
    100% { box-shadow: 0 0 0 0 rgba(200, 46, 49, 0); }
  }
  .badge-pulse {
    animation: pulse-red 2s infinite;
  }
`

// --- 组件：AI 助手入口 (High Priority) ---
const AiToolItem = ({ isActive }: { isActive: boolean }) => {
  return (
    <Link
      href="/ai-chat"
      className={cn(
        "group relative flex items-center gap-3 rounded-xl p-3 border transition-all duration-300 mb-3",
        // 样式处理：未激活时有微弱流光，激活时高亮
        isActive 
          ? "bg-[#C82E31]/5 border-[#C82E31]/30 shadow-sm" 
          : "ai-card-bg border-stone-200/60 shadow-sm hover:shadow-md"
      )}
    >
      {/* NEW 徽章 */}
      <div className="absolute -top-2 -right-2 z-10">
        <span className="flex h-5 w-auto min-w-[32px] items-center justify-center rounded-full bg-[#C82E31] px-1.5 text-[9px] font-bold text-white shadow-sm badge-pulse leading-none">
          NEW
        </span>
      </div>

      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-300",
        isActive ? "bg-[#C82E31]/10 text-[#C82E31]" : "bg-gradient-to-br from-stone-100 to-stone-50 text-stone-600 group-hover:text-[#C82E31]"
      )}>
        <IconHulu className="h-6 w-6" />
      </div>
      
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between">
            <span className={cn(
            "text-sm font-bold transition-colors truncate",
            isActive ? "text-[#C82E31]" : "text-stone-800"
            )}>
            易知小童
            </span>
            <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
        </div>
        <span className="text-[10px] text-stone-400 group-hover:text-stone-500 truncate">
          AI 辅助研判助手
        </span>
      </div>
    </Link>
  )
}

// --- 组件：排盘工具组 (Accordion Style) ---
const ToolGroup = ({ isActive }: { isActive: boolean }) => {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // 如果子路由激活，自动展开
  useEffect(() => {
    if (pathname.startsWith('/tools/')) {
        setIsOpen(true)
    }
  }, [pathname])

  const subTools = [
    { name: '四柱八字', href: '/tools/bazi', icon: LayoutGrid },
    { name: '六爻起卦', href: '/tools/6yao', icon: Binary },
    { name: '奇门遁甲', href: '/tools/qimen', icon: Orbit },
  ]

  return (
    <div className={cn(
        "rounded-xl border transition-all duration-300 overflow-hidden",
        (isOpen || isActive) ? "bg-white border-stone-200 shadow-sm" : "bg-transparent border-transparent hover:bg-white/50"
    )}>
      {/* Header - Click to toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-3 cursor-pointer group select-none"
      >
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-300",
          (isActive || isOpen) ? "bg-stone-100 text-stone-700" : "bg-stone-100 text-stone-500 group-hover:bg-[#C82E31]/5 group-hover:text-[#C82E31]"
        )}>
          <IconLuoPan className="h-5 w-5 transition-transform duration-500 group-hover:rotate-45" />
        </div>
        <div className="flex flex-col flex-1">
          <span className={cn(
            "text-sm font-bold transition-colors",
            (isActive || isOpen) ? "text-stone-800" : "text-stone-700"
          )}>
            在线排盘
          </span>
          <span className="text-[10px] text-stone-400">
            智能起卦工具集
          </span>
        </div>
        <ChevronRight className={cn(
            "h-4 w-4 text-stone-300 transition-transform duration-300",
            isOpen && "rotate-90"
        )} />
      </div>

      {/* Sub Menu - Animated Expansion */}
      <div className={cn(
          "grid transition-all duration-300 ease-in-out px-3",
          isOpen ? "grid-rows-[1fr] opacity-100 pb-3" : "grid-rows-[0fr] opacity-0 pb-0"
      )}>
        <div className="overflow-hidden space-y-1 pt-1 border-t border-stone-100/50">
            {subTools.map(tool => {
                const isToolActive = pathname === tool.href
                return (
                    <Link 
                        key={tool.href}
                        href={tool.href}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors",
                            isToolActive 
                                ? "bg-[#C82E31]/10 text-[#C82E31] font-medium" 
                                : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                        )}
                    >
                        <tool.icon className="w-3.5 h-3.5 opacity-70" />
                        {tool.name}
                    </Link>
                )
            })}
        </div>
      </div>
    </div>
  )
}

// --- 通用列表项 (保持不变) ---
const SidebarItem = ({ item, level = 0, pathname, expandedItems, onToggle }: any) => {
  const Icon = item.icon
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedItems.has(item.href)
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const isRedText = (level > 0 && isActive) || (!hasChildren && isActive)
  
  return (
    <div className="w-full relative">
      <Link
        href={item.href}
        onClick={(e) => { if (hasChildren) { e.preventDefault(); onToggle(item.href) } }}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg py-2.5 text-sm transition-all duration-300 relative overflow-hidden",
          "hover:bg-stone-100/60",
          isRedText ? "nav-item-active" : "text-stone-600 hover:text-stone-900"
        )}
        style={{ paddingLeft: `${1 + level * 1}rem`, paddingRight: '1rem' }} 
      >
        {level === 0 && <Icon className={cn("h-4 w-4 shrink-0 transition-colors duration-300", isRedText ? "text-[#C82E31]" : "text-stone-400 group-hover:text-stone-600")} />}
        <span className="flex-1 truncate tracking-wide">{item.label}</span>
        {hasChildren && <div className="ml-auto shrink-0 pl-2"><ChevronRight className={cn("h-3.5 w-3.5 text-stone-400 transition-transform duration-300", isExpanded && "rotate-90")} /></div>}
      </Link>
      <div className={cn("grid transition-all duration-300 ease-in-out", isExpanded ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0 mt-0")}>
        <div className="overflow-hidden space-y-0.5">
          {item.children?.map((child: any) => (
            <SidebarItem key={child.href} item={child} level={level + 1} pathname={pathname} expandedItems={expandedItems} onToggle={onToggle} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SidebarNavigation({ items, bottomItems }: SidebarNavigationProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // 自动展开逻辑
  useEffect(() => {
    const newExpanded = new Set<string>(expandedItems)
    let hasChange = false
    const findAndExpand = (navItems: NavItem[]) => {
      navItems.forEach(item => {
        if (item.children) {
          const shouldExpand = item.children.some(child => checkIsActive(pathname, child))
          if (shouldExpand) { if (!newExpanded.has(item.href)) { newExpanded.add(item.href); hasChange = true } }
          findAndExpand(item.children)
        }
      })
    }
    findAndExpand(items)
    if (bottomItems) {
      findAndExpand(bottomItems)
    }
    if (hasChange) setExpandedItems(newExpanded)
  }, [pathname, items, bottomItems]) 

  const handleToggle = useCallback((href: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })
  }, [])

  return (
    <>
      <style jsx global>{styles}</style>
      <nav className="h-full w-full flex flex-col bg-transparent">
        
        <div className="h-4 w-full" />

        {/* --- 1. 普通导航区 --- */}
        <div className="flex-1 space-y-1 px-3">
          {items.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              pathname={pathname}
              expandedItems={expandedItems}
              onToggle={handleToggle}
            />
          ))}
        </div>
        
        {/* --- 2. 底部核心工具区 (优化版) --- */}
        <div className="mt-auto px-3 pb-6">
            
            {/* 装饰分割线 */}
            <div className="my-4 flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-200 to-transparent"></div>
                <span className="text-[10px] text-stone-300 uppercase tracking-widest font-serif">Tools</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-200 to-transparent"></div>
            </div>

            {/* 工具容器 */}
            <div className="space-y-1 bg-stone-50/50 rounded-2xl p-2 border border-stone-100/50">
                
                {/* AI 助手 (置顶高亮) */}
                <AiToolItem isActive={pathname === '/ai-chat'} />

                {/* 排盘工具 (手风琴) */}
                <ToolGroup isActive={pathname.startsWith('/tools')} />
                
            </div>
        </div>
      </nav>
    </>
  )
}