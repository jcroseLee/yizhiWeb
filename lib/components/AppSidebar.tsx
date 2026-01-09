'use client'

import SidebarNavigation, { NavItem } from '@/lib/components/SidebarNavigation'
import { BookOpen, Bot, Compass, Home as HomeIcon, Library, Settings, Users } from 'lucide-react'

const navItems: NavItem[] = [
  { href: '/', label: '首页', icon: HomeIcon },
  { href: '/community', label: '社区', icon: Users },
  { href: '/cases', label: '案例库', icon: Library },
  { href: '/library', label: '藏经阁', icon: BookOpen },
]

const bottomItems: NavItem[] = [
  { 
    href: '/6yao', 
    label: '排盘工具', 
    icon: Compass,
    children: [
      { href: '/6yao', label: '六爻排盘', icon: Settings },
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

