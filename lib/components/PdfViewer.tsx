'use client'

import { Button } from '@/lib/components/ui/button'
import { useMemo } from 'react'

export function PdfViewer({ url, title }: { url: string; title?: string | null }) {
  const proxySrc = useMemo(() => `/api/library/pdf/proxy?url=${encodeURIComponent(url)}`, [url])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="min-w-0">
          <div className="text-sm font-bold font-serif text-stone-800 truncate">{title || 'PDF 预览'}</div>
          <div className="text-[10px] text-stone-400 truncate">{url}</div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => window.open(proxySrc, '_blank', 'noopener,noreferrer')}>
            打开
          </Button>
          <Button className="h-8 px-3 text-xs bg-[#C82E31] hover:bg-[#a61b1f]" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
            原链接
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 border border-stone-200 rounded-lg overflow-hidden bg-white">
        <iframe title={title || 'PDF'} src={proxySrc} className="w-full h-full" />
      </div>
    </div>
  )
}

