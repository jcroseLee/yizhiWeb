'use client'

import { Button } from '@/lib/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/lib/components/ui/sheet'
import { WikiCategory } from '@/lib/services/wiki'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { WikiSidebar } from './WikiSidebar'

interface MobileWikiMenuProps {
  initialCategories: WikiCategory[]
}

export function MobileWikiMenu({ initialCategories }: MobileWikiMenuProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close sheet when pathname changes (navigation occurred)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setOpen(false)
    }, 0)
    return () => clearTimeout(timeout)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden h-8 w-8 p-0 text-stone-500 hover:text-stone-900 hover:bg-stone-200/50"
        >
          <Menu className="w-4 h-4" />
          <span className="sr-only">打开目录</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        overlayClassName="bg-black/20 backdrop-blur-sm z-[45] top-[9rem] bottom-0 h-[calc(100vh-9rem)] max-md:h-[calc(100dvh-9rem)] data-[state=open]:animate-none data-[state=closed]:animate-none transition-opacity duration-300 data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
        hideClose
        className="w-72 p-0 bg-[#F9F7F2] shadow-2xl border-r border-stone-200/50 z-[46] inset-y-auto top-[9rem] bottom-0 h-[calc(100vh-9rem)] max-md:h-[calc(100dvh-9rem)] data-[state=open]:animate-none data-[state=closed]:animate-none transition-transform duration-300 ease-in-out will-change-transform data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>目录</SheetTitle>
        </SheetHeader>
        <div className="h-full">
          <WikiSidebar 
            className="w-full border-0" 
            initialCategories={initialCategories} 
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
