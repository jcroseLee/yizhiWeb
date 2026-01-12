'use client'

import { IconCases, IconCommunity, IconHome, IconLibrary } from '@/lib/components/CustomIcons'
import SidebarNavigation, { NavItem } from '@/lib/components/SidebarNavigation'
import { Bot, Compass, Settings } from 'lucide-react'

const navItems: NavItem[] = [
  { href: '/', label: '首页', icon: IconHome },
  { href: '/community', label: '社区', icon: IconCommunity },
  { href: '/cases', label: '案例库', icon: IconCases },
  { href: '/library', label: '藏经阁', icon: IconLibrary },
]

const bottomItems: NavItem[] = [
  { 
    href: '/tools/6yao', 
    label: '排盘工具', 
    icon: Compass,
    children: [
      { href: '/tools/6yao', label: '六爻排盘', icon: Settings },
    ]
  },
  {
    href: '/chat',
    label: '易知小童',
    icon: Bot,
  },
]

export default function AppSidebar() {
  return <SidebarNavigation items={navItems} bottomItems={bottomItems} />
}

