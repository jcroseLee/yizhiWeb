"use client"

import { cn } from "@/lib/utils/cn"
import { Search, X } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

export function HeaderSearch() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // 监听快捷键 Cmd/Ctrl + K 聚焦搜索框
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // 组件挂载时自动聚焦输入框
  React.useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleSearch = () => {
    if (searchQuery.trim()) {
      if (pathname !== "/cases") {
        router.push(`/cases?q=${encodeURIComponent(searchQuery.trim())}`)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      handleSearch()
    }
    if (e.key === "Escape") {
      setSearchQuery("")
      inputRef.current?.blur()
    }
  }

  const handleClear = () => {
    setSearchQuery("")
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* 搜索框 - 始终显示 */}
      <div className="flex items-center w-[280px] sm:w-80 lg:w-96">
        <div
          className={cn(
            "relative flex items-center w-full",
            "bg-white border border-stone-200/50 rounded-full"
          )}
        >
          {/* 搜索图标 */}
          <Search
            className={cn(
              "absolute left-3.5 h-4 w-4 z-10",
              "text-[#C82E31] transition-colors duration-200"
            )}
          />

          <input
            ref={inputRef}
            type="text"
            placeholder="搜索案例、卦象、关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "h-10 w-full rounded-full",
              "bg-transparent border-0",
              "pl-10 pr-10 text-sm text-stone-800 placeholder:text-stone-400/80",
              "focus:outline-none",
              "font-serif-sc"
            )}
          />

          {/* 清空按钮 - 仅在输入内容时显示 */}
          {searchQuery && (
            <button
              onClick={handleClear}
              className={cn(
                "absolute right-2 h-6 w-6 rounded-full flex items-center justify-center",
                "text-stone-400 hover:text-stone-600 hover:bg-stone-100",
                "transition-all duration-200 ease-out"
              )}
              aria-label="清空搜索"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

