'use client'

import { cn } from '@/lib/utils/cn'
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  children?: NavItem[]
}

interface SidebarNavigationProps {
  items: NavItem[]
  bottomItems?: NavItem[]
}

// 提取判断是否激活的逻辑
const checkIsActive = (href: string, item: NavItem): boolean => {
  // 精确匹配
  if (href === item.href) return true
  // 路径以该导航项开头（用于详情页，如 /cases/1 匹配 /cases）
  if (href.startsWith(item.href + '/')) return true
  if (item.children) {
    return item.children.some(child => checkIsActive(href, child))
  }
  return false
}

// --- 子组件：独立渲染每一项 ---
const SidebarItem = ({ 
  item, 
  level = 0, 
  pathname, 
  expandedItems, 
  onToggle 
}: { 
  item: NavItem
  level?: number
  pathname: string
  expandedItems: Set<string>
  onToggle: (href: string) => void
}) => {
  const Icon = item.icon
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedItems.has(item.href)
  
  // 判断当前项是否激活（如果是父级，只要有子级激活也算激活，但样式处理不同）
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const isChildActive = checkIsActive(pathname, item)
  
  // 样式逻辑：
  // 1. 如果是子菜单项(level > 0) 且 激活 -> 朱红色
  // 2. 如果是父级菜单 且 自身完全匹配路径 -> 朱红色
  // 3. 其他情况 -> 默认墨色
  const isRedText = (level > 0 && isActive) || (!hasChildren && isActive)
  
  // 计算缩进，基础 1rem (px-4), 每级增加 0.75rem (pl-3)
  // 或者直接使用动态 style paddingLeft，这里推荐使用 Tailwind 类名组合
  
  return (
    <div className="w-full">
      <Link
        href={item.href}
        onClick={(e) => {
          if (hasChildren) {
            e.preventDefault()
            onToggle(item.href)
          }
        }}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200",
          "hover:bg-ink-50",
          // 激活状态的文字颜色处理
          isRedText 
            ? "text-[#9D2933] bg-ink-50" 
            : "text-ink-600 hover:text-ink-800",
          // 如果是父级且子项被激活，保持高亮或加深背景（可选）
          hasChildren && isChildActive && !isExpanded && "bg-ink-50/50"
        )}
        style={{ paddingLeft: `${1 + level * 1.2}rem` }} // 使用 padding 控制缩进更平滑
      >
        {/* 只有第一级显示图标 */}
        {level === 0 && (
          <Icon className={cn(
            "h-5 w-5 shrink-0 transition-colors text-ink-800",
          )} />
        )}

        <span className="flex-1 truncate">{item.label}</span>

        {hasChildren && (
          <div className="ml-auto shrink-0 pl-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-ink-400 transition-transform duration-200" />
            ) : (
              <ChevronRight className="h-4 w-4 text-ink-400 transition-transform duration-200" /> // 推荐收起时用 Right
            )}
          </div>
        )}
      </Link>

      {/* 递归渲染子项 */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1 animate-in slide-in-from-top-2 fade-in-20 duration-200">
          {item.children!.map((child) => (
            <SidebarItem
              key={child.href}
              item={child}
              level={level + 1}
              pathname={pathname}
              expandedItems={expandedItems}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// --- 主组件 ---
export default function SidebarNavigation({ items, bottomItems = [] }: SidebarNavigationProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // 优化：监听 pathname 变化，自动展开包含当前页面的父级菜单
  useEffect(() => {
    const newExpanded = new Set<string>(expandedItems)
    let hasChange = false

    const findAndExpand = (navItems: NavItem[]) => {
      navItems.forEach(item => {
        if (item.children) {
          // 如果子项中有激活的，或者当前项就是激活的，确保当前项在展开列表中
          const shouldExpand = item.children.some(child => checkIsActive(pathname, child))
          if (shouldExpand) {
             if (!newExpanded.has(item.href)) {
               newExpanded.add(item.href)
               hasChange = true
             }
          }
          findAndExpand(item.children)
        }
      })
    }

    findAndExpand(items)
    
    // 处理底部独立模块的自动展开
    findAndExpand(bottomItems)
    
    // 只有状态真正改变时才更新，避免死循环
    if (hasChange) {
      setExpandedItems(newExpanded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, items, bottomItems]) 

  const handleToggle = useCallback((href: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(href)) {
        next.delete(href)
      } else {
        next.add(href)
      }
      return next
    })
  }, [])

  return (
    <nav className="h-full w-full">
      {/* 主导航区域 */}
      <div className="space-y-1 p-4">
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
      
      {/* 分隔线 */}
      {bottomItems.length > 0 && (
        <>
          <div className="my-2 border-t border-ink-200" />
        
          {/* 独立模块：底部导航项 */}
          <div className="p-4 space-y-1">
            {bottomItems.map((item) => {
              const Icon = item.icon
              const hasChildren = item.children && item.children.length > 0
              const isExpanded = expandedItems.has(item.href)
              const isActive = checkIsActive(pathname, item)
              const isRedText = !hasChildren && isActive

              return (
                <div key={item.href} className="w-full">
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      if (hasChildren) {
                        e.preventDefault()
                        handleToggle(item.href)
                      }
                    }}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200",
                      "hover:bg-ink-50",
                      isRedText
                        ? "text-[#9D2933] bg-ink-50"
                        : "text-ink-600 hover:text-ink-800"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0 transition-colors text-ink-800" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {hasChildren && (
                      <div className="ml-auto shrink-0 pl-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-ink-400 transition-transform duration-200" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-ink-400 transition-transform duration-200" />
                        )}
                      </div>
                    )}
                  </Link>
                  
                  {/* 子项 */}
                  {hasChildren && isExpanded && (
                    <div className="mt-1 space-y-1 animate-in slide-in-from-top-2 fade-in-20 duration-200">
                      {item.children!.map((child) => {
                        // 检查子项是否激活：精确匹配或路径以子项href开头
                        const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/')
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "group flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200",
                              "hover:bg-ink-50",
                              isChildActive
                                ? "text-[#9D2933] bg-ink-50"
                                : "text-ink-600 hover:text-ink-800"
                            )}
                            style={{ paddingLeft: '2.2rem' }}
                          >
                            <div className="h-5 w-5" />
                            <span className="flex-1 truncate">{child.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
      </div>
        </>
      )}
    </nav>
  )
}