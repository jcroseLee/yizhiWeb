'use client'

import { Menu, X } from 'lucide-react'
import { ReactNode, useState } from 'react'
import Sidebar from './Sidebar'

interface ThreeColumnLayoutProps {
  leftSidebar?: ReactNode
  mainContent: ReactNode
  rightSidebar?: ReactNode
  leftSidebarTitle?: string
  rightSidebarTitle?: string
  mobileTitle?: string
}

export default function ThreeColumnLayout({
  leftSidebar,
  mainContent,
  rightSidebar,
  leftSidebarTitle = '菜单',
  rightSidebarTitle = '设置',
  mobileTitle
}: ThreeColumnLayoutProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)

  // 如果没有提供左侧边栏，使用默认的 Sidebar
  const defaultLeftSidebar = leftSidebar || <Sidebar selectedMethod={0} onMethodChange={() => {}} />

  return (
    <div className="h-[calc(100vh-4rem)] max-md:h-[calc(100dvh-4rem)] flex relative overflow-hidden">
      {/* 移动端左侧边栏遮罩 */}
      {leftSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setLeftSidebarOpen(false)}
        />
      )}

      {/* 左侧边栏 - 全屏显示 */}
      <aside
        className={`w-64 border-r border-ink-200 flex-shrink-0 overflow-y-auto fixed lg:static inset-y-0 left-0 z-50 lg:z-auto transform transition-transform duration-300 ${
          leftSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="lg:hidden p-4 border-b border-ink-200 flex items-center justify-between">
          <h2 className="font-serif font-semibold text-ink-800">{leftSidebarTitle}</h2>
          <button
            onClick={() => setLeftSidebarOpen(false)}
            className="p-2 hover:bg-ink-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {defaultLeftSidebar}
      </aside>

      {/* 中间主内容区 - 全屏显示 */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
        {/* 移动端顶部工具栏 */}
        {mobileTitle && (
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-ink-200 bg-white sticky top-0 z-30">
            <button
              onClick={() => setLeftSidebarOpen(true)}
              className="p-2 hover:bg-ink-50 rounded"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-serif font-semibold text-ink-800">{mobileTitle}</h1>
            {rightSidebar && (
              <button
                onClick={() => setRightSidebarOpen(true)}
                className="p-2 hover:bg-ink-50 rounded"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {mainContent}
      </main>

      {/* 移动端右侧边栏遮罩 */}
      {rightSidebar && rightSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setRightSidebarOpen(false)}
        />
      )}

      {/* 右侧边栏 - 全屏显示 */}
      {rightSidebar && (
        <aside
          className={`w-80 bg-white border-l border-ink-200 flex-shrink-0 overflow-y-auto fixed lg:static inset-y-0 right-0 z-50 lg:z-auto transform transition-transform duration-300 ${
            rightSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="lg:hidden p-4 border-b border-ink-200 flex items-center justify-between">
            <h2 className="font-serif font-semibold text-ink-800">{rightSidebarTitle}</h2>
            <button
              onClick={() => setRightSidebarOpen(false)}
              className="p-2 hover:bg-ink-100 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {rightSidebar}
        </aside>
      )}
    </div>
  )
}

