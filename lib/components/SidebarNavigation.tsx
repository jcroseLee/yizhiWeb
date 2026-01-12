'use client'

import {
  IconHulu,
  IconLuoPan
} from '@/lib/components/CustomIcons'
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
import React, { useCallback, useMemo, useState } from 'react'

// --- 类型定义 ---
export interface NavItem {
  href: string
  label: string
  icon: React.ElementType<{ className?: string }>
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
  /* AI 卡片流光背景 - 静态流光效果，不循环滑动 */
  .ai-card-bg {
    background: linear-gradient(110deg, #fff 0%, #fff5f5 30%, #fff 60%); 
    background-size: 200% 100%;
    background-position: 0% 0%;
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
      {/* <div className="absolute -top-2 -right-2 z-10">
        <span className="flex h-5 w-auto min-w-[32px] items-center justify-center rounded-full bg-[#C82E31] px-1.5 text-[9px] font-bold text-white shadow-sm badge-pulse leading-none">
          NEW
        </span>
      </div> */}

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
          AI 小助手
        </span>
      </div>
    </Link>
  )
}

// --- 组件：排盘工具组 (Accordion Style) ---
const ToolGroup = ({ isActive }: { isActive: boolean }) => {
  const [userOpen, setUserOpen] = useState(false)
  const pathname = usePathname()
  const isForcedOpen = pathname.startsWith('/tools/')
  const isOpen = isForcedOpen || userOpen

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
        onClick={() => { if (!isForcedOpen) setUserOpen(prev => !prev) }}
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

// --- 通用列表项 (优化版：更有分量感和设计感) ---
interface SidebarItemProps {
  item: NavItem
  level?: number
  pathname: string
  expandedItems: Set<string>
  onToggle: (href: string) => void
}

const SidebarItem = ({ item, level = 0, pathname, expandedItems, onToggle }: SidebarItemProps) => {
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedItems.has(item.href)
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const isRedText = (level > 0 && isActive) || (!hasChildren && isActive)
  const IconComponent = item.icon
  
  return (
    <div className="w-full relative mb-1"> {/* 增加间距 */}
      <Link
        href={item.href}
        onClick={(e) => { if (hasChildren) { e.preventDefault(); onToggle(item.href) } }}
        className={cn(
          "group flex w-full items-center gap-4 rounded-xl py-3 px-3 text-sm transition-all duration-300 relative overflow-hidden",
          // 悬停态：细腻的位移
          "hover:bg-stone-50 hover:pl-4",
          // 激活态：深色背景 + 强对比文字
          isRedText ? "bg-stone-100 text-[#1c1917] font-bold shadow-sm" : "text-stone-500 hover:text-stone-800 font-medium"
        )}
        style={{ paddingLeft: level > 0 ? `${1.5 + level * 1}rem` : undefined }} 
      >
        {/* 激活指示条 (左侧) */}
        {isRedText && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#C82E31] rounded-r-full" />
        )}

        {/* 图标容器 (仅一级菜单) */}
        {level === 0 && IconComponent && (
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300",
            isRedText ? "bg-white text-[#C82E31] shadow-sm" : "bg-stone-50 text-stone-400 group-hover:bg-white group-hover:text-stone-600"
          )}>
            { }
            <IconComponent className="h-5 w-5" />
          </div>
        )}

        <span className="flex-1 truncate tracking-wide text-[15px]">{item.label}</span>
        
        {hasChildren && (
            <div className="ml-auto shrink-0 pl-2">
                <ChevronRight className={cn("h-4 w-4 text-stone-300 transition-transform duration-300 group-hover:text-stone-500", isExpanded && "rotate-90")} />
            </div>
        )}
      </Link>
      
      {/* 子菜单容器 */}
      <div className={cn("grid transition-all duration-300 ease-in-out", isExpanded ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0 mt-0")}>
        <div className="overflow-hidden space-y-0.5">
          {item.children?.map((child: NavItem) => (
            <SidebarItem key={child.href} item={child} level={level + 1} pathname={pathname} expandedItems={expandedItems} onToggle={onToggle} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SidebarNavigation({ items, bottomItems }: SidebarNavigationProps) {
  const pathname = usePathname()
  const [userExpandedItems, setUserExpandedItems] = useState<Set<string>>(new Set())

  const autoExpandedItems = useMemo(() => {
    const next = new Set<string>()
    const findAndExpand = (navItems: NavItem[]) => {
      navItems.forEach(item => {
        if (item.children) {
          const shouldExpand = item.children.some(child => checkIsActive(pathname, child))
          if (shouldExpand) next.add(item.href)
          findAndExpand(item.children)
        }
      })
    }
    findAndExpand(items)
    if (bottomItems) findAndExpand(bottomItems)
    return next
  }, [pathname, items, bottomItems])

  const expandedItems = useMemo(() => {
    const next = new Set<string>(autoExpandedItems)
    userExpandedItems.forEach(href => next.add(href))
    return next
  }, [autoExpandedItems, userExpandedItems])

  const handleToggle = useCallback((href: string) => {
    setUserExpandedItems(prev => {
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
