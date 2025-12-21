"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils/cn"

export function HeaderSearch() {
  const [isFocused, setIsFocused] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // 监听快捷键 Cmd/Ctrl + K 唤起搜索
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSearch = () => {
    if (searchQuery.trim()) {
      if (pathname !== "/cases") {
        router.push(`/cases?q=${encodeURIComponent(searchQuery.trim())}`)
      }
      // 可以在这里触发搜索逻辑
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      handleSearch()
    }
  }

  return (
    <div
      className={cn(
        "relative flex items-center transition-all duration-300 ease-out",
        // 宽度变化：默认 240px，聚焦时变宽到 320px (根据实际布局可调整)
        isFocused ? "w-80 md:w-96" : "w-60 md:w-72"
      )}
    >
      {/* 搜索图标 - 聚焦时颜色变深 */}
      <Search
        className={cn(
          "absolute left-3 h-4 w-4 transition-colors duration-200 z-10",
          isFocused ? "text-ink-800" : "text-ink-400"
        )}
      />

      <input
        ref={inputRef}
        type="text"
        placeholder="搜索案例、关键词、卦象..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-10 w-full rounded-full border bg-ink-50 pl-10 pr-12 text-sm transition-all duration-300",
          "placeholder:text-ink-400 focus:outline-none",
          // 默认状态：边框透明，背景浅灰
          "border-transparent",
          // 聚焦状态：背景变白，边框变朱砂色，添加柔和阴影
          "focus:bg-white focus:border-cinnabar-200 focus:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] focus:ring-2 focus:ring-cinnabar-50"
        )}
      />

      {/* 快捷键提示 - 聚焦时隐藏 */}
      <div
        className={cn(
          "absolute right-3 flex items-center gap-1 transition-opacity duration-200 pointer-events-none",
          isFocused ? "opacity-0" : "opacity-100"
        )}
      >
        <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-ink-200 bg-white px-1.5 font-mono text-[10px] font-medium text-ink-400 shadow-sm opacity-60">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>
    </div>
  )
}

