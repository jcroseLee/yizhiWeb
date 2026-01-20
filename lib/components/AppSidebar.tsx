'use client'

import { IconCases, IconCommunity, IconHome, IconLibrary } from '@/lib/components/CustomIcons'
import SidebarNavigation, { NavItem } from '@/lib/components/SidebarNavigation'

const navItems: NavItem[] = [
  { href: '/', label: '首页', icon: IconHome },
  { href: '/community', label: '社区', icon: IconCommunity },
  { href: '/cases', label: '案例库', icon: IconCases },
  { href: '/library', label: '藏经阁', icon: IconLibrary },
]

export default function AppSidebar({ collapsed }: { collapsed?: boolean }) {
  return <SidebarNavigation items={navItems} collapsed={collapsed} />
}
