'use client'

import { Button } from '@/lib/components/ui/button'
import { PdfViewer } from '@/lib/components/PdfViewer'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type LibraryBookRow = {
  id: string
  title: string
  pdf_url: string | null
  source_url: string | null
  source_payload: any | null
}

export default function BookPdfPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = (params.bookId as string | undefined) || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [book, setBook] = useState<LibraryBookRow | null>(null)

  const pdfUrl = useMemo(() => {
    const direct = book?.pdf_url ? String(book.pdf_url).trim() : ''
    if (direct) return direct
    const dl = book?.source_payload && typeof book.source_payload?.download_url === 'string' ? String(book.source_payload.download_url).trim() : ''
    if (dl && /\.pdf(\?|#|$)/i.test(dl)) return dl
    const src = book?.source_url ? String(book.source_url).trim() : ''
    if (src && /\.pdf(\?|#|$)/i.test(src)) return src
    return null
  }, [book])

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      if (!supabase) {
        setError('Supabase 未配置')
        setLoading(false)
        return
      }

      const id = decodeURIComponent(bookId || '').trim()
      if (!id) {
        setError('缺少书籍参数')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const { data, error: dbError } = await supabase
          .from('library_books')
          .select('id, title, pdf_url, source_url, source_payload')
          .eq('id', id)
          .maybeSingle()

        if (dbError) throw dbError
        if (!data) {
          setError('未找到书籍')
          setBook(null)
          setLoading(false)
          return
        }
        setBook(data as any)
      } catch (e: any) {
        setError(String(e?.message || '加载失败'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [bookId])

  if (loading) {
    return (
      <div className="h-screen bg-[#fdfbf7] flex items-center justify-center">
        <div className="flex items-center gap-2 text-stone-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">加载中...</span>
        </div>
      </div>
    )
  }

  if (error || !book || !pdfUrl) {
    return (
      <div className="h-screen bg-[#fdfbf7] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-lg p-6">
          <div className="text-base font-bold font-serif text-stone-800">无法预览</div>
          <div className="text-sm text-stone-500 mt-2">{error || '该书籍未绑定 PDF'}</div>
          <div className="mt-5 flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              返回
            </Button>
            {book?.pdf_url ? (
              <Button className="bg-[#C82E31] hover:bg-[#a61b1f]" onClick={() => window.open(book.pdf_url as any, '_blank', 'noopener,noreferrer')}>
                打开原链接
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#fdfbf7] flex flex-col min-h-0">
      <header className="flex-none h-14 border-b border-stone-200/60 bg-[#fdfbf7]/90 backdrop-blur-md px-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="hover:bg-stone-100 text-stone-600" onClick={() => router.back()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-sm font-bold font-serif text-stone-800 truncate">{book.title}</div>
      </header>
      <main className="flex-1 min-h-0 p-4">
        <PdfViewer url={pdfUrl} title={book.title} />
      </main>
    </div>
  )
}

